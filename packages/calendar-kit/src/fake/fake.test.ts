import { createFakeDataSource } from './index';
import type { CalendarEvent } from '../core/types';

/** Runs under all three process zones via `npm test`: the fake must give the same answer in each. */
describe('createFakeDataSource.load', () => {
  const events: CalendarEvent[] = [
    { id: 'floating', title: 'f', start: '2026-09-28T09:00:00', end: '2026-09-28T10:00:00' },
    { id: 'ends-at-range-start', title: 'e', start: '2026-09-26', end: '2026-09-28' },
    { id: 'instant', title: 'i', start: '2026-09-28T23:30:00Z', end: '2026-09-29T00:30:00Z' },
    { id: 'outside', title: 'o', start: '2026-10-05' },
    // ★ Can EXPRESS the defect: 20:00 floating on the 27th is before the range in the source's
    //   zone (UTC), but `new Date('…T20:00:00')` under TZ=America/Los_Angeles is 03:00Z on the
    //   28th — inside. The first fixture had nothing near an edge, so the sabotage stayed green.
    { id: 'floating-late-evening-before', title: 'l', start: '2026-09-27T20:00:00', end: '2026-09-27T21:00:00' },
  ];
  const range = { start: '2026-09-28T00:00:00.000Z', end: '2026-10-05T00:00:00.000Z', startDate: '2026-09-28', endDate: '2026-10-05', view: 'timeGridWeek' };

  it('is independent of the process zone, and exclusive ends do not overlap', async () => {
    const got = await createFakeDataSource(events, { latencyMs: 0 }).load(range);
    expect(got.map((e) => e.id).sort()).toEqual(['floating', 'instant']);
  });
});
