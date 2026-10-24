import { vi } from 'vitest';
import { DateTimeBehavior as B } from './dates';
import { createPullSource, type PullQuery } from './pull';
import { RANGE, ROWS } from '../__tests__/webapi-fixture';
import { pacific2026 } from '../__tests__/zones';

const map = { start: 'dvk_start', end: 'dvk_end', title: 'dvk_name', group: '_dvk_locationid_value' };

describe('createPullSource', () => {
  it('sends select / range filter ANDed with the caller filter / start order, and maps rows', async () => {
    const seen: PullQuery[] = [];
    const src = createPullSource({
      idColumn: 'dvk_slotid',
      map,
      zone: pacific2026,
      behaviors: { dvk_start: B.UserLocal, dvk_end: B.UserLocal },
      filter: 'statuscode eq 1',
      query: async (q) => (seen.push(q), [ROWS[0]]),
    });
    const events = await src.load(RANGE);
    expect(seen).toHaveLength(1);
    expect(seen[0].select).toEqual(['dvk_slotid', 'dvk_start', 'dvk_end', 'dvk_name', '_dvk_locationid_value']);
    expect(seen[0].filter.startsWith('(statuscode eq 1) and (dvk_start lt ')).toBe(true);
    expect(seen[0].orderBy).toBe('dvk_start asc');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ id: 'a1', title: 'Consult', start: '2026-09-28T16:00:00.000Z', resourceId: 'North clinic' });
  });

  it('DateOnly from the Web API is a BARE date and stays that day in every process zone', async () => {
    const src = createPullSource({
      idColumn: 'dvk_slotid',
      map: { start: 'dvk_day', end: 'dvk_dayend', title: 'dvk_name' },
      zone: pacific2026,
      behaviors: { dvk_day: B.DateOnly, dvk_dayend: B.DateOnly },
      query: async () => [ROWS[1]],
    });
    const [e] = await src.load(RANGE);
    expect(e.start).toBe('2026-09-29');
    expect(e.end).toBe('2026-09-30'); // inclusive → exclusive
  });

  it('TZI: the face value, not shifted by the zone', async () => {
    const src = createPullSource({
      idColumn: 'dvk_slotid',
      map: { start: 'dvk_tzi', title: 'dvk_name' },
      zone: pacific2026,
      behaviors: { dvk_tzi: B.TimeZoneIndependent },
      query: async () => [ROWS[2]],
    });
    expect((await src.load(RANGE))[0].start).toBe('2026-09-30T09:00:00');
  });

  it('reports date columns with NO configured behaviour in `guessed`', () => {
    const src = createPullSource({ idColumn: 'id', map, behaviors: { dvk_start: B.UserLocal }, query: async () => [] });
    expect(src.guessed).toEqual(['dvk_end']);
  });

  it('a bad row is skipped and reported; a row without an id is skipped', async () => {
    const onInvalid = vi.fn();
    const src = createPullSource({
      idColumn: 'dvk_slotid',
      map,
      zone: pacific2026,
      onInvalid,
      query: async () => [ROWS[0], { dvk_slotid: 'bad', dvk_start: 'not a date' }, { dvk_start: '2026-09-28T16:00:00Z' }],
    });
    const events = await src.load(RANGE);
    expect(events.map((e) => e.id)).toEqual(['a1']);
    expect(onInvalid).toHaveBeenCalledTimes(1);
    expect(onInvalid.mock.calls[0][0]).toBe('bad');
  });

  it('read-only unless `update` is given; the patch is the Web API write shape', async () => {
    expect(createPullSource({ idColumn: 'id', map, query: async () => [] }).capabilities).toEqual({ update: false, create: false, open: false });
    const update = vi.fn(async () => {});
    const src = createPullSource({ idColumn: 'id', map, zone: pacific2026, behaviors: { dvk_start: B.UserLocal, dvk_end: B.UserLocal }, query: async () => [], update });
    expect(src.capabilities.update).toBe(true);
    await src.update!({ event: { id: 'a1', title: 't', start: '2026-09-28T16:00:00.000Z' }, kind: 'move', start: '2026-09-29T16:00:00.000Z', end: '2026-09-29T17:00:00.000Z', allDay: false });
    expect(update).toHaveBeenCalledWith('a1', { dvk_start: '2026-09-29T16:00:00.000Z', dvk_end: '2026-09-29T17:00:00.000Z' });
  });
});
