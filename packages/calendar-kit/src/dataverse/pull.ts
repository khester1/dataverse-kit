import { browserZone } from '../core/datetime';
import type { CalendarDataSource, CalendarEvent, CalendarEventChange, SlotSelection, VisibleRange, ZoneOffset } from '../core/types';
import { DateTimeBehavior } from './dates';
import { mapRecordToEvent, toWebApiPatch, type ColumnMap } from './mapping';
import { andFilters, buildODataRangeFilter, selectFor, webApiRowAccessor } from './odata';

/**
 * A `CalendarDataSource` over any backend that answers an OData query with Web API–shaped rows.
 * The code-app and Power Pages adapters are thin wrappers that supply `query`.
 *
 * ★★ DATE BEHAVIOURS ARE CONFIGURATION HERE, NOT METADATA. Neither host exposes them: a code app's
 *    `getMetadata` returns base `AttributeMetadata` only, and `DateTimeBehavior` lives on the
 *    derived `DateTimeAttributeMetadata` (documented: derived-type properties are unavailable);
 *    Power Pages has no metadata endpoint at all. A date-time column NOT listed is treated as
 *    UserLocal — and reported in `guessed`, because a TimeZoneIndependent column guessed that way
 *    renders shifted.
 */
export interface PullQuery {
  select: string[];
  filter: string;
  orderBy: string;
}

export type Row = Readonly<Record<string, unknown>>;

export interface PullSourceConfig {
  /** Run the query; return every row (paging is the adapter's job). Honour `signal`. */
  query: (q: PullQuery, signal?: AbortSignal) => Promise<readonly Row[]>;
  /** The primary-key property, e.g. `appointmentid` or `dvk_slotid`. */
  idColumn: string;
  /** Web API property names (a lookup is `_x_value`). */
  map: ColumnMap;
  /** Behaviour per date column. Unlisted ⇒ UserLocal (and reported in `guessed`). */
  behaviors?: Readonly<Record<string, DateTimeBehavior>>;
  /** The zone to interpret instants in. Default: the browser's. */
  zone?: ZoneOffset;
  /** An extra OData filter ANDed with the range, e.g. `statecode eq 0`. */
  filter?: string;
  /** Persist a move/resize. Omit ⇒ read-only. */
  update?: (id: string, patch: Record<string, string>) => Promise<void>;
  open?: (event: CalendarEvent) => void;
  create?: (slot: SlotSelection) => Promise<void> | void;
  /** Receives rows whose dates could not be read (skipped, never thrown). */
  onInvalid?: (id: string, error: unknown) => void;
}

export interface PullSource extends CalendarDataSource {
  /** Date columns treated as UserLocal because no behaviour was configured for them. */
  readonly guessed: readonly string[];
}

export function createPullSource(config: PullSourceConfig): PullSource {
  const zone = config.zone ?? browserZone;
  const behaviors = config.behaviors ?? {};
  const dateColumns = [config.map.start, config.map.end].filter((c): c is string => !!c);
  const guessed = dateColumns.filter((c) => behaviors[c] === undefined);
  const select = selectFor(config.map, config.idColumn);

  return {
    guessed,
    capabilities: { update: !!config.update, create: !!config.create, open: !!config.open },

    async load(range: VisibleRange, signal?: AbortSignal): Promise<CalendarEvent[]> {
      const filter = andFilters(config.filter, buildODataRangeFilter(range, config.map, behaviors, zone));
      const rows = await config.query({ select, filter, orderBy: `${config.map.start} asc` }, signal);
      const events: CalendarEvent[] = [];
      for (const row of rows) {
        const id = String(row[config.idColumn] ?? '');
        if (!id) continue;
        try {
          const e = mapRecordToEvent(webApiRowAccessor(row, id), config.map, { behaviors, zone });
          if (e) events.push(e);
        } catch (error) {
          config.onInvalid?.(id, error);
        }
      }
      return events;
    },

    update: config.update
      ? async (change: CalendarEventChange): Promise<void> => {
          await config.update!(change.event.id, toWebApiPatch(change, config.map, { behaviors, zone }));
        }
      : undefined,
    open: config.open,
    create: config.create,
  };
}
