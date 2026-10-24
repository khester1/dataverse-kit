import * as React from 'react';
import { act, render, renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import type { CalendarDataSource, CalendarEvent, VisibleRange } from '../core/types';
import { useCalendarSource } from './useCalendarSource';
import { CalendarView } from './CalendarView';

const week = (d: string): VisibleRange => ({ start: `${d}T00:00:00.000Z`, end: `${d}T23:00:00.000Z`, view: 'timeGridWeek', startDate: d, endDate: d });
const ev = (id: string): CalendarEvent => ({ id, title: id, start: '2026-09-28T16:00:00.000Z' });

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((a, b) => ((resolve = a), (reject = b)));
  return { promise, resolve, reject };
}

describe('useCalendarSource', () => {
  it('★ an OLDER response arriving LAST does not overwrite the newer range (and the older is aborted)', async () => {
    const pending: { range: VisibleRange; signal?: AbortSignal; d: ReturnType<typeof deferred<CalendarEvent[]>> }[] = [];
    // ★ This source IGNORES the signal, as a careless one would — the hook must still be safe.
    const source: CalendarDataSource = {
      capabilities: { update: false, create: false, open: false },
      load: (range, signal) => {
        const d = deferred<CalendarEvent[]>();
        pending.push({ range, signal, d });
        return d.promise;
      },
    };
    const { result } = renderHook(() => useCalendarSource(source));
    act(() => result.current.props.onRangeChange(week('2026-09-28')));
    act(() => result.current.props.onRangeChange(week('2026-10-05')));
    expect(pending).toHaveLength(2);
    expect(pending[0].signal?.aborted).toBe(true);

    await act(async () => pending[1].d.resolve([ev('newer')]));
    await act(async () => pending[0].d.resolve([ev('older')]));
    expect(result.current.events.map((e) => e.id)).toEqual(['newer']);
    expect(result.current.loading).toBe(false);
  });

  it('the same range again does not re-query; a load failure keeps the old events and reports', async () => {
    const load = vi.fn<Parameters<CalendarDataSource['load']>, ReturnType<CalendarDataSource['load']>>(async () => [ev('a')]);
    const source: CalendarDataSource = { capabilities: { update: false, create: false, open: false }, load };
    const { result } = renderHook(() => useCalendarSource(source));
    act(() => result.current.props.onRangeChange(week('2026-09-28')));
    await waitFor(() => expect(result.current.events).toHaveLength(1));
    act(() => result.current.props.onRangeChange(week('2026-09-28')));
    expect(load).toHaveBeenCalledTimes(1);

    load.mockRejectedValueOnce(new Error('403 table permission'));
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.error).toBe('403 table permission'));
    expect(result.current.events.map((e) => e.id)).toEqual(['a']);
  });

  it('a save RELOADS on success and RE-THROWS on failure (so the calendar reverts the drag)', async () => {
    const load = vi.fn(async () => [ev('a')]);
    const update = vi.fn(async () => {});
    const source: CalendarDataSource = { capabilities: { update: true, create: false, open: false }, load, update };
    const { result } = renderHook(() => useCalendarSource(source));
    act(() => result.current.props.onRangeChange(week('2026-09-28')));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    expect(result.current.props.editable).toBe(true);

    const change = { event: ev('a'), kind: 'move' as const, start: '2026-09-29T16:00:00.000Z', end: undefined, allDay: false };
    await act(async () => result.current.props.onEventChange!(change));
    expect(update).toHaveBeenCalledWith(change);
    expect(load).toHaveBeenCalledTimes(2);

    update.mockRejectedValueOnce(new Error('locked'));
    // ★ Caught INSIDE act: `expect(act(…)).rejects` settles after the test ends (act returns a
    //   thenable), so a swallowed failure showed up only as a stray "unhandled error" — MEASURED.
    let caught: unknown;
    await act(async () => {
      try {
        await result.current.props.onEventChange!(change);
      } catch (e) {
        caught = e;
      }
    });
    expect((caught as Error | undefined)?.message).toBe('locked');
  });

  it('a read-only source yields a read-only calendar — no handler keys at all', () => {
    const source: CalendarDataSource = { capabilities: { update: false, create: false, open: false }, load: async () => [] };
    const { result } = renderHook(() => useCalendarSource(source));
    expect(result.current.props.editable).toBe(false);
    expect(result.current.props.selectable).toBe(false);
    // ★ Omitted, not undefined — FullCalendar treats a present-but-undefined key as a value.
    expect(Object.keys(result.current.props).sort()).toEqual(['editable', 'events', 'loading', 'onRangeChange', 'selectable']);
  });

  it('a new source re-queries the range already on screen', async () => {
    const a: CalendarDataSource = { capabilities: { update: false, create: false, open: false }, load: async () => [ev('from-a')] };
    const b: CalendarDataSource = { capabilities: { update: false, create: false, open: false }, load: async () => [ev('from-b')] };
    const { result, rerender } = renderHook(({ s }) => useCalendarSource(s), { initialProps: { s: a } });
    act(() => result.current.props.onRangeChange(week('2026-09-28')));
    await waitFor(() => expect(result.current.events[0]?.id).toBe('from-a'));
    rerender({ s: b });
    await waitFor(() => expect(result.current.events[0]?.id).toBe('from-b'));
  });

  it('create reloads after the host finishes; a create failure is reported, not thrown', async () => {
    const load = vi.fn(async () => []);
    const create = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('no form'));
    const source: CalendarDataSource = { capabilities: { update: false, create: true, open: false }, load, create };
    const { result } = renderHook(() => useCalendarSource(source));
    act(() => result.current.props.onRangeChange(week('2026-09-28')));
    const slot = { start: '2026-09-28', end: '2026-09-29', allDay: true };
    act(() => result.current.props.onSelectRange!(slot));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    act(() => result.current.props.onSelectRange!(slot));
    await waitFor(() => expect(result.current.error).toBe('no form'));
  });
});

