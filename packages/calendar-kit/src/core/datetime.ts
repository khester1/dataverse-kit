import type { CalendarValue, ValueKind, ZoneOffset } from './types';

/**
 * Value-kind detection and zone conversion.
 *
 * ★★ Nothing in this file may read the PROCESS time zone. Every `Date` is built and read through
 *    its UTC fields, so the same input gives the same output on a laptop in Auckland and a CI
 *    runner in UTC. `npm test` runs the suite under three TZ values to prove it — a single-zone
 *    run cannot see a leak, because the developer's zone is the one the code was written in.
 */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const FLOATING_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?$/;
const INSTANT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2})$/i;

const pad = (n: number, w = 2): string => String(n).padStart(w, '0');

/** The browser's own zone, east-positive. The default when a host supplies none. */
export const browserZone: ZoneOffset = (instant) => -instant.getTimezoneOffset();

/** A fixed zone (no daylight saving). Mostly for tests and demos. */
export const fixedZone =
  (minutesEast: number): ZoneOffset =>
  () =>
    minutesEast;

export function kindOf(value: CalendarValue | Date): ValueKind {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new RangeError('Invalid Date');
    return 'instant';
  }
  const local = DATE_RE.test(value) ? 'date' : FLOATING_RE.test(value) ? 'floating' : null;
  if (local) {
    // ★ The regex accepts `2026-02-31`; Date.UTC would silently roll it to March 3rd. Reject
    //   any date whose fields do not survive a round trip.
    const m = (FLOATING_RE.exec(value) ?? DATE_RE.exec(value))!;
    const [, y, mo, d, h = '0', mi = '0', sec = '0'] = m;
    const t = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +sec));
    if (t.getUTCFullYear() !== +y || t.getUTCMonth() !== +mo - 1 || t.getUTCDate() !== +d || +h > 23 || +mi > 59 || +sec > 59) {
      throw new RangeError(`Not a real calendar date or time: ${JSON.stringify(value)}`);
    }
    return local;
  }
  if (INSTANT_RE.test(value) && !Number.isNaN(new Date(value).getTime())) return 'instant';
  throw new RangeError(`Not an ISO-8601 date, wall-clock time or instant: ${JSON.stringify(value)}`);
}

/** An instant as canonical UTC ISO text (`…T…Z`, milliseconds kept). */
export function toInstant(value: CalendarValue | Date): CalendarValue {
  if (value instanceof Date) return value.toISOString();
  if (kindOf(value) !== 'instant') throw new RangeError(`Not an instant: ${value}`);
  return new Date(value).toISOString();
}

/** `Date.UTC` from wall-clock fields — i.e. the wall clock treated AS IF it were UTC. */
function wallMillis(wall: string): number {
  const m = FLOATING_RE.exec(wall) ?? DATE_RE.exec(wall);
  if (!m) throw new RangeError(`Not a date or wall-clock time: ${wall}`);
  const [, y, mo, d, h = '0', mi = '0', s = '0'] = m;
  return Date.UTC(+y, +mo - 1, +d, +h, +mi, +s);
}

function formatWall(ms: number): string {
  const d = new Date(ms);
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  );
}

/** The wall-clock reading of an instant in `zone`, as floating text (`YYYY-MM-DDTHH:mm:ss`). */
export function toWall(instant: CalendarValue | Date, zone: ZoneOffset): CalendarValue {
  const at = instant instanceof Date ? instant : new Date(toInstant(instant));
  return formatWall(at.getTime() + zone(at) * 60_000);
}

/**
 * The instant at which `zone`'s clocks read `wall`.
 *
 * The offset depends on the instant being solved for, so this takes the offset in force a day
 * BEFORE and a day AFTER the wall reading (no zone changes offset twice in 48 h) and tries both:
 *  - an ordinary time: both give the same instant;
 *  - a wall time that exists TWICE (fall-back): both round-trip, and the EARLIER is returned;
 *  - a wall time that DOES NOT EXIST (spring-forward gap): neither round-trips, and the
 *    pre-transition offset is used, which pushes it forward by the gap (02:30 → 03:30), as JS
 *    `Date` does. What Dataverse does with one is UNMEASURED.
 *
 * ★ A reviewer caught the first version returning the LATER occurrence east of UTC (Berlin) and
 *   the earlier one west of it (Pacific): the two-pass guess settled on whichever offset the
 *   first guess happened to land in. Tests now pin both hemispheres with synthetic zones.
 */
export function fromWall(wall: CalendarValue, zone: ZoneOffset): CalendarValue {
  const w = wallMillis(wall);
  const before = zone(new Date(w - 86_400_000));
  const after = zone(new Date(w + 86_400_000));
  const fits = (offset: number): number | null => {
    const t = w - offset * 60_000;
    return zone(new Date(t)) === offset ? t : null;
  };
  const candidates = [fits(before), fits(after)].filter((t): t is number => t !== null);
  const t = candidates.length > 0 ? Math.min(...candidates) : w - before * 60_000;
  return new Date(t).toISOString();
}

/** The calendar day (`YYYY-MM-DD`) of any value, in `zone` for instants. */
export function toDate(value: CalendarValue | Date, zone: ZoneOffset): CalendarValue {
  const k = kindOf(value);
  if (k === 'date') return value as string;
  if (k === 'floating') return (value as string).slice(0, 10);
  return toWall(value, zone).slice(0, 10);
}

/** Calendar-day arithmetic on a `YYYY-MM-DD` value (no zone involved). */
export function addDays(date: CalendarValue, days: number): CalendarValue {
  if (kindOf(date) !== 'date') throw new RangeError(`addDays needs a date, got ${date}`);
  return formatWall(wallMillis(date) + days * 86_400_000).slice(0, 10);
}

/**
 * The UTC fields of a `Date` as floating text. For reading a `Date` that some library has
 * produced in a "UTC-as-wall-clock" convention (FullCalendar with `timeZone: 'UTC'`).
 */
export function utcFieldsToWall(d: Date): CalendarValue {
  return formatWall(d.getTime());
}

/** Normalise floating text to seconds precision (`…T09:00` → `…T09:00:00`). */
export function normaliseFloating(value: CalendarValue): CalendarValue {
  return formatWall(wallMillis(value));
}
