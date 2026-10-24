import type { CalendarEvent, ZoneOffset } from '../core/types';
import type { DateTimeBehavior } from '../dataverse/dates';
import type { ColumnMap } from '../dataverse/mapping';
import { FORMATTED_VALUES_PREFER } from '../dataverse/odata';
import { createPullSource, type PullSource, type Row } from '../dataverse/pull';

/**
 * `@dataverse-kit/calendar-kit/adapters/portal` — Power Pages `/_api` as a READ-ONLY calendar
 * source, for "choose an open slot" pages.
 *
 * Portal prerequisites (not code — site configuration; see `.claude/rules/msft-power-pages.md`):
 *  - site settings `Webapi/<table>/enabled = true` and `Webapi/<table>/fields` listing EVERY
 *    column in the map (a lookup's `_x_value` read form too) — a missing field is dropped, not errored;
 *  - a table permission granting Read to the visitor's web role (anonymous for a public booking page);
 *  - every call counts against portal capacity, so the range filter matters.
 *
 * ★ GET needs no anti-forgery token (only writes do), so this adapter never fetches one.
 * ★ Picking a slot does NOT write here: `onPick` hands the chosen event to the page, which books it
 *   however the site allows (a form, Server Logic, a flow). Booking is a business rule, not a calendar one.
 */
export interface PortalSourceConfig {
  /** EntitySetName, e.g. `dvk_slots` — the portal Web API uses entity SETS. */
  entitySet: string;
  idColumn: string;
  map: ColumnMap;
  behaviors?: Readonly<Record<string, DateTimeBehavior>>;
  /** Default: the browser's zone — portal visitors see UserLocal values in their own local time. */
  zone?: ZoneOffset;
  /** Extra filter, e.g. `statuscode eq 1` for open slots only. */
  filter?: string;
  /** Default `/_api`. */
  baseUrl?: string;
  /** Default `fetch`. Injected for tests and for sites that wrap requests. */
  fetch?: typeof fetch;
  maxRows?: number;
  /** A slot was chosen. Omit ⇒ clicking does nothing. */
  onPick?: (event: CalendarEvent) => void;
  onInvalid?: (id: string, error: unknown) => void;
}

async function portalError(res: Response): Promise<Error> {
  let detail = '';
  try {
    const body = (await res.json()) as { error?: { message?: string; code?: string } };
    detail = body?.error?.message ?? '';
  } catch {
    /* not JSON */
  }
  // ★ 403 on /_api is almost always configuration, not code — say where to look.
  const hint =
    res.status === 403 || res.status === 401
      ? ' — check the table permission for this web role and the Webapi/<table>/enabled site setting'
      : '';
  return new Error(`Portal Web API ${res.status}${detail ? `: ${detail}` : ''}${hint}`);
}

export function createPortalSource(config: PortalSourceConfig): PullSource {
  const base = (config.baseUrl ?? '/_api').replace(/\/$/, '');
  const doFetch = config.fetch ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  const maxRows = config.maxRows ?? 1000;

  return createPullSource({
    idColumn: config.idColumn,
    map: config.map,
    behaviors: config.behaviors,
    zone: config.zone,
    filter: config.filter,
    onInvalid: config.onInvalid,
    open: config.onPick,
    async query(q, signal) {
      const params = new URLSearchParams({ $select: q.select.join(','), $filter: q.filter, $orderby: q.orderBy });
      let url: string | undefined = `${base}/${config.entitySet}?${params.toString()}`;
      const rows: Row[] = [];
      for (let page = 0; url && page < 50 && rows.length < maxRows; page++) {
        const res = await doFetch(url, {
          method: 'GET',
          credentials: 'same-origin',
          signal,
          headers: {
            Accept: 'application/json',
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0',
            Prefer: `${FORMATTED_VALUES_PREFER},odata.maxpagesize=${Math.min(500, maxRows)}`,
          },
        });
        if (!res.ok) throw await portalError(res);
        const body = (await res.json()) as { value?: Row[]; '@odata.nextLink'?: string };
        rows.push(...(body.value ?? []));
        url = body['@odata.nextLink'];
      }
      return rows.slice(0, maxRows);
    },
  });
}
