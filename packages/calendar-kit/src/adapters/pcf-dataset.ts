import type { CalendarEvent, VisibleRange, ZoneOffset } from '../core/types';
import { toWall } from '../core/datetime';
import { DateTimeBehavior, behaviorOf } from '../dataverse/dates';
import { mapRecordToEvent, type ColumnMap, type MapOptions } from '../dataverse/mapping';

/**
 * `@dataverse-kit/calendar-kit/adapters/pcf-dataset` — a PCF dataset onto the calendar.
 *
 * A dataset is PUSHED by the host (every `updateView`), so this is a set of pure mappers rather
 * than a `CalendarDataSource`: the control calls `readDatasetEvents` in `updateView` and renders.
 *
 * ★ Structural types, not `@types/powerapps-component-framework`: the kit must not make every
 *   consumer install PCF typings, and those typings are WRONG about the one thing that matters
 *   here — they declare `getValue()` returns `Date` for a date column. It returns an ISO string.
 */
export interface PcfColumnLike {
  name: string;
  alias?: string;
  dataType?: string;
}

export interface PcfRecordLike {
  getValue(column: string): unknown;
  getFormattedValue(column: string): string | null;
}

export interface PcfDatasetLike {
  columns: readonly PcfColumnLike[];
  sortedRecordIds: readonly string[];
  records: Readonly<Record<string, PcfRecordLike | undefined>>;
  loading?: boolean;
}

/**
 * The manifest property-set names this adapter looks for, by column role.
 * ★ A property-set's column is found by its ALIAS (the property-set name), MEASURED: the
 *   dataset's `columns` carries `alias: "startColumn"` for the column bound to that set.
 * ★ Property-set columns are added to the dataset EVEN IF THE VIEW DOES NOT LAY THEM OUT
 *   (measured) — unlike an unbound column, which must be in the view's layoutxml to be readable.
 */
export const DEFAULT_PROPERTY_SETS: Readonly<Record<keyof ColumnMap, string>> = {
  start: 'startColumn',
  end: 'endColumn',
  title: 'titleColumn',
  color: 'colorColumn',
  group: 'groupColumn',
  allDay: 'allDayColumn',
};

export interface ResolvedColumns {
  map: ColumnMap;
  /** PCF `dataType` per mapped column, e.g. `DateAndTime.DateOnly`. */
  dataTypes: Record<string, string | undefined>;
}

/** The column map from property-set aliases, or null when the start column is not bound. */
export function resolveColumnMap(
  dataset: Pick<PcfDatasetLike, 'columns'>,
  propertySets: Readonly<Record<keyof ColumnMap, string>> = DEFAULT_PROPERTY_SETS
): ResolvedColumns | null {
  const map: Partial<ColumnMap> = {};
  const dataTypes: Record<string, string | undefined> = {};
  for (const role of Object.keys(propertySets) as (keyof ColumnMap)[]) {
    const col = dataset.columns.find((c) => c.alias === propertySets[role]);
    if (col) {
      map[role] = col.name;
      dataTypes[col.name] = col.dataType;
    }
  }
  return map.start ? { map: map as ColumnMap, dataTypes } : null;
}

export interface ResolvedBehaviors {
  behaviors: Record<string, DateTimeBehavior>;
  /**
   * Date-time columns whose behaviour had to be GUESSED as UserLocal because no metadata was
   * given. A TimeZoneIndependent column in this list will show shifted times. Surface it.
   */
  unresolved: string[];
}

/**
 * Behaviour of each mapped date column. `metadata(column)` returns whatever the host's
 * `utils.getEntityMetadata(...).Attributes.get(column)` returned (needs `<uses-feature
 * name="Utility">`); pass nothing when it is unavailable and read `unresolved`.
 */
export function resolveBehaviors(
  resolved: ResolvedColumns,
  metadata?: (column: string) => unknown
): ResolvedBehaviors {
  const behaviors: Record<string, DateTimeBehavior> = {};
  const unresolved: string[] = [];
  for (const col of [resolved.map.start, resolved.map.end].filter((c): c is string => !!c)) {
    const dataType = resolved.dataTypes[col];
    const meta = metadata?.(col);
    behaviors[col] = behaviorOf(meta, dataType);
    if (meta === undefined && dataType !== 'DateAndTime.DateOnly') unresolved.push(col);
  }
  return { behaviors, unresolved };
}

