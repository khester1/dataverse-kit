import { readableTextOn } from '../core/colors';
import { addDays, fromWall, kindOf, normaliseFloating, toInstant, toWall, utcFieldsToWall } from '../core/datetime';
import type {
  CalendarEvent,
  CalendarEventChange,
  CalendarValue,
  SlotSelection,
  ValueKind,
  VisibleRange,
  ZoneOffset,
} from '../core/types';

/**
 * The translation between the kit's contract and FullCalendar's. Pure (types only from here),
 * so every rule is unit-testable without rendering a calendar.
 *
 * ★★★ THE ZONE STRATEGY. FullCalendar is always run with `timeZone: 'UTC'` and fed WALL-CLOCK
 * values already shifted into the calendar's zone. Its `Date`s then carry the wall clock in
 * their UTC fields, and we shift back on the way out.
 *
 * Why not give FullCalendar the zone? Because a PCF host does not expose one. It exposes
 * `getTimeZoneOffsetMinutes(date)` — an offset per instant, no IANA name — and MEASURED on an
 * org, a user set to Tokyo in a Pacific browser saw an event FullCalendar placed on Monday 9:00
 * that the grid beside it said was Tuesday 1:00. The browser's zone is simply the wrong zone.
 * Shifting per instant with that function is also daylight-saving correct, which a fixed
 * `'+09:00'`-style offset would not be.
 */

export interface FcEventInput {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  color?: string;
  textColor?: string;
  editable?: boolean;
  durationEditable?: boolean;
  /**
   * `kind` is how FullCalendar holds the values (`date` when shown all-day); `originalKind` is
   * what the host SENT, and what a change is converted back into — the "an event keeps its kind"
   * contract. They differ only for an instant/floating start forced all-day with `allDay: true`.
   */
  extendedProps: { source: CalendarEvent; kind: ValueKind; originalKind: ValueKind };
}

function toFcValue(value: CalendarValue | Date, zone: ZoneOffset): string {
  const k = kindOf(value);
  if (k === 'instant') return toWall(value, zone);
  if (k === 'floating') return normaliseFloating(value as string);
  return value as string;
}

/** The exclusive all-day end for any end value: a timed end that is not midnight rounds UP a day. */
function exclusiveAllDayEnd(end: CalendarValue | Date, zone: ZoneOffset): string {
  const wall = toFcValue(end, zone);
  if (wall.length === 10) return wall;
  return wall.slice(11, 19) === '00:00:00' ? wall.slice(0, 10) : addDays(wall.slice(0, 10), 1);
}

export function toFcEvent(event: CalendarEvent, zone: ZoneOffset): FcEventInput {
  const originalKind = kindOf(event.start);
  const allDay = event.allDay ?? originalKind === 'date';
  const start = allDay ? toFcValue(event.start, zone).slice(0, 10) : toFcValue(event.start, zone);
  const out: FcEventInput = {
    id: event.id,
    title: event.title,
    start,
    allDay,
    extendedProps: { source: event, kind: allDay ? 'date' : originalKind, originalKind },
  };
  // ★★ Optional keys are OMITTED, never set to `undefined`. FullCalendar treats a PRESENT key as a
  //    value: `editable: undefined` resolves to `startEditable === false` (read back through
  //    FullCalendar's API — see fullcalendar-contract.test.tsx), which locked EVERY event in an
  //    editable calendar. Same family as the `slotMinTime={undefined}` crash in CalendarView.
  if (event.end !== undefined) out.end = allDay ? exclusiveAllDayEnd(event.end, zone) : toFcValue(event.end, zone);
  if (event.color) {
    out.color = event.color;
    const text = readableTextOn(event.color);
    if (text) out.textColor = text;
  }
  if (event.readOnly) out.editable = false;
  // ★ An event with no END is not resizable: a resize would invent an end the host has nowhere
  //   to store (a map with no end column), and the calendar would keep showing a length that
  //   was never saved. Moving it is still fine.
  else if (event.end === undefined) out.durationEditable = false;
  return out;
}

/** A FullCalendar `Date` (UTC fields = wall clock) → a value of `kind`. */
export function fromFcDate(d: Date, kind: ValueKind, zone: ZoneOffset): CalendarValue {
  const wall = utcFieldsToWall(d);
  if (kind === 'date') return wall.slice(0, 10);
  if (kind === 'floating') return wall;
  return fromWall(wall, zone);
}

export interface FcChangedEventLike {
  start: Date | null;
  end: Date | null;
  allDay: boolean;
  extendedProps: Record<string, unknown>;
}

/** A calendar value of `kind` → the same moment in `target` kind (all-day midnight for dates). */
function asKind(value: CalendarValue, from: ValueKind, target: ValueKind, zone: ZoneOffset): CalendarValue {
  if (from === target || from !== 'date') return value;
  return target === 'instant' ? fromWall(`${value}T00:00:00`, zone) : `${value}T00:00:00`;
}

