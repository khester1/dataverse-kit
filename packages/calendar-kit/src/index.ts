/**
 * `@dataverse-kit/calendar-kit` — a calendar fed plain events. Fluent-free: this is the entry a
 * Power Pages site (Fluent v8, or none) uses. For Fluent v9 styling import from `./v9`; for the
 * contract and date rules alone, `./core`; for Dataverse, `./dataverse` and `./adapters/*`.
 */
export { CalendarView } from './view/CalendarView';
export type { CalendarViewName, CalendarViewProps } from './view/CalendarView';
export { themeStyle } from './view/theme';
export type { CalendarTheme } from './view/theme';
export * from './core';
export { useCalendarSource } from './view/useCalendarSource';
export type { CalendarSourceBinding } from './view/useCalendarSource';
