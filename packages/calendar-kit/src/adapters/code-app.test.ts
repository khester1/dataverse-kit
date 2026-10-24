import { vi } from 'vitest';
import { DateTimeBehavior as B } from '../dataverse/dates';
import { createCodeAppSource, type GetAllOptions } from './code-app';
import { RANGE, ROWS } from '../__tests__/webapi-fixture';
import { pacific2026 } from '../__tests__/zones';

const map = { start: 'dvk_start', end: 'dvk_end', title: 'dvk_name' };
const behaviors = { dvk_start: B.UserLocal, dvk_end: B.UserLocal };
const row = (i: number) => ({ ...ROWS[0], dvk_slotid: `r${i}` });

describe('createCodeAppSource', () => {
  it('calls getAll with the generated service option names (select[], filter, orderBy[], maxPageSize)', async () => {
    const calls: GetAllOptions[] = [];
    const src = createCodeAppSource({
      service: { getAll: async (o) => (calls.push(o!), { data: [ROWS[0]] }) },
      idColumn: 'dvk_slotid', map, behaviors, zone: pacific2026,
    });
    expect(await src.load(RANGE)).toHaveLength(1);
    expect(calls).toHaveLength(1);
    expect(calls[0].select).toEqual(['dvk_slotid', 'dvk_start', 'dvk_end', 'dvk_name']);
    expect(calls[0].orderBy).toEqual(['dvk_start asc']);
    expect(calls[0].filter).toContain('dvk_start lt 2026-10-05T07:00:00.000Z');
    expect(calls[0]).not.toHaveProperty('skipToken');
  });

  it('follows skipToken, passing it back, and stops when absent', async () => {
    const tokens: (string | undefined)[] = [];
    const pages = [{ data: [row(1)], skipToken: 'p2' }, { data: [row(2)], skipToken: 'p3' }, { data: [row(3)] }];
    const src = createCodeAppSource({
      service: { getAll: async (o) => (tokens.push(o?.skipToken), pages[tokens.length - 1]) },
      idColumn: 'dvk_slotid', map, behaviors, zone: pacific2026,
    });
    expect((await src.load(RANGE)).map((e) => e.id)).toEqual(['r1', 'r2', 'r3']);
    expect(tokens).toEqual([undefined, 'p2', 'p3']);
  });

  it('is BOUNDED: a connector that always returns a token stops at maxRows', async () => {
    let n = 0;
    const src = createCodeAppSource({
      service: { getAll: async () => ({ data: [row(++n), row(++n)], skipToken: 'again' }) },
      idColumn: 'dvk_slotid', map, behaviors, zone: pacific2026, maxRows: 5,
    });
    expect(await src.load(RANGE)).toHaveLength(5);
    expect(n).toBe(6); // three calls, not fifty
  });

  it('an error ENVELOPE rejects the load — an empty week would read as "no appointments"', async () => {
    const src = createCodeAppSource({
      service: { getAll: async () => ({ error: { message: 'Principal user is missing prvReadappointment' } }) },
      idColumn: 'dvk_slotid', map, behaviors,
    });
    await expect(src.load(RANGE)).rejects.toThrow('prvReadappointment');
  });

  it('update goes through service.update with the Web API patch; an error envelope rejects (so the drag reverts)', async () => {
    const update = vi.fn(async () => ({ data: {} }));
    const src = createCodeAppSource({ service: { getAll: async () => ({ data: [] }), update }, idColumn: 'dvk_slotid', map, behaviors, zone: pacific2026 });
    const change = { event: { id: 'a1', title: 't', start: '2026-09-28T16:00:00.000Z' }, kind: 'move' as const, start: '2026-09-29T16:00:00.000Z', end: '2026-09-29T17:00:00.000Z', allDay: false };
    await src.update!(change);
    expect(update).toHaveBeenCalledWith('a1', { dvk_start: '2026-09-29T16:00:00.000Z', dvk_end: '2026-09-29T17:00:00.000Z' });
    update.mockResolvedValueOnce({ error: { message: 'locked' } } as never);
    await expect(src.update!(change)).rejects.toThrow('locked');
  });

  it('capabilities follow what was given; editable:false turns update off', () => {
    const svc = { getAll: async () => ({ data: [] }), update: async () => ({}) };
    expect(createCodeAppSource({ service: svc, idColumn: 'id', map }).capabilities.update).toBe(true);
    expect(createCodeAppSource({ service: svc, idColumn: 'id', map, editable: false }).capabilities.update).toBe(false);
    expect(createCodeAppSource({ service: { getAll: svc.getAll }, idColumn: 'id', map }).capabilities.update).toBe(false);
  });

  it('an aborted load stops paging', async () => {
    const ac = new AbortController();
    let calls = 0;
    const src = createCodeAppSource({
      service: { getAll: async () => (calls++, ac.abort(), { data: [row(calls)], skipToken: 'more' }) },
      idColumn: 'dvk_slotid', map, behaviors,
    });
    await expect(src.load(RANGE, ac.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(calls).toBe(1);
  });
});