/**
 * Every record with a usable start → an event, in the dataset's sort order.
 *
 * ★ A record whose date text cannot be read (a behaviour guessed wrong, an unexpected shape) is
 *   SKIPPED and reported through `onInvalid`, never thrown: this runs inside PCF `updateView`,
 *   where one throw takes the whole calendar down for every other record.
 */
export function readDatasetEvents(
  dataset: PcfDatasetLike,
  map: ColumnMap,
  opts: MapOptions & { onInvalid?: (recordId: string, error: unknown) => void }
): CalendarEvent[] {
  if (dataset.loading) return [];
  const events: CalendarEvent[] = [];
  for (const id of dataset.sortedRecordIds) {
    const r = dataset.records[id];
    if (!r) continue;
    try {
      const e = mapRecordToEvent(
        { id, value: (c) => r.getValue(c), formatted: (c) => r.getFormattedValue(c) ?? '' },
        map,
        opts
      );
      if (e) events.push(e);
    } catch (error) {
      opts.onInvalid?.(id, error);
    }
  }
  return events;
}

/** PCF `ConditionOperator` / `FilterOperator` values used here (SDK numbering). */
const OP = { GreaterEqual: 4, LessThan: 3 } as const;
const AND = 0;
const OR = 1;

export interface PcfConditionLike {
  attributeName: string;
  conditionOperator: number;
  value: string;
}
export interface PcfFilterLike {
  filterOperator: 0 | 1;
  conditions: PcfConditionLike[];
  filters?: PcfFilterLike[];
}

function boundary(range: VisibleRange, edge: 'start' | 'end', behavior: DateTimeBehavior, zone: ZoneOffset): string {
  if (behavior === DateTimeBehavior.DateOnly) return edge === 'start' ? range.startDate : range.endDate;
  // ★ UNMEASURED for TZI: the face-value wall clock, sent without `Z`.
  if (behavior === DateTimeBehavior.TimeZoneIndependent) return toWall(range[edge], zone);
  return range[edge];
}

/**
 * The dataset filter for "events overlapping the visible range":
 *
 *     start < rangeEnd  AND  ( end >= rangeStart  OR  start >= rangeStart )
 *
 * ★ Not just `start` inside the range — that drops a multi-day event that began before the
 *   first visible day, which is exactly the one a person is looking for. The `start >= …`
 *   branch keeps events with no end.
 * ★ MEASURED: `dataset.filtering.setFilter` + `refresh()` is ANDed with the view's own filter,
 *   and survives a maker's view switch. Measured with UserLocal bounds only; the DateOnly and
 *   TZI bound shapes are unmeasured.
 */
export function buildRangeFilter(
  range: VisibleRange,
  map: ColumnMap,
  behaviors: Readonly<Record<string, DateTimeBehavior>>,
  zone: ZoneOffset
): PcfFilterLike {
  const sb = behaviors[map.start] ?? DateTimeBehavior.UserLocal;
  const startsBeforeEnd: PcfConditionLike = {
    attributeName: map.start,
    conditionOperator: OP.LessThan,
    value: boundary(range, 'end', sb, zone),
  };
  const startsInRange: PcfConditionLike = {
    attributeName: map.start,
    conditionOperator: OP.GreaterEqual,
    value: boundary(range, 'start', sb, zone),
  };
  if (!map.end) return { filterOperator: AND, conditions: [startsBeforeEnd, startsInRange] };
  const eb = behaviors[map.end] ?? DateTimeBehavior.UserLocal;
  return {
    filterOperator: AND,
    conditions: [startsBeforeEnd],
    filters: [
      {
        filterOperator: OR,
        conditions: [
          { attributeName: map.end, conditionOperator: OP.GreaterEqual, value: boundary(range, 'start', eb, zone) },
          startsInRange,
        ],
      },
    ],
  };
}

/**
 * Whether a failed write means the record is gone (deleted elsewhere), in which case the
 * control should refresh rather than leave a ghost on the calendar. MEASURED message:
 * "The requested record was not found."
 */
export function isNotFoundError(error: unknown): boolean {
  const e = error as { message?: unknown; errorCode?: unknown; code?: unknown } | null;
  const msg = typeof e?.message === 'string' ? e.message : String(error ?? '');
  return /was not found|does not exist|0x80040217/i.test(msg) || e?.errorCode === -2147220969 || e?.code === 404;
}
