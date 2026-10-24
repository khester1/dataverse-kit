import type { AgentMessage } from './protocol';

/**
 * A day divider as a DESCRIPTOR, never a localised string.
 *
 * ★ A pure-TS module that returned "Yesterday" could not be localised by the host and could
 *   not be tested deterministically. The React layer maps this through `Intl.DateTimeFormat`.
 */
export type DayDividerLabel =
  | { kind: 'today' }
  | { kind: 'yesterday' }
  | { kind: 'weekday'; weekday: number; iso: string }
  | { kind: 'date'; iso: string };

export interface DayBucket {
  /** `YYYY-MM-DD` in the resolved zone. */
  dayKey: string;
  label: DayDividerLabel;
  messageIds: string[];
}

/** Local calendar day in `timeZone`. `en-CA` because it formats as `YYYY-MM-DD`. */
export function dayKeyOf(epochMs: number, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(epochMs));
}

const DAY_MS = 24 * 60 * 60 * 1000;

function labelFor(dayKey: string, nowMs: number, timeZone?: string): DayDividerLabel {
  const todayKey = dayKeyOf(nowMs, timeZone);
  if (dayKey === todayKey) return { kind: 'today' };
  if (dayKey === dayKeyOf(nowMs - DAY_MS, timeZone)) return { kind: 'yesterday' };

  // Within the last week, Teams shows the weekday name.
  const asDate = new Date(`${dayKey}T00:00:00Z`);
  for (let back = 2; back <= 6; back++) {
    if (dayKey === dayKeyOf(nowMs - back * DAY_MS, timeZone)) {
      return { kind: 'weekday', weekday: asDate.getUTCDay(), iso: dayKey };
    }
  }
  return { kind: 'date', iso: dayKey };
}

/**
 * Bucket messages by local calendar day.
 *
 * ★ `now` and `timeZone` are INJECTED, not read from the environment. That is what makes
 *   the claim expressible at all: the test that separates a correct implementation from a
 *   naive `new Date().toDateString()` is the one that feeds the SAME epoch with two zones
 *   either side of the date line and asserts the keys DIFFER. A UTC-only test passes for
 *   both.
 */
export function bucketByDay(
  messages: readonly AgentMessage[],
  options: { timeZone?: string; now?: number } = {},
): DayBucket[] {
  const nowMs = options.now ?? Date.now();
  const buckets: DayBucket[] = [];

  for (const message of messages) {
    const key = dayKeyOf(message.createdAt, options.timeZone);
    const current = buckets[buckets.length - 1];
    if (current && current.dayKey === key) {
      current.messageIds.push(message.id);
      continue;
    }
    buckets.push({
      dayKey: key,
      label: labelFor(key, nowMs, options.timeZone),
      messageIds: [message.id],
    });
  }
  return buckets;
}
