import * as React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/react/daygrid';
import timeGridPlugin from '@fullcalendar/react/timegrid';
import listPlugin from '@fullcalendar/react/list';
import interactionPlugin from '@fullcalendar/react/interaction';
import classicThemePlugin from '@fullcalendar/react/themes/classic';
import type {
  DateSelectInfo,
  DatesSetInfo,
  EventChangeInfo,
  EventClickInfo,
} from '@fullcalendar/react';

import '@fullcalendar/react/skeleton.css';
import '@fullcalendar/react/themes/classic/theme.css';
import '@fullcalendar/react/themes/classic/palette.css';

import { browserZone } from '../core/datetime';
import type { BusinessHours, CalendarEvent, CalendarEventChange, SlotSelection, VisibleRange, ZoneOffset } from '../core/types';
import { applyPending, nowWall, sameAllDayness, toFcEvent, toSelection, toVisibleRange } from './fcBridge';
import { useOptimisticChanges, type ChangeInfoLike } from './useOptimisticChanges';
import { themeStyle, type CalendarTheme } from './theme';

/** The views a host can ask for, by plain name. */
export type CalendarViewName = 'month' | 'week' | 'workWeek' | 'day' | 'list';

const FC_VIEW: Record<CalendarViewName, string> = {
  month: 'dayGridMonth',
  week: 'timeGridWeek',
  workWeek: 'timeGridWorkWeek',
  day: 'timeGridDay',
  list: 'listWeek',
};

const VIEW_LABEL: Record<CalendarViewName, string> = {
  month: 'Month',
  week: 'Week',
  workWeek: 'Work week',
  day: 'Day',
  list: 'List',
};

export interface CalendarViewProps {
  /** Plain event objects. See `CalendarEvent` for how a value's shape sets its kind. */
  events: readonly CalendarEvent[];
  /** The zone to show instants in. Default: the browser's. A PCF host passes the USER's. */
  zone?: ZoneOffset;
  /** Starting view. Default `week`. */
  view?: CalendarViewName;
  /** View buttons offered, in order. Default: month, week, day, list. */
  views?: readonly CalendarViewName[];
  /** `YYYY-MM-DD` to open on. Default today (in `zone`). */
  initialDate?: string;
  /** Allow drag and resize. Default false — read-only is the safe default. */
  editable?: boolean;
  /** Allow selecting an empty range (→ `onSelectRange`). Default: true when a handler is given. */
  selectable?: boolean;
  businessHours?: readonly BusinessHours[];
  /** 0 = Sunday. */
  firstDay?: number;
  /** `HH:mm:ss` bounds of the time grid. */
  slotMinTime?: string;
  slotMaxTime?: string;
  /** Where the time grid first scrolls to. Default `08:00:00`. */
  scrollTime?: string;
  /** Any CSS height, `'auto'`, or a number of pixels. Default `'auto'`. */
  height?: number | string;
  theme?: CalendarTheme;
  /** Shown while data for a new range loads. */
  loading?: boolean;
  className?: string;
  /**
   * Classes for FullCalendar's own parts. ★ v7 HASHES its class names (`fc-classic-1El`), so a
   * descendant selector like `.fc-button` matches NOTHING — measured: 0 of 7 buttons. These go
   * through FullCalendar's `buttonClass` / `headerToolbarClass` options instead.
   */
  classNames?: { button?: string; toolbar?: string };
  /** Accessible name for the calendar region. */
  'aria-label'?: string;

  onEventClick?: (event: CalendarEvent) => void;
  onSelectRange?: (selection: SlotSelection) => void;
  /**
   * A move or resize. Return a promise to make it OPTIMISTIC: the event stays where it was
   * dropped while the promise runs, and goes back — with a message — if it rejects.
   */
  onEventChange?: (change: CalendarEventChange) => void | Promise<void>;
  onRangeChange?: (range: VisibleRange) => void;
  /** Called after a failed change has been reverted. The banner is shown either way. */
  onChangeError?: (error: unknown, change: CalendarEventChange) => void;
}

/** FullCalendar's change info → the hook's minimal shape (what the hook reads, and nothing else). */
const asChangeInfo = (info: EventChangeInfo): ChangeInfoLike => ({
  event: {
    start: info.event.start as Date | null,
    end: info.event.end as Date | null,
    allDay: info.event.allDay,
    extendedProps: info.event.extendedProps,
  },
  revert: () => info.revert(),
});

const bannerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 10px',
  marginBottom: 6,
  borderRadius: 4,
  border: '1px solid currentColor',
};

