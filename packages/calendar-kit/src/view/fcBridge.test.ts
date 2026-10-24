import { applyPending, settledIds, toChange, toFcEvent, toSelection, toVisibleRange } from './fcBridge';
import { pacific2026, tokyo } from '../__tests__/zones';

/** FullCalendar runs with timeZone 'UTC': its Dates carry the WALL CLOCK in their UTC fields. */
const fc = (wall: string): Date => new Date(`${wall}Z`);

describe('toFcEvent — values shifted into the USER zone', () => {
  it('an instant is shown at the user wall clock (Tokyo: Tue 15:30, not the browser zone)', () => {
    const e = toFcEvent({ id: '1', title: 't', start: '2026-09-30T06:30:00.000Z', end: '2026-09-30T07:30:00.000Z' }, tokyo);
    expect(e).toMatchObject({ start: '2026-09-30T15:30:00', end: '2026-09-30T16:30:00', allDay: false });
    expect(e.extendedProps.kind).toBe('instant');
  });
  it('a floating value is shown as-is in any zone', () => {
    expect(toFcEvent({ id: '1', title: 't', start: '2026-09-29T23:30' }, tokyo).start).toBe('2026-09-29T23:30:00');
  });
  it('a date is all-day; allDay:true on an instant truncates to the user day', () => {
    expect(toFcEvent({ id: '1', title: 't', start: '2026-09-29' }, tokyo)).toMatchObject({ allDay: true, start: '2026-09-29' });
    expect(toFcEvent({ id: '1', title: 't', start: '2026-09-30T06:30:00Z', allDay: true }, pacific2026).start).toBe('2026-09-29');
  });
  it('an all-day rendering of a TIMED end rounds UP to the next day (the last day stays visible)', () => {
    const e = toFcEvent({ id: '1', title: 't', start: '2026-09-29T09:00:00', end: '2026-09-30T15:00:00', allDay: true }, tokyo);
    expect(e).toMatchObject({ start: '2026-09-29', end: '2026-10-01' });
    const midnight = toFcEvent({ id: '2', title: 't', start: '2026-09-29T09:00:00', end: '2026-09-30T00:00:00', allDay: true }, tokyo);
    expect(midnight.end).toBe('2026-09-30');
  });
  it('an event with no end can be moved but not resized (a resize would invent an end nobody stores)', () => {
    expect(toFcEvent({ id: '1', title: 't', start: '2026-09-29T09:00:00' }, tokyo).durationEditable).toBe(false);
    expect('durationEditable' in toFcEvent({ id: '1', title: 't', start: '2026-09-29T09:00:00', end: '2026-09-29T10:00:00' }, tokyo)).toBe(false);
  });
  it('readOnly events are not editable; others defer to the calendar', () => {
    expect(toFcEvent({ id: '1', title: 't', start: '2026-09-29', readOnly: true }, tokyo).editable).toBe(false);
    expect(toFcEvent({ id: '1', title: 't', start: '2026-09-29' }, tokyo).editable).toBeUndefined();
  });
  it('a pale colour gets black text', () => {
    expect(toFcEvent({ id: '1', title: 't', start: '2026-09-29', color: '#ffd700' }, tokyo).textColor).toBe('#000000');
  });
});