describe('useCalendarSource — mounted the way a host mounts it', () => {
  // ★ MEASURED on a live code app and a live Power Pages site (2026-09-29): the calendar reports its
  //   range from a CHILD effect, which React runs BEFORE the hook's own mount effect — so the hook
  //   loaded once for the range and again for the "new" source. 2 calls per mount in production
  //   (the portal bills per call), 3 under StrictMode. The earlier tests reported the range from
  //   act() AFTER mount, which is not the order a host produces.
  const counting = () => {
    const load = vi.fn(async (): Promise<CalendarEvent[]> => [ev('a')]);
    return { load, source: { capabilities: { update: false, create: false, open: false }, load } as CalendarDataSource };
  };

  function RangeOnMount({ onRangeChange }: { onRangeChange: (r: VisibleRange) => void }) {
    React.useEffect(() => onRangeChange(week('2026-09-28')), [onRangeChange]);
    return null;
  }
  function Host({ source }: { source: CalendarDataSource }) {
    const cal = useCalendarSource(source);
    return <RangeOnMount onRangeChange={cal.props.onRangeChange} />;
  }

  it('one load when a child reports the range during mount', async () => {
    const { load, source } = counting();
    render(<Host source={source} />);
    await waitFor(() => expect(load).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('one load with the real CalendarView as the child', async () => {
    const { load, source } = counting();
    function Real() {
      const cal = useCalendarSource(source);
      return <CalendarView {...cal.props} view="list" initialDate="2026-09-28" />;
    }
    render(<Real />);
    await waitFor(() => expect(load).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('under StrictMode the events still ARRIVE (a fix that just skips a load can strand the aborted one)', async () => {
    const { source } = counting();
    let seen: readonly CalendarEvent[] = [];
    function Probe() {
      const cal = useCalendarSource(source);
      seen = cal.events;
      return <RangeOnMount onRangeChange={cal.props.onRangeChange} />;
    }
    render(<React.StrictMode><Probe /></React.StrictMode>);
    await waitFor(() => expect(seen.map((e) => e.id)).toEqual(['a']));
  });

  it('a new source still re-queries after mount (the reason the effect exists)', async () => {
    const a = counting();
    const b = counting();
    const { rerender } = render(<Host source={a.source} />);
    await waitFor(() => expect(a.load).toHaveBeenCalledTimes(1));
    rerender(<Host source={b.source} />);
    await waitFor(() => expect(b.load).toHaveBeenCalledTimes(1));
    expect(a.load).toHaveBeenCalledTimes(1);
  });
});
