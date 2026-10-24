/**
 * The calendar's data contract. Framework-agnostic: nothing here may import React, FullCalendar
 * or Fluent (enforced by .eslintrc.cjs and verified on the built bundle).
 *
 * ★★ A date-time value is ISO-8601 TEXT, and its SHAPE carries its meaning:
 *
 *   | shape                              | kind       | means                                          |
 *   |------------------------------------|------------|------------------------------------------------|
 *   | `2026-09-29`                       | `date`     | a calendar day (all-day)                       |
 *   | `2026-09-29T23:30` / `…T23:30:00`  | `floating` | a wall-clock time, the same face in every zone |
 *   | `2026-09-30T06:30:00Z` / `…+09:00` | `instant`  | one moment, shown in the viewer's zone         |
 *
 * That is not an invention: it is exactly how ISO-8601 already distinguishes the three, and they
 * map one-to-one onto Dataverse's DateOnly, TimeZoneIndependent and UserLocal behaviours
 * (see ./dataverse.ts). An event keeps its kind through a drag — a floating event moved on the
 * calendar comes back floating — so a host never has to remember which kind it sent.
 *
 * A `Date` is accepted wherever a value is read, and always means an instant.
 */
export type CalendarValue = string;

export type ValueKind = 'date' | 'floating' | 'instant';

/**
 * Minutes EAST of UTC for the zone the calendar is shown in, at a given instant.
 *
 * ★ East-positive, matching PCF's `userSettings.getTimeZoneOffsetMinutes()` (Pacific → -420,
 *   Tokyo → +540, MEASURED) and the OPPOSITE sign to JS `Date#getTimezoneOffset()`.
 * ★ A FUNCTION of the instant rather than a number, so daylight-saving changes inside the
 *   visible range are handled: the offset for 1 March and 1 April can differ.
 */
export type ZoneOffset = (instant: Date) => number;

export interface CalendarEvent {
  /** Stable id. The calendar hands it back on every callback. */
  id: string;
  /** See {@link CalendarValue}. A date-shaped start makes the event all-day. */
  start: CalendarValue | Date;
  /**
   * Same kind as `start`. For an all-day event this is EXCLUSIVE — the day AFTER the last day
   * shown — as in iCalendar and FullCalendar. (Dataverse stores it inclusive; the Dataverse
   * helpers convert.) Omitted means a default-length event.
   */
  end?: CalendarValue | Date;
  title: string;
  /** Any CSS colour. Omitted means the calendar's primary colour. */
  color?: string;
  /** Opaque grouping key — a location, a staff member. Used for colour and filtering. */
  resourceId?: string;
  /** Forces all-day. Normally inferred from a date-shaped `start`. */
  allDay?: boolean;
  /** This event cannot be dragged or resized even when the calendar is editable. */
  readOnly?: boolean;
  /** Anything the host wants back in callbacks. The calendar never reads it. */
  data?: unknown;
}

/** A moved or resized event, in the SAME kind as the event's original `start`. */
export interface CalendarEventChange {
  event: CalendarEvent;
  kind: 'move' | 'resize';
  start: CalendarValue;
  /** Exclusive for all-day, as on {@link CalendarEvent.end}. */
  end: CalendarValue | undefined;
  allDay: boolean;
}

/**
 * An empty range the user selected. `allDay` selections are `date` values with an EXCLUSIVE
 * end; timed selections are `instant` values (UTC `Z`), converted from the calendar's zone.
 */
export interface SlotSelection {
  start: CalendarValue;
  end: CalendarValue;
  allDay: boolean;
}

/** The visible range, as instants (UTC `Z`). `start` inclusive, `end` exclusive. */
export interface VisibleRange {
  start: CalendarValue;
  end: CalendarValue;
  /** The FullCalendar view name, e.g. `timeGridWeek`. */
  view: string;
  /** The same range as calendar DAYS in the calendar's zone, end exclusive. */
  startDate: CalendarValue;
  endDate: CalendarValue;
}

export interface BusinessHours {
  /** 0 = Sunday. */
  daysOfWeek: number[];
  /** `HH:mm`, wall-clock in the calendar's zone. */
  startTime: string;
  endTime: string;
}

/**
 * The seam between the calendar and a data source that is PULLED (a code app's data service,
 * a Power Pages `/_api` table). A PCF dataset is PUSHED by the host instead and does not use
 * this — see `./adapters/pcf-dataset`.
 */
export interface CalendarDataSource {
  readonly capabilities: {
    readonly update: boolean;
    readonly create: boolean;
    readonly open: boolean;
  };
  /** Events overlapping the range. Honour `signal`: ranges change faster than networks answer. */
  load(range: VisibleRange, signal?: AbortSignal): Promise<CalendarEvent[]>;
  /** Persist a move/resize. Reject to make the calendar put the event back. */
  update?(change: CalendarEventChange): Promise<void>;
  create?(slot: SlotSelection): Promise<void> | void;
  open?(event: CalendarEvent): void;
}
