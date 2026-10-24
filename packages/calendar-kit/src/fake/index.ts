import { addDays, fromWall, kindOf, toInstant } from '../core/datetime';
import type { CalendarDataSource, CalendarEvent, CalendarEventChange, ZoneOffset } from '../core/types';
import { groupColor } from '../core/colors';

/**
 * `@dataverse-kit/calendar-kit/fake` — sample events and an in-memory data source, for
 * Storybook, harnesses and tests. Deterministic: the same options give the same calendar.
 */

/** mulberry32 — a 32-bit seeded PRNG. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SampleOptions {
  /** `YYYY-MM-DD` the samples cluster around (±`spanDays`). */
  anchor: string;
  zone: ZoneOffset;
  count?: number;
  spanDays?: number;
  seed?: number;
  groups?: readonly string[];
}

const TITLES = ['Consultation', 'Follow-up', 'Initial assessment', 'Review', 'Team sync', 'Check-in', 'Planning'];
const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * Timed events as INSTANTS (the common case), a few all-day DATES, and one FLOATING event, so
 * every value kind is on screen in a story.
 */
export function createSampleEvents(opts: SampleOptions): CalendarEvent[] {
  const next = rng(opts.seed ?? 42);
  const count = opts.count ?? 40;
  const span = opts.spanDays ?? 21;
  const groups = opts.groups ?? ['North clinic', 'South clinic', 'Remote'];
  const events: CalendarEvent[] = [];
  for (let i = 0; i < count; i++) {
    const day = addDays(opts.anchor, Math.floor(next() * span * 2) - span);
    const group = groups[Math.floor(next() * groups.length)];
    const title = TITLES[Math.floor(next() * TITLES.length)];
    const id = `sample-${i + 1}`;
    if (i % 13 === 0) {
      const len = 1 + Math.floor(next() * 3);
      events.push({ id, title: `${title} (all day)`, start: day, end: addDays(day, len), resourceId: group, color: groupColor(group) });
      continue;
    }
    const hour = 8 + Math.floor(next() * 9);
    const minute = next() < 0.5 ? 0 : 30;
    const mins = [30, 45, 60, 90][Math.floor(next() * 4)];
    const wall = `${day}T${pad(hour)}:${pad(minute)}:00`;
    const start = fromWall(wall, opts.zone);
    const end = new Date(new Date(start).getTime() + mins * 60_000).toISOString();
    events.push({ id, title, start, end, resourceId: group, color: groupColor(group) });
  }
  events.push({
    id: 'sample-floating',
    title: 'Floating 09:00 (same face in every zone)',
    start: `${opts.anchor}T09:00:00`,
    end: `${opts.anchor}T10:00:00`,
    color: '#5c2e91',
  });
  return events;
}

export interface FakeSourceOptions {
  latencyMs?: number;
  /** The zone floating and date values are placed in when filtering by range. Default UTC. */
  zone?: ZoneOffset;
  /** Reject every change for these event ids — to exercise rollback. */
  failIds?: readonly string[];
}

/** A `CalendarDataSource` over an array, mutated in place on successful changes. */
export function createFakeDataSource(events: CalendarEvent[], opts: FakeSourceOptions = {}): CalendarDataSource & {
  events: CalendarEvent[];
} {
  const wait = (): Promise<void> => new Promise((r) => setTimeout(r, opts.latencyMs ?? 300));
  return {
    events,
    capabilities: { update: true, create: false, open: false },
    async load(range) {
      await wait();
      // ★ Every value through the kit's own conversion — never `new Date(text)`, which parses an
      //   offset-less value in the PROCESS zone (a reviewer caught this in the first version).
      const zone = opts.zone ?? (() => 0);
      const ms = (v: string | Date): number => {
        const k = kindOf(v);
        if (k === 'instant') return new Date(toInstant(v)).getTime();
        return new Date(fromWall(k === 'date' ? `${v as string}T00:00:00` : (v as string), zone)).getTime();
      };
      const lo = ms(range.start);
      const hi = ms(range.end);
      return events.filter((e) => {
        const s = ms(e.start);
        const en = e.end !== undefined ? ms(e.end) : s;
        // Overlap: starts before the range ends AND ends after it starts (exclusive ends).
        return s < hi && (e.end !== undefined ? en > lo : s >= lo);
      });
    },
    async update(change: CalendarEventChange) {
      await wait();
      if (opts.failIds?.includes(change.event.id)) throw new Error('Simulated save failure');
      const i = events.findIndex((e) => e.id === change.event.id);
      if (i < 0) throw new Error('The requested record was not found.');
      events[i] = { ...events[i], start: change.start, end: change.end, allDay: change.allDay };
    },
  };
}
