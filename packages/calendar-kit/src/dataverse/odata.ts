import { toWall } from '../core/datetime';
import type { VisibleRange, ZoneOffset } from '../core/types';
import { DateTimeBehavior } from './dates';
import type { ColumnMap, RecordAccessor } from './mapping';

/**
 * OData helpers for sources that are QUERIED rather than pushed — a code app's generated service
 * and Power Pages `/_api` both pass an OData `$filter` / `$select` through to Dataverse.
 *
 * ★ Column names here are Web API PROPERTY names: a lookup is `_parentcustomerid_value`, not
 *   `parentcustomerid`. `$select` on a lookup by its logical name is silently dropped by the
 *   Web API (measured on a sibling gallery control), so the caller names the property.
 */

const FORMATTED = '@OData.Community.Display.V1.FormattedValue';

/** A bound value as an OData literal, for a column of `behavior`. */
function literal(range: VisibleRange, edge: 'start' | 'end', behavior: DateTimeBehavior, zone: ZoneOffset): string {
  // ★ MEASURED on an org (2026-09-29, 17 edge rows, Web API): the bare DAY is required. An instant
  //   literal filters a DateOnly column by its UTC date, so a week east of UTC (Tokyo: 00:00 JST is
  //   the previous day at 15:00Z) included the day before and dropped the last day.
  if (behavior === DateTimeBehavior.DateOnly) return edge === 'start' ? range.startDate : range.endDate;
  // ★ MEASURED: a TZI column compares by FACE value against the wall clock + `Z` — the same shape
  //   as a TZI write. Sent as an instant instead, a Pacific week was off by 7 hours: three rows in
  //   the week dropped, two after it included.
  if (behavior === DateTimeBehavior.TimeZoneIndependent) return `${toWall(range[edge], zone)}Z`;
  return range[edge];
}

/**
 * The `$filter` for "events overlapping the visible range" — the same overlap rule the PCF
 * adapter uses: `start < rangeEnd AND (end >= rangeStart OR start >= rangeStart)`, so a
 * multi-day event that began before the first visible day is kept.
 */
export function buildODataRangeFilter(
  range: VisibleRange,
  map: ColumnMap,
  behaviors: Readonly<Record<string, DateTimeBehavior>>,
  zone: ZoneOffset
): string {
  const sb = behaviors[map.start] ?? DateTimeBehavior.UserLocal;
  const startsBeforeEnd = `${map.start} lt ${literal(range, 'end', sb, zone)}`;
  const startsInRange = `${map.start} ge ${literal(range, 'start', sb, zone)}`;
  if (!map.end) return `${startsBeforeEnd} and ${startsInRange}`;
  const eb = behaviors[map.end] ?? DateTimeBehavior.UserLocal;
  return `${startsBeforeEnd} and (${map.end} ge ${literal(range, 'start', eb, zone)} or ${startsInRange})`;
}

/** AND a caller's own filter (e.g. "only open slots") with the range filter. */
export function andFilters(...parts: (string | undefined)[]): string {
  const present = parts.filter((p): p is string => !!p && p.trim() !== '');
  return present.length <= 1 ? present[0] ?? '' : present.map((p) => `(${p})`).join(' and ');
}

/** Every Web API property the map needs, plus the id, de-duplicated. */
export function selectFor(map: ColumnMap, idColumn: string): string[] {
  return [...new Set([idColumn, ...Object.values(map).filter((c): c is string => !!c)])];
}

/**
 * A Web API row (Dataverse, a code app's connector, or Power Pages `/_api`) as the accessor the
 * mapping reads.
 *
 * ★ Formatted values come from the `@OData.Community.Display.V1.FormattedValue` annotation, which
 *   the request must ask for (`Prefer: odata.include-annotations=…`). Without it a choice or a
 *   lookup reads as its raw value / GUID — never silently as empty.
 */
export function webApiRowAccessor(row: Readonly<Record<string, unknown>>, id: string): RecordAccessor {
  return {
    id,
    value: (c) => row[c] ?? null,
    formatted: (c) => {
      const f = row[`${c}${FORMATTED}`];
      if (typeof f === 'string') return f;
      const raw = row[c];
      return raw === null || raw === undefined ? '' : String(raw);
    },
  };
}

/** The request header that makes the Web API return formatted values. */
export const FORMATTED_VALUES_PREFER = 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"';
