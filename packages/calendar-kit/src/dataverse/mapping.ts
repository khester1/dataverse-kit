import { groupColor, parseHex } from '../core/colors';
import { addDays, kindOf, toDate, toInstant, toWall } from '../core/datetime';
import type { CalendarEvent, CalendarEventChange, CalendarValue, SlotSelection, ZoneOffset } from '../core/types';
import {
  DateTimeBehavior,
  exclusiveEndToInclusive,
  inclusiveEndToExclusive,
  readDataverseDate,
  toFormParameterDate,
  toWebApiDate,
} from './dates';

/**
 * Which columns hold what. Logical names. Only `start` is required — that is the whole
 * genericity story: the same calendar shows Appointments for one client and Orders for another,
 * because a maker names the columns rather than a developer.
 */
export interface ColumnMap {
  start: string;
  end?: string;
  title?: string;
  /** A hex colour column, or a choice column whose option colours `colorOf` resolves. */
  color?: string;
  /** Location / staff / queue. Drives `resourceId` and, failing `color`, a group colour. */
  group?: string;
  /** A Yes/No column that forces all-day. */
  allDay?: string;
}

/** The minimum a record source must answer — a dataset record, a Web API row, a fixture. */
export interface RecordAccessor {
  id: string;
  value(column: string): unknown;
  formatted(column: string): string;
}

export interface MapOptions {
  /** Behaviour per DATE column (logical name). Missing ⇒ UserLocal. */
  behaviors: Readonly<Record<string, DateTimeBehavior>>;
  zone: ZoneOffset;
  /** Resolve a colour column's value (e.g. choice option colours). Return undefined to fall back. */
  colorOf?: (column: string, raw: unknown, formatted: string) => string | undefined;
  /** Per-record read-only, e.g. a status that forbids rescheduling. */
  isReadOnly?: (record: RecordAccessor) => boolean;
}

const behaviorFor = (opts: Pick<MapOptions, 'behaviors'>, column: string): DateTimeBehavior =>
  opts.behaviors[column] ?? DateTimeBehavior.UserLocal;

/**
 * ★★ A Yes/No column's raw value in a PCF dataset is the STRING `"0"` / `"1"` — and
 * `Boolean("0")` is `true`. MEASURED on a sibling gallery control, where every `false` row
 * rendered ON. Read the digits, never truthiness.
 */
export function readYesNo(raw: unknown): boolean {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw === 1;
  if (typeof raw === 'string') return raw === '1' || raw.toLowerCase() === 'true';
  return false;
}

/**
 * ★★★ MEASURED (appointment, 2026-09-27): an event FLAGGED all-day on date-time columns stores its
 * calendar date at UTC MIDNIGHT — `2026-10-01T00:00:00Z`→`2026-10-02T00:00:00Z` for "Oct 1",
 * even though the columns are UserLocal and the user is in Pacific. The platform's own formatted
 * value then reads "9/30 5:00 PM"; the form shows Oct 1. Reading it through the user's zone put
 * a one-day appointment on Wed AND Thu. So a flagged all-day value's DAY is its UTC date.
 */
function utcDayOf(value: CalendarValue): CalendarValue {
  return kindOf(value) === 'instant' ? toInstant(value).slice(0, 10) : value.slice(0, 10);
}
function utcExclusiveDayOf(end: CalendarValue): CalendarValue {
  const text = kindOf(end) === 'instant' ? toInstant(end) : end;
  return text.length > 10 && text.slice(11, 19) !== '00:00:00' ? addDays(text.slice(0, 10), 1) : text.slice(0, 10);
}

/** A date-time end → the exclusive day after the event, for an all-day rendering. */
function exclusiveDayOf(end: CalendarValue, zone: ZoneOffset): CalendarValue {
  const day = toDate(end, zone);
  const wall = kindOf(end) === 'instant' ? toWall(end, zone) : end;
  // Ending exactly at midnight already means "up to, not including, this day".
  return wall.length > 10 && wall.slice(11, 19) === '00:00:00' ? day : addDays(day, 1);
}