/**
 * FullCalendar v7 (MIT views only), fed plain events. Knows nothing about Dataverse and nothing
 * about Fluent — this entry is what a Power Pages site uses. `FluentCalendar` (`./v9`) wraps it
 * with Fluent tokens.
 *
 * ★ Nothing here portals and nothing uses tabster, so it cannot join the Fluent/tabster
 *   singleton race that has taken down PCF controls on model-driven forms. The error banner is
 *   in-tree for the same reason: a Toast or Dialog would portal to `document.body`.
 */
export function CalendarView(props: CalendarViewProps): React.ReactElement {
  const zone = props.zone ?? browserZone;
  const zoneRef = React.useRef(zone);
  zoneRef.current = zone;

  const { pending, error, dismissError, handleChange } = useOptimisticChanges(
    props.events,
    props.onEventChange,
    props.onChangeError,
    zoneRef
  );

  const fcEvents = React.useMemo(
    () => applyPending(props.events, pending).map((e) => toFcEvent(e, zone)),
    [props.events, pending, zone]
  );

  const views = props.views ?? (['month', 'week', 'day', 'list'] as const);

  /**
   * ★★ Options the host did not set are OMITTED, never passed as `undefined`. FullCalendar's
   *    option refiners treat a present-but-undefined key as a value: `slotMinTime={undefined}`
   *    replaced the default and the time-grid views threw "Cannot read properties of undefined
   *    (reading 'years')" on first render. The list view never reads it, so a list-only test
   *    was green — found by rendering the WEEK view.
   */
  const optional: Record<string, unknown> = {};
  if (props.firstDay !== undefined) optional.firstDay = props.firstDay;
  if (props.slotMinTime !== undefined) optional.slotMinTime = props.slotMinTime;
  if (props.slotMaxTime !== undefined) optional.slotMaxTime = props.slotMaxTime;
  if (props.initialDate !== undefined) optional.initialDate = props.initialDate;
  if (props.classNames?.button) optional.buttonClass = props.classNames.button;
  if (props.classNames?.toolbar) optional.headerToolbarClass = props.classNames.toolbar;
  if (props.businessHours) optional.businessHours = props.businessHours.map((b) => ({ ...b, daysOfWeek: [...b.daysOfWeek] }));
  const selectable = props.selectable ?? !!props.onSelectRange;

  return (
    <div
      className={props.className}
      style={themeStyle(props.theme)}
      role="region"
      aria-label={props['aria-label'] ?? 'Calendar'}
      aria-busy={props.loading || undefined}
      data-calendar-kit=""
    >
      {error && (
        <div role="alert" style={{ ...bannerStyle, color: props.theme?.error ?? '#a4262c' }}>
          <span style={{ flex: 1 }}>{error}</span>
          <button type="button" onClick={dismissError} aria-label="Dismiss" style={{ font: 'inherit' }}>
            ×
          </button>
        </div>
      )}
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin, classicThemePlugin]}
        timeZone="UTC"
        now={() => nowWall(zoneRef.current)}
        initialView={FC_VIEW[props.view ?? 'week']}
        views={{ timeGridWorkWeek: { type: 'timeGridWeek', hiddenDays: [0, 6] } }}
        headerToolbar={{
          start: 'today prev,next',
          center: 'title',
          end: views.map((v) => FC_VIEW[v]).join(','),
        }}
        // ★ v7 renamed v6's `buttonText` to `buttons: { name: { text } }`, keyed by VIEW name.
        buttons={{
          today: { text: 'Today' },
          ...Object.fromEntries(views.map((v) => [FC_VIEW[v], { text: VIEW_LABEL[v] }])),
        }}
        height={props.height ?? 'auto'}
        events={fcEvents}
        editable={!!props.editable && !!props.onEventChange}
        selectable={selectable}
        selectMirror
        nowIndicator
        dayMaxEvents
        {...optional}
        scrollTime={props.scrollTime ?? '08:00:00'}
        eventAllow={(span, moving) => (moving ? sameAllDayness(span.allDay, moving.allDay) : true)}
        datesSet={(info: DatesSetInfo) =>
          props.onRangeChange?.(toVisibleRange(info.start as Date, info.end as Date, info.view.type, zoneRef.current))
        }
        eventClick={(info: EventClickInfo) => {
          info.jsEvent.preventDefault();
          const source = (info.event.extendedProps as { source?: CalendarEvent }).source;
          if (source) props.onEventClick?.(source);
        }}
        select={(info: DateSelectInfo) => {
          props.onSelectRange?.(toSelection(info.start as Date, info.end as Date, info.allDay, zoneRef.current));
          info.view.calendar.unselect();
        }}
        eventDrop={(info: EventChangeInfo) => handleChange('move')(asChangeInfo(info))}
        eventResize={(info: EventChangeInfo) => handleChange('resize')(asChangeInfo(info))}
      />
    </div>
  );
}
