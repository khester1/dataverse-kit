import * as React from 'react';
import type { CalendarDataSource, CalendarEvent, CalendarEventChange, SlotSelection, VisibleRange } from '../core/types';

export interface CalendarSourceBinding {
  events: readonly CalendarEvent[];
  loading: boolean;
  /** The last load failure, or null. A failed load keeps the previous events on screen. */
  error: string | null;
  /** Re-run the current range (e.g. after booking a slot elsewhere on the page). */
  reload: () => void;
  /** Spread onto `<CalendarView>` / `<FluentCalendar>`. */
  props: {
    events: readonly CalendarEvent[];
    loading: boolean;
    editable: boolean;
    selectable: boolean;
    onRangeChange: (range: VisibleRange) => void;
    onEventChange?: (change: CalendarEventChange) => Promise<void>;
    onEventClick?: (event: CalendarEvent) => void;
    onSelectRange?: (slot: SlotSelection) => void;
  };
}

function describe(error: unknown): string {
  const m = (error as { message?: unknown } | null)?.message;
  return typeof m === 'string' && m ? m : String(error);
}

const isAbort = (e: unknown): boolean => (e as { name?: unknown } | null)?.name === 'AbortError';

/**
 * Drive a calendar from a PULLED `CalendarDataSource` (code app, Power Pages): load on every range
 * change, save a drag through the source, then reload so the calendar shows what the server kept.
 *
 * ★ Only the NEWEST load may land. Ranges change faster than networks answer (click "next" three
 *   times), so an older response arriving last must not overwrite the newer week. Each load aborts
 *   its predecessor AND is sequence-checked — a source that ignores `signal` is still safe.
 * ★ A save that rejects is RE-THROWN, so the calendar's optimistic layer reverts the event and shows
 *   the message; swallowing it here would leave the event where it was dropped, unsaved.
 */
export function useCalendarSource(source: CalendarDataSource | null | undefined): CalendarSourceBinding {
  const [events, setEvents] = React.useState<readonly CalendarEvent[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const range = React.useRef<VisibleRange | null>(null);
  const seq = React.useRef(0);
  const inflight = React.useRef<AbortController | null>(null);
  // The source the current (or last) load was issued for — see the mount effect below.
  const loadedFor = React.useRef<CalendarDataSource | null>(null);

  const load = React.useCallback(async (): Promise<void> => {
    const r = range.current;
    if (!source || !r) return;
    loadedFor.current = source;
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    const mine = ++seq.current;
    setLoading(true);
    try {
      const next = await source.load(r, controller.signal);
      if (mine !== seq.current) return;
      setEvents(next);
      setError(null);
    } catch (e) {
      if (mine !== seq.current || isAbort(e)) return;
      setError(describe(e));
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [source]);

  // A new source (different filter, different table) re-queries the range already on screen.
  // ★ MEASURED on a live code app and Power Pages site: the calendar reports its range from a CHILD
  //   effect, which runs BEFORE this one — so on mount a load for THIS source is already in flight,
  //   and unconditionally loading again doubled every mount (2 calls; the portal bills per call).
  //   Skip when the load in flight is already for this source. The cleanup clears the marker, so a
  //   StrictMode fake-unmount (which aborts the in-flight load) re-queries on the re-run instead of
  //   stranding the calendar empty.
  React.useEffect(() => {
    if (loadedFor.current !== source) {
      setEvents([]);
      void load();
    }
    return () => {
      // `seq` is a counter, not a DOM ref: bumping the CURRENT value is the point (it retires any
      // load still in flight), so the rule's "copy it first" advice would defeat the cleanup.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      seq.current++;
      inflight.current?.abort();
      loadedFor.current = null;
    };
  }, [load, source]);

  const onRangeChange = React.useCallback(
    (r: VisibleRange) => {
      const prev = range.current;
      range.current = r;
      if (prev && prev.start === r.start && prev.end === r.end) return;
      void load();
    },
    [load]
  );

  const reload = React.useCallback(() => void load(), [load]);

  const onEventChange = React.useMemo(
    () =>
      source?.capabilities.update && source.update
        ? async (change: CalendarEventChange): Promise<void> => {
            await source.update!(change);
            await load();
          }
        : undefined,
    [source, load]
  );

  const open = React.useMemo(
    () => (source?.capabilities.open && source.open ? (e: CalendarEvent) => source.open!(e) : undefined),
    [source]
  );
  const onSelectRange = React.useMemo(
    () =>
      source?.capabilities.create && source.create
        ? (slot: SlotSelection) => {
            void Promise.resolve()
              .then(() => source.create!(slot))
              .then(
                () => load(),
                (e: unknown) => setError(describe(e))
              );
          }
        : undefined,
    [source, load]
  );

  return {
    events,
    loading,
    error,
    reload,
    props: {
      events,
      loading,
      editable: !!onEventChange,
      selectable: !!onSelectRange,
      onRangeChange,
      ...(onEventChange ? { onEventChange } : {}),
      ...(open ? { onEventClick: open } : {}),
      ...(onSelectRange ? { onSelectRange } : {}),
    },
  };
}
