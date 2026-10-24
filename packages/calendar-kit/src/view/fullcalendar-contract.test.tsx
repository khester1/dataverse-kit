import * as React from 'react';
import { render } from '@testing-library/react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/react/timegrid';
import interactionPlugin from '@fullcalendar/react/interaction';
import { toFcEvent } from './fcBridge';
import { tokyo } from '../__tests__/zones';

/**
 * ★★ The kit's output, READ BACK THROUGH FULLCALENDAR — not asserted on the kit's own objects.
 *
 * MEASURED: FullCalendar treats a PRESENT key as a value. `{ editable: undefined }` resolves to
 * `startEditable === false`, so an earlier `toFcEvent` that always emitted the key locked EVERY
 * event in an editable calendar. A test on `toFcEvent`'s return value could not see that: the
 * object looked right, and the defect was in how the library reads it. Only FullCalendar can
 * say what FullCalendar does.
 */
function loaded(events: ReturnType<typeof toFcEvent>[]) {
  const ref = React.createRef<{ getApi(): { getEvents(): { id: string; startEditable: unknown; durationEditable: unknown }[] } }>();
  render(
    <FullCalendar
      ref={ref as never}
      plugins={[timeGridPlugin, interactionPlugin]}
      initialView="timeGridWeek"
      initialDate="2026-09-28"
      timeZone="UTC"
      editable
      events={events}
    />
  );
  return ref.current!.getApi().getEvents();
}

describe('FullCalendar reads the kit output as intended', () => {
  it('an ordinary event is NOT locked (defers to the calendar-wide editable)', () => {
    const [e] = loaded([toFcEvent({ id: 'a', title: 'a', start: '2026-09-28T00:00:00Z', end: '2026-09-28T01:00:00Z' }, tokyo)]);
    expect(e.startEditable).not.toBe(false);
    expect(e.durationEditable).not.toBe(false);
  });

  it('an event with no end can still MOVE, but not resize', () => {
    const [e] = loaded([toFcEvent({ id: 'n', title: 'n', start: '2026-09-28T00:00:00Z' }, tokyo)]);
    expect(e.startEditable).not.toBe(false);
    expect(e.durationEditable).toBe(false);
  });

  it('a readOnly event IS locked', () => {
    const [e] = loaded([toFcEvent({ id: 'r', title: 'r', start: '2026-09-28T00:00:00Z', readOnly: true }, tokyo)]);
    expect(e.startEditable).toBe(false);
  });

  it('no optional key is emitted as undefined (the whole defect class)', () => {
    const out = toFcEvent({ id: 'a', title: 'a', start: '2026-09-28' }, tokyo) as unknown as Record<string, unknown>;
    for (const [k, v] of Object.entries(out)) expect({ k, v }).not.toEqual({ k, v: undefined });
  });
});