describe('toChange — the event keeps its KIND through a drag', () => {
  const source = { id: 'x', title: 'x', start: '2026-09-30T06:30:00.000Z' };
  it('instant in, instant out (converted back from the Tokyo wall clock)', () => {
    const fcEvent = { start: fc('2026-09-30T17:00:00'), end: fc('2026-09-30T18:00:00'), allDay: false, extendedProps: { source, kind: 'instant' } };
    expect(toChange(fcEvent, 'move', tokyo)).toMatchObject({ start: '2026-09-30T08:00:00.000Z', end: '2026-09-30T09:00:00.000Z', allDay: false });
  });
  it('floating in, floating out — no zone applied', () => {
    const floating = { id: 'f', title: 'f', start: '2026-09-29T09:00:00' };
    const fcEvent = { start: fc('2026-09-29T13:00:00'), end: fc('2026-09-29T15:00:00'), allDay: false, extendedProps: { source: floating, kind: 'floating', originalKind: 'floating' } };
    expect(toChange(fcEvent, 'move', tokyo)).toMatchObject({ start: '2026-09-29T13:00:00', end: '2026-09-29T15:00:00' });
  });
  it('a RESIZE never moves the start — even on the fall-back day, where the wall clock is ambiguous', () => {
    // 09:30Z is the SECOND 01:30 in Pacific on 2026-11-01; read back from the wall clock it is 08:30Z.
    const second = { id: 's', title: 's', start: '2026-11-01T09:30:00.000Z', end: '2026-11-01T10:30:00.000Z' };
    const fcIn = toFcEvent(second, pacific2026);
    const fcEvent = { start: fc(fcIn.start), end: fc('2026-11-01T03:00:00'), allDay: false, extendedProps: fcIn.extendedProps };
    expect(toChange(fcEvent, 'resize', pacific2026).start).toBe('2026-11-01T09:30:00.000Z');
    // …while a MOVE does recompute it (and here would pick the earlier 01:30 — documented, not a resize).
    expect(toChange(fcEvent, 'move', pacific2026).start).toBe('2026-11-01T08:30:00.000Z');
  });
  it('an instant forced all-day comes back as an INSTANT (user-zone midnight), not a date', () => {
    const forced = { id: 'a', title: 'a', start: '2026-09-30T06:30:00.000Z', allDay: true };
    const fcIn = toFcEvent(forced, pacific2026);
    expect(fcIn.extendedProps).toMatchObject({ kind: 'date', originalKind: 'instant' });
    const fcEvent = { start: fc('2026-10-02T00:00:00'), end: null, allDay: true, extendedProps: fcIn.extendedProps };
    expect(toChange(fcEvent, 'move', pacific2026).start).toBe('2026-10-02T07:00:00.000Z');
  });
  it('date in, date out, end exclusive', () => {
    const fcEvent = { start: fc('2026-10-03T00:00:00'), end: fc('2026-10-04T00:00:00'), allDay: true, extendedProps: { source, kind: 'date' } };
    expect(toChange(fcEvent, 'move', tokyo)).toMatchObject({ start: '2026-10-03', end: '2026-10-04', allDay: true });
  });
  it('round trip: toFcEvent → FullCalendar Date → toChange is the identity, across DST', () => {
    for (const start of ['2026-03-08T09:59:00.000Z', '2026-03-08T10:00:00.000Z', '2026-11-01T08:30:00.000Z', '2026-07-01T00:00:00.000Z']) {
      const fcIn = toFcEvent({ id: 'r', title: 'r', start }, pacific2026);
      const back = toChange({ start: fc(fcIn.start), end: null, allDay: false, extendedProps: fcIn.extendedProps }, 'move', pacific2026);
      expect(back.start).toBe(start);
    }
  });
});

describe('toSelection / toVisibleRange', () => {
  it('a timed selection comes back as instants', () => {
    expect(toSelection(fc('2026-09-30T08:00:00'), fc('2026-09-30T08:30:00'), false, pacific2026)).toEqual({
      start: '2026-09-30T15:00:00.000Z',
      end: '2026-09-30T15:30:00.000Z',
      allDay: false,
    });
  });
  it('an all-day selection comes back as dates', () => {
    expect(toSelection(fc('2026-10-01T00:00:00'), fc('2026-10-03T00:00:00'), true, pacific2026)).toEqual({
      start: '2026-10-01',
      end: '2026-10-03',
      allDay: true,
    });
  });
  it('the visible range is USER-zone midnights (the spike used browser midnights — a defect)', () => {
    const r = toVisibleRange(fc('2026-09-27T00:00:00'), fc('2026-10-04T00:00:00'), 'timeGridWeek', tokyo);
    expect(r).toEqual({
      start: '2026-09-26T15:00:00.000Z',
      end: '2026-10-03T15:00:00.000Z',
      startDate: '2026-09-27',
      endDate: '2026-10-04',
      view: 'timeGridWeek',
    });
  });
});

describe('optimistic overrides', () => {
  const events = [{ id: 'a', title: 'a', start: '2026-09-28T16:00:00.000Z', end: '2026-09-28T17:00:00.000Z' }];
  const move = { start: '2026-09-28T18:00:00.000Z', end: '2026-09-28T19:00:00.000Z', allDay: false, token: 1 };
  const pending = new Map([['a', move]]);

  it('a pending move wins over stale props (the host re-rendered before its save landed)', () => {
    expect(applyPending(events, pending)[0].start).toBe('2026-09-28T18:00:00.000Z');
    expect(settledIds(events, pending)).toEqual([]);
  });
  it('settles when the props agree — compared as instants, not as text', () => {
    const fresh = [{ ...events[0], start: '2026-09-28T18:00:00Z', end: '2026-09-28T19:00:00.000Z' }];
    expect(settledIds(fresh, pending)).toEqual(['a']);
  });
  it('settles when the event vanished (deleted elsewhere) — no ghost', () => {
    expect(settledIds([], pending)).toEqual(['a']);
  });
  it('a SAVED move settles on the next events even if they never match (no end column, adjusted by a plugin)', () => {
    const saved = new Map([['a', { ...move, savedWith: events }]]);
    expect(settledIds(events, saved)).toEqual([]); // same array: still held
    const refreshedWithoutEnd = [{ id: 'a', title: 'a', start: '2026-09-28T18:00:00.000Z' }];
    expect(settledIds(refreshedWithoutEnd, saved)).toEqual(['a']);
  });
});
