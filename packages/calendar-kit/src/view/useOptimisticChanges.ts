import * as React from 'react';
import type { CalendarEvent, CalendarEventChange, ZoneOffset } from '../core/types';
import { settledIds, toChange, type FcChangedEventLike, type PendingMove } from './fcBridge';

/** The part of FullCalendar's EventChangeInfo this hook uses — small enough to fake in a test. */
export interface ChangeInfoLike {
  event: FcChangedEventLike;
  revert(): void;
}

export type ChangeHandler = (change: CalendarEventChange) => void | Promise<void>;

function describe(error: unknown): string {
  const m = (error as { message?: unknown } | null)?.message;
  return typeof m === 'string' && m ? m : String(error);
}

/**
 * The optimistic-save state machine behind drag and resize, separated from the calendar so
 * every transition is testable without driving a real drag (which synthetic input could not do
 * against FullCalendar v7 — see CLAUDE.md).
 *
 *   drop ──▶ pending(token) ──resolve──▶ saved (held until the host's next `events`)
 *                         └─reject/throw─▶ revert + banner  (only if still the NEWEST change)
 */
export function useOptimisticChanges(
  events: readonly CalendarEvent[],
  onEventChange: ChangeHandler | undefined,
  onChangeError: ((error: unknown, change: CalendarEventChange) => void) | undefined,
  zoneRef: React.MutableRefObject<ZoneOffset>
): {
  pending: ReadonlyMap<string, PendingMove>;
  error: string | null;
  dismissError: () => void;
  handleChange: (kind: CalendarEventChange['kind']) => (info: ChangeInfoLike) => void;
} {
  const [pending, setPending] = React.useState<ReadonlyMap<string, PendingMove>>(() => new Map());
  const [error, setError] = React.useState<string | null>(null);
  const eventsRef = React.useRef(events);
  eventsRef.current = events;
  // ★ The newest token per event, held in a REF so a settling promise can ask "am I still the
  //   current change?" synchronously. Asking inside a setState updater would be a side effect in
  //   an updater, which React may run twice or late.
  const latest = React.useRef(new Map<string, number>());
  const seq = React.useRef(0);
  const mounted = React.useRef(true);
  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  React.useEffect(() => {
    const done = settledIds(events, pending);
    if (done.length === 0) return;
    for (const id of done) if (latest.current.get(id) === pending.get(id)?.token) latest.current.delete(id);
    setPending((prev) => {
      const next = new Map(prev);
      for (const id of done) next.delete(id);
      return next;
    });
  }, [events, pending]);

  const handleChange = React.useCallback(
    (kind: CalendarEventChange['kind']) =>
      (info: ChangeInfoLike): void => {
        if (!onEventChange) {
          info.revert();
          return;
        }
        let change: CalendarEventChange;
        try {
          change = toChange(info.event, kind, zoneRef.current);
        } catch (e) {
          info.revert();
          setError(describe(e));
          return;
        }
        setError(null);
        const id = change.event.id;
        const token = ++seq.current;

        const fail = (err: unknown): void => {
          const current = latest.current.get(id) === token;
          if (current) latest.current.delete(id);
          // ★ onChangeError BEFORE revert, so a revert that throws (calendar already destroyed)
          //   cannot swallow the host's error callback.
          onChangeError?.(err, change);
          if (!mounted.current) return;
          setError(`Could not save "${change.event.title}": ${describe(err)}`);
          if (!current) return; // a newer move of this event owns its position now
          setPending((prev) => {
            if (!prev.has(id)) return prev;
            const next = new Map(prev);
            next.delete(id);
            return next;
          });
          try {
            info.revert();
          } catch {
            /* the calendar was torn down under us; nothing left to put back */
          }
        };

        // ★ Registered BEFORE the handler runs: a synchronous throw calls `fail`, which asks "am I
        //   the current change?" — registering after the call answered "no" and skipped the
        //   revert (caught by the sync-throw test).
        latest.current.set(id, token);
        let result: void | Promise<void>;
        try {
          result = onEventChange(change);
        } catch (err) {
          // A handler that throws synchronously is a failed save, not an unhandled error that
          // leaves the event where it was dropped.
          fail(err);
          return;
        }
        if (!result || typeof (result as Promise<void>).then !== 'function') {
          // Fire-and-forget handler: nothing to hold; the host owns the position from here.
          if (latest.current.get(id) === token) latest.current.delete(id);
          return;
        }

        setPending((prev) => new Map(prev).set(id, { start: change.start, end: change.end, allDay: change.allDay, token }));
        (result as Promise<void>).then(
          () => {
            if (!mounted.current || latest.current.get(id) !== token) return;
            const savedWith = eventsRef.current;
            setPending((prev) => {
              const p = prev.get(id);
              if (!p || p.token !== token) return prev;
              return new Map(prev).set(id, { ...p, savedWith });
            });
          },
          fail
        );
      },
    [onEventChange, onChangeError, zoneRef]
  );

  return { pending, error, dismissError: React.useCallback(() => setError(null), []), handleChange };
}
