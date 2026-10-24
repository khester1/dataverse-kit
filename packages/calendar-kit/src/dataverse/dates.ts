import { addDays, fromWall, kindOf, normaliseFloating, toDate, toInstant, toWall } from '../core/datetime';
import type { CalendarValue, ZoneOffset } from '../core/types';

/**
 * Dataverse's three DateTime behaviours, and the FOUR different shapes one value takes on its
 * way through a model-driven app. Every rule below was MEASURED on a live org (2026-09-26,
 * `spikes/calendar-view-fc7/FINDINGS.md` in the parent workspace); none is from documentation.
 *
 * ★★★ The two write paths are DIFFERENT CONTRACTS. The same text means different things to
 * `webAPI.updateRecord` and to `navigation.openForm` parameters:
 *
 *   | behaviour  | read (dataset getValue)     | Web API write          | form parameter (quick create) |
 *   |------------|-----------------------------|------------------------|-------------------------------|
 *   | UserLocal  | `…T06:30:00.000Z` instant   | instant `…Z`           | wall clock, NO `Z`            |
 *   | DateOnly   | `…T00:00:00.000Z` UTC-midn. | `YYYY-MM-DD`           | `YYYY-MM-DDT00:00:00`, NO `Z` |
 *   | TZI        | `…T23:30:00.000Z` face+`Z`  | wall clock WITH `Z`    | wall clock, NO `Z`            |
 *
 * Measured failures of the obvious choice, each of which a unit test here pins:
 *  - a DateOnly read through `new Date()` lands on the PREVIOUS day anywhere west of UTC;
 *  - a bare `YYYY-MM-DD` form parameter was stored as the previous day (Pacific user);
 *  - a TZI form parameter WITH `Z` was treated as UTC and shifted −7 h.
 * The first two are why a well-known client control had a "+1 day" hack in its click handler.
 */
export const DateTimeBehavior = {
  UserLocal: 1,
  DateOnly: 2,
  TimeZoneIndependent: 3,
} as const;
export type DateTimeBehavior = (typeof DateTimeBehavior)[keyof typeof DateTimeBehavior];

/**
 * The behaviour of a column, from whatever metadata shape the host produced.
 *
 * ★ `getEntityMetadata` in a PCF host answers `Behavior: 1|2|3` (MEASURED). The Web API's
 *   `EntityDefinitions` answers `DateTimeBehavior: { Value: 'UserLocal' }`. Both are accepted.
 * ★ A DateOnly column is also recognisable from its PCF `dataType` alone
 *   (`DateAndTime.DateOnly`). TZI and UserLocal are NOT — both report `DateAndTime.DateAndTime` —
 *   so without metadata a TZI column is indistinguishable and is treated as UserLocal. Callers
 *   that can see that ambiguity should surface it (see `adapters/pcf-dataset`).
 */
export function behaviorOf(meta: unknown, dataType?: string): DateTimeBehavior {
  const m = (meta ?? {}) as { Behavior?: unknown; DateTimeBehavior?: { Value?: unknown } | string };
  if (m.Behavior === 1 || m.Behavior === 2 || m.Behavior === 3) return m.Behavior;
  const named = typeof m.DateTimeBehavior === 'string' ? m.DateTimeBehavior : m.DateTimeBehavior?.Value;
  if (named === 'DateOnly') return DateTimeBehavior.DateOnly;
  if (named === 'TimeZoneIndependent') return DateTimeBehavior.TimeZoneIndependent;
  if (named === 'UserLocal') return DateTimeBehavior.UserLocal;
  if (dataType === 'DateAndTime.DateOnly') return DateTimeBehavior.DateOnly;
  return DateTimeBehavior.UserLocal;
}

function rawText(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw.toISOString();
  if (typeof raw === 'string') return raw;
  return null;
}

/**
 * A raw column value (dataset `getValue()`, or a Web API property) → a calendar value.
 *
 * ★★★ `getValue()` returns an ISO STRING for all three behaviours, despite
 * `@types/powerapps-component-framework` declaring `Date`. A `Date` is still accepted, because a
 * test double or another host may produce one — and it is read through its UTC fields, which is
 * what the platform's strings encode.
 */
export function readDataverseDate(raw: unknown, behavior: DateTimeBehavior): CalendarValue | null {
  const s = rawText(raw);
  if (s === null) return null;
  switch (behavior) {
    case DateTimeBehavior.DateOnly:
      // `2026-09-29T00:00:00.000Z` (dataset) or `2026-09-29` (Web API): the first ten characters
      // ARE the day. Never through `new Date()`.
      return s.slice(0, 10);
    case DateTimeBehavior.TimeZoneIndependent:
      // Face value with a misleading `Z`: the digits are the wall clock. Strip the offset rather
      // than slicing a fixed width — `…T23:30Z` (no seconds) would keep its `Z` at 19 chars.
      return normaliseFloating(s.replace(/(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/i, ''));
    default:
      return toInstant(s);
  }
}

/**
 * A calendar value → the text `webAPI.updateRecord` / `createRecord` wants for this behaviour.
 * `zone` is needed only to turn a value of a different kind into this one (e.g. an all-day drop
 * onto a UserLocal column); same-kind values pass straight through.
 */
export function toWebApiDate(value: CalendarValue, behavior: DateTimeBehavior, zone: ZoneOffset): string {
  const k = kindOf(value);
  switch (behavior) {
    case DateTimeBehavior.DateOnly:
      return toDate(value, zone);
    case DateTimeBehavior.TimeZoneIndependent:
      // MEASURED: `…T13:00:00Z` stored and read back as a 1 PM face value.
      return `${k === 'instant' ? toWall(value, zone) : k === 'date' ? `${value}T00:00:00` : normaliseFloating(value)}Z`;
    default:
      return k === 'instant' ? toInstant(value) : fromWall(k === 'date' ? `${value}T00:00:00` : value, zone);
  }
}

/**
 * A calendar value → the text a `navigation.openForm` form PARAMETER wants (quick create
 * prefill). Wall clock in the user's zone, never with `Z`.
 *
 * ★ UNMEASURED: whether "wall clock" here means the Dynamics USER's zone or the BROWSER's when
 *   they differ. Measured only with both in Pacific. Pass the user zone; if the org proof shows
 *   the browser's is used, this is the one function to change.
 */
export function toFormParameterDate(value: CalendarValue, behavior: DateTimeBehavior, zone: ZoneOffset): string {
  const k = kindOf(value);
  if (behavior === DateTimeBehavior.DateOnly) return `${toDate(value, zone)}T00:00:00`;
  if (k === 'instant') return toWall(value, zone);
  if (k === 'date') return `${value}T00:00:00`;
  return normaliseFloating(value);
}

/** Dataverse stores an all-day END inclusive; the calendar's is exclusive. */
export const inclusiveEndToExclusive = (lastDay: CalendarValue): CalendarValue => addDays(lastDay, 1);
export const exclusiveEndToInclusive = (dayAfter: CalendarValue): CalendarValue => addDays(dayAfter, -1);
