import type { CalendarEvent, SlotSelection, ZoneOffset } from '../core/types';
import type { DateTimeBehavior } from '../dataverse/dates';
import type { ColumnMap } from '../dataverse/mapping';
import { createPullSource, type PullSource, type Row } from '../dataverse/pull';

/**
 * `@dataverse-kit/calendar-kit/adapters/code-app` — a Power Apps CODE APP's generated Dataverse
 * service (`pa app add data-source --connector dataverse --table <t>`) as a calendar source.
 *
 * ★ Structural: it needs only `getAll(options)` (and `update` to allow drag). The kit does not
 *   import `@microsoft/power-apps` — pass `AppointmentsService` (or any object of that shape).
 * ★ `IGetAllOptions` per MS Learn: `{ select, filter, orderBy, top, maxPageSize, skip, skipToken }`.
 * ★ Code apps do NOT run in the Power Apps MOBILE player (maintainer, PowerAppsCodeApps
 *   discussion #286, 2026-03). Browser and Windows only.
 */
export interface GetAllOptions {
  select?: string[];
  filter?: string;
  orderBy?: string[];
  top?: number;
  maxPageSize?: number;
  skipToken?: string;
}

/** The generated service's result envelope (`IOperationResult`). */
export interface OperationResult<T> {
  data?: T;
  error?: unknown;
  /** Present when the connector returns another page. Name is UNMEASURED — both spellings read. */
  skipToken?: string;
  nextLink?: string;
}

export interface CodeAppServiceLike {
  getAll(options?: GetAllOptions): Promise<OperationResult<readonly Row[]>>;
  update?(id: string, changes: Record<string, unknown>): Promise<OperationResult<unknown> | unknown>;
}

export interface CodeAppSourceConfig {
  service: CodeAppServiceLike;
  idColumn: string;
  map: ColumnMap;
  behaviors?: Readonly<Record<string, DateTimeBehavior>>;
  /** Default: the browser's zone. A code app has no Dynamics user-zone API — pass one if you have it. */
  zone?: ZoneOffset;
  filter?: string;
  /** Upper bound on rows per range (pages are followed until this). Default 1000. */
  maxRows?: number;
  /** Allow drag/resize to save through `service.update`. Default true when `update` exists. */
  editable?: boolean;
  onOpen?: (event: CalendarEvent) => void;
  onCreate?: (slot: SlotSelection) => Promise<void> | void;
  onInvalid?: (id: string, error: unknown) => void;
}

function failure(error: unknown): Error {
  const m = (error as { message?: unknown } | null)?.message;
  return error instanceof Error ? error : new Error(typeof m === 'string' ? m : String(error));
}

export function createCodeAppSource(config: CodeAppSourceConfig): PullSource {
  const maxRows = config.maxRows ?? 1000;
  const canUpdate = (config.editable ?? true) && typeof config.service.update === 'function';

  return createPullSource({
    idColumn: config.idColumn,
    map: config.map,
    behaviors: config.behaviors,
    zone: config.zone,
    filter: config.filter,
    onInvalid: config.onInvalid,
    open: config.onOpen,
    create: config.onCreate,
    async query(q, signal) {
      const rows: Row[] = [];
      let skipToken: string | undefined;
      // ★ Bounded: a connector that keeps returning a token must not loop forever.
      for (let page = 0; page < 50 && rows.length < maxRows; page++) {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        const result = await config.service.getAll({
          select: q.select,
          filter: q.filter,
          orderBy: [q.orderBy],
          maxPageSize: Math.min(500, maxRows - rows.length),
          ...(skipToken ? { skipToken } : {}),
        });
        // ★ The envelope can carry an error INSTEAD of throwing; surfacing it beats rendering an
        //   empty week that reads as "no appointments".
        if (result?.error) throw failure(result.error);
        rows.push(...(result?.data ?? []));
        skipToken = result?.skipToken ?? result?.nextLink;
        if (!skipToken) break;
      }
      return rows.slice(0, maxRows);
    },
    update: canUpdate
      ? async (id, patch) => {
          const r = (await config.service.update!(id, patch)) as OperationResult<unknown> | undefined;
          if (r && typeof r === 'object' && 'error' in r && r.error) throw failure(r.error);
        }
      : undefined,
  });
}