/** One record → one event, or null when it has no usable start. */
export function mapRecordToEvent(record: RecordAccessor, map: ColumnMap, opts: MapOptions): CalendarEvent | null {
  const startBehavior = behaviorFor(opts, map.start);
  let start = readDataverseDate(record.value(map.start), startBehavior);
  if (start === null) return null;

  const endBehavior = map.end ? behaviorFor(opts, map.end) : startBehavior;
  let end = map.end ? readDataverseDate(record.value(map.end), endBehavior) : null;

  const forcedAllDay = map.allDay ? readYesNo(record.value(map.allDay)) : false;
  const allDay = forcedAllDay || kindOf(start) === 'date';

  if (allDay) {
    const flagged = forcedAllDay && startBehavior !== DateTimeBehavior.DateOnly;
    start = flagged ? utcDayOf(start) : toDate(start, opts.zone);
    if (end !== null) {
      end =
        endBehavior === DateTimeBehavior.DateOnly
          ? inclusiveEndToExclusive(end)
          : flagged
            ? utcExclusiveDayOf(end)
            : exclusiveDayOf(end, opts.zone);
    }
    if (end !== null && end <= start) end = addDays(start, 1);
  } else if (end !== null && kindOf(end) !== kindOf(start)) {
    // A timed start with a date-only end (mixed behaviours): not renderable as one span.
    end = null;
  } else if (end !== null && end <= start) {
    // A zero or negative duration renders as nothing in a time grid. Use the default length.
    end = null;
  }

  const title = (map.title ? record.formatted(map.title) : '') || '(untitled)';
  const groupKey = map.group ? record.formatted(map.group) || undefined : undefined;

  let color: string | undefined;
  if (map.color) {
    const raw = record.value(map.color);
    const formatted = record.formatted(map.color);
    color = opts.colorOf?.(map.color, raw, formatted);
    if (!color && typeof raw === 'string' && parseHex(raw)) color = raw;
  }
  if (!color && groupKey) color = groupColor(groupKey);

  return {
    id: record.id,
    start,
    end: end ?? undefined,
    title,
    color,
    resourceId: groupKey,
    allDay,
    readOnly: opts.isReadOnly?.(record) ?? false,
  };
}

/**
 * A move/resize → the column values to PATCH through the Web API.
 * Columns the map does not name are never written.
 */
export function toWebApiPatch(
  change: CalendarEventChange,
  map: ColumnMap,
  opts: Pick<MapOptions, 'behaviors' | 'zone'>
): Record<string, string> {
  const patch: Record<string, string> = {};
  // ★★★ An all-day change on DATE-TIME columns is written at UTC midnight (the platform's own
  //     convention for flagged all-day events — see utcDayOf), never at the user's midnight.
  const write = (value: CalendarValue, behavior: DateTimeBehavior): string =>
    change.allDay && behavior !== DateTimeBehavior.DateOnly && kindOf(value) === 'date'
      ? `${value}T00:00:00Z`
      : toWebApiDate(value, behavior, opts.zone);
  const sb = behaviorFor(opts, map.start);
  patch[map.start] = write(change.start, sb);
  if (map.end && change.end !== undefined) {
    const eb = behaviorFor(opts, map.end);
    const end = change.allDay && eb === DateTimeBehavior.DateOnly ? exclusiveEndToInclusive(change.end) : change.end;
    patch[map.end] = write(end, eb);
  }
  return patch;
}

/**
 * A selected empty range → quick-create form parameters. `extra` is merged underneath, so a
 * host can prefill a lookup (the parent record) without it being overwritten by dates.
 *
 * ★ The all-day column is set to boolean `true` for an all-day selection. The accepted shape of
 *   a Yes/No FORM PARAMETER is UNMEASURED; the date shapes are measured.
 */
export function toQuickCreateParameters(
  selection: SlotSelection,
  map: ColumnMap,
  opts: Pick<MapOptions, 'behaviors' | 'zone'>,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  const params: Record<string, unknown> = { ...extra };
  const sb = behaviorFor(opts, map.start);
  params[map.start] = toFormParameterDate(selection.start, sb, opts.zone);
  if (map.end) {
    const eb = behaviorFor(opts, map.end);
    const end =
      selection.allDay && eb === DateTimeBehavior.DateOnly ? exclusiveEndToInclusive(selection.end) : selection.end;
    params[map.end] = toFormParameterDate(end, eb, opts.zone);
  }
  if (map.allDay && selection.allDay) params[map.allDay] = true;
  return params;
}
