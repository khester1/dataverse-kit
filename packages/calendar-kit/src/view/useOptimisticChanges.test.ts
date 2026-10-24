import { act, renderHook } from '@testing-library/react';
import type { CalendarEvent, CalendarEventChange } from '../core/types';
import { fixedZone } from '../core/datetime';
import { toFcEvent } from './fcBridge';
import { useOptimisticChanges, type ChangeInfoLike } from './useOptimisticChanges';

/**
 * The save state machine, driven with FAKE change infos — the part of drag-and-drop that no
 * synthetic input could exercise against FullCalendar v7. Each case is a transition a reviewer
 * found untested (PR #383).
 */
const zone = fixedZone(0);
const zoneRef = { current: zone };
const ev = (start: string, end?: string): CalendarEvent => ({ id: 'a', title: 'Alpha', start, ...(end ? { end } : {}) });

/** A fake FullCalendar change info that moved `event` to `start`/`end` (UTC-as-wall Dates). */
function dropped(event: CalendarEvent, start: string, end?: string) {
  const fc = toFcEvent(event, zone);
  const reverts: number[] = [];
  const info: ChangeInfoLike = {
    event: { start: new Date(`${start}Z`), end: end ? new Date(`${end}Z`) : null, allDay: false, extendedProps: fc.extendedProps },
    revert: () => reverts.push(1),
  };
  return { info, reverts };
}

function deferred() {
  let resolve!: () => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const setup = (events: CalendarEvent[], onEventChange: (c: CalendarEventChange) => void | Promise<void>, onChangeError = vi.fn()) =>
  renderHook(({ evs }) => useOptimisticChanges(evs, onEventChange, onChangeError, zoneRef), { initialProps: { evs: events } });

describe('useOptimisticChanges', () => {
  const original = ev('2026-09-28T09:00:00Z', '2026-09-28T10:00:00Z');

  it('holds the dropped position while saving; a REJECT reverts, shows the banner and calls onChangeError first', async () => {
    const d = deferred();
    const order: string[] = [];
    const onChangeError = vi.fn(() => order.push('onChangeError'));
    const { result } = setup([original], () => d.promise, onChangeError);
    const { info, reverts } = dropped(original, '2026-09-29T09:00:00', '2026-09-29T10:00:00');
    const revert = info.revert;
    info.revert = () => {
      order.push('revert');
      revert();
    };

    act(() => result.current.handleChange('move')(info));
    expect(result.current.pending.get('a')?.start).toBe('2026-09-29T09:00:00.000Z');

    await act(async () => {
      d.reject(new Error('The requested record was not found.'));
      await d.promise.catch(() => undefined);
    });
    expect(reverts).toHaveLength(1);
    expect(result.current.pending.size).toBe(0);
    expect(result.current.error).toBe('Could not save "Alpha": The requested record was not found.');
    expect(order).toEqual(['onChangeError', 'revert']);
  });

  it('a SYNCHRONOUS throw is a failed save: reverted, with the banner', () => {
    const { result } = setup([original], () => {
      throw new Error('boom');
    });
    const { info, reverts } = dropped(original, '2026-09-29T09:00:00', '2026-09-29T10:00:00');
    act(() => result.current.handleChange('move')(info));
    expect(reverts).toHaveLength(1);
    expect(result.current.error).toMatch(/boom/);
    expect(result.current.pending.size).toBe(0);
  });

  it('two moves race: the OLDER one failing does not undo the newer one', async () => {
    const first = deferred();
    const second = deferred();
    const saves = [first.promise, second.promise];
    const { result } = setup([original], () => saves.shift()!);

    const one = dropped(original, '2026-09-29T09:00:00', '2026-09-29T10:00:00');
    act(() => result.current.handleChange('move')(one.info));
    const two = dropped(original, '2026-09-30T09:00:00', '2026-09-30T10:00:00');
    act(() => result.current.handleChange('move')(two.info));

    await act(async () => {
      first.reject(new Error('stale'));
      await first.promise.catch(() => undefined);
    });
    expect(one.reverts).toHaveLength(0); // must NOT snap back over move two
    expect(result.current.pending.get('a')?.start).toBe('2026-09-30T09:00:00.000Z');
    expect(result.current.error).toMatch(/stale/); // still told
  });

  it('a save whose value NEVER comes back (no end column) settles on the next events, not never', async () => {
    const noEnd = ev('2026-09-28T09:00:00Z');
    const d = deferred();
    const { result, rerender } = setup([noEnd], () => d.promise);
    const { info } = dropped(noEnd, '2026-09-29T09:00:00', '2026-09-29T10:00:00');
    act(() => result.current.handleChange('move')(info));
    await act(async () => {
      d.resolve();
      await d.promise;
    });
    expect(result.current.pending.size).toBe(1); // saved, held until the host re-renders
    // The host refreshes: start moved, but it has no end column, so the props never "match".
    rerender({ evs: [ev('2026-09-29T09:00:00Z')] });
    expect(result.current.pending.size).toBe(0);
  });

  it('a resolved save that the host reflects exactly settles immediately', async () => {
    const d = deferred();
    const { result, rerender } = setup([original], () => d.promise);
    const { info } = dropped(original, '2026-09-29T09:00:00', '2026-09-29T10:00:00');
    act(() => result.current.handleChange('move')(info));
    rerender({ evs: [ev('2026-09-29T09:00:00Z', '2026-09-29T10:00:00Z')] });
    expect(result.current.pending.size).toBe(0);
    await act(async () => {
      d.resolve();
      await d.promise;
    });
    expect(result.current.pending.size).toBe(0);
  });

  it('no handler: every change is reverted (the calendar is effectively read-only)', () => {
    const { result } = renderHook(() => useOptimisticChanges([original], undefined, undefined, zoneRef));
    const { info, reverts } = dropped(original, '2026-09-29T09:00:00');
    act(() => result.current.handleChange('move')(info));
    expect(reverts).toHaveLength(1);
  });
});