/** The host's original value, canonicalised, for fields a change did not touch. */
function canonical(value: CalendarValue | Date): CalendarValue {
  const k = kindOf(value);
  return k === 'instant' ? toInstant(value) : k === 'floating' ? normaliseFloating(value as string) : (value as string);
}

/** A dropped/resized FullCalendar event → a change in the ORIGINAL event's kind. */
export function toChange(
  fcEvent: FcChangedEventLike,
  kind: CalendarEventChange['kind'],
  zone: ZoneOffset
): CalendarEventChange {
  const { source, kind: valueKind, originalKind } = fcEvent.extendedProps as FcEventInput['extendedProps'];
  if (!fcEvent.start) throw new Error(`FullCalendar returned no start for event ${source.id}`);
  const back = (d: Date): CalendarValue => asKind(fromFcDate(d, valueKind, zone), valueKind, originalKind ?? valueKind, zone);
  return {
    event: source,
    kind,
    // ★ A RESIZE never moves the start. Recomputing it from FullCalendar's wall-clock Date is
    //   lossy on the fall-back day (the second 01:30 reads back as the first), and toWebApiPatch
    //   writes `start` unconditionally — so resizing an end silently moved the start an hour.
    start: kind === 'resize' ? canonical(source.start) : back(fcEvent.start),
    end: fcEvent.end ? back(fcEvent.end) : undefined,
    allDay: fcEvent.allDay,
  };
}

export function toSelection(start: Date, end: Date, allDay: boolean, zone: ZoneOffset): SlotSelection {
  const kind: ValueKind = allDay ? 'date' : 'instant';
  return { start: fromFcDate(start, kind, zone), end: fromFcDate(end, kind, zone), allDay };
}

export function toVisibleRange(start: Date, end: Date, view: string, zone: ZoneOffset): VisibleRange {
  return {
    start: fromFcDate(start, 'instant', zone),
    end: fromFcDate(end, 'instant', zone),
    view,
    startDate: utcFieldsToWall(start).slice(0, 10),
    endDate: utcFieldsToWall(end).slice(0, 10),
  };
}

/** "Now" in the calendar's zone, for FullCalendar's `now` option (drives today + now-line). */
export const nowWall = (zone: ZoneOffset): string => toWall(new Date(), zone);

/**
 * ★ A drag may not change an event's KIND. Dropping a timed appointment on the all-day row
 *   would have to invent a date-only value for a date-time column (or the reverse), and there
 *   is no right answer to invent. FullCalendar allows it by default; this forbids it.
 */
export const sameAllDayness = (spanAllDay: boolean, eventAllDay: boolean): boolean => spanAllDay === eventAllDay;

/* ── Optimistic overrides ────────────────────────────────────────────────────────────────────
 * FullCalendar moves an event the moment it is dropped. The host's `events` prop still has the
 * OLD position until its save resolves AND it re-renders with fresh data — and a PCF host
 * re-renders on anything (resize, focus), so without this the event would snap back mid-save
 * and jump forward again later. An override holds the new position until the props agree.
 */
export interface PendingMove {
  start: CalendarValue;
  end: CalendarValue | undefined;
  allDay: boolean;
  /** Increments per change; only the newest change for an event may settle or revert it. */
  token: number;
  /**
   * Set when the save RESOLVED: the `events` prop at that moment. The move is dropped on the
   * first `events` that is a different array — whether or not it matches. Without this a save
   * whose value never comes back verbatim (no end column mapped, a plugin adjusting the time)
   * kept its override forever, showing a position that was never stored.
   */
  savedWith?: readonly CalendarEvent[];
}

const same = (a: CalendarValue | Date | undefined, b: CalendarValue | undefined): boolean => {
  if (a === undefined || b === undefined) return a === b;
  const ka = kindOf(a);
  if (ka !== kindOf(b)) return false;
  if (ka === 'instant') return new Date(a).getTime() === new Date(b).getTime();
  return ka === 'floating' ? normaliseFloating(a as string) === normaliseFloating(b) : a === b;
};

/** Events with pending moves applied. */
export function applyPending(events: readonly CalendarEvent[], pending: ReadonlyMap<string, PendingMove>): CalendarEvent[] {
  if (pending.size === 0) return events as CalendarEvent[];
  return events.map((e) => {
    const p = pending.get(e.id);
    return p ? { ...e, start: p.start, end: p.end, allDay: p.allDay } : e;
  });
}

/**
 * Ids whose pending move can be dropped: the props now agree, the event vanished (deleted
 * elsewhere — no ghost), or the save resolved and the host has since re-rendered.
 */
export function settledIds(events: readonly CalendarEvent[], pending: ReadonlyMap<string, PendingMove>): string[] {
  const byId = new Map(events.map((e) => [e.id, e]));
  const done: string[] = [];
  for (const [id, p] of pending) {
    const e = byId.get(id);
    if (!e || (same(e.start, p.start) && same(e.end, p.end)) || (p.savedWith !== undefined && p.savedWith !== events)) done.push(id);
  }
  return done;
}
