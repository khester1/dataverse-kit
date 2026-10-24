/**
 * `@dataverse-kit/calendar-kit/core` — the framework-agnostic layer: the event contract, value
 * kinds and zone conversion, and colours. No React, no FullCalendar, no Fluent, no Dataverse.
 */
export type {
  BusinessHours,
  CalendarDataSource,
  CalendarEvent,
  CalendarEventChange,
  CalendarValue,
  SlotSelection,
  ValueKind,
  VisibleRange,
  ZoneOffset,
} from './types';
export {
  addDays,
  browserZone,
  fixedZone,
  fromWall,
  kindOf,
  normaliseFloating,
  toDate,
  toInstant,
  toWall,
  utcFieldsToWall,
} from './datetime';
export { GROUP_PALETTE, contrastRatio, groupColor, parseHex, readableTextOn } from './colors';
