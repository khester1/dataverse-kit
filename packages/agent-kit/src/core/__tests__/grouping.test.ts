import { describe, it, expect } from 'vitest';
import { groupMessages, isSameAuthorRun, DEFAULT_GROUP_WINDOW_MS } from '../grouping';
import { msg, T0, MIN } from './testData';

describe('isSameAuthorRun', () => {
  // ★ The predicate is asserted DIRECTLY, not inferred from a group count. An off-by-one in
  //   the window and a correct implementation can produce the same number of groups for
  //   different reasons; only the boundary rows separate them.
  it('groups at 4:59 and at exactly 5:00, but not at 5:01', () => {
    const a = msg({ id: 'a', createdAt: T0 });
    expect(isSameAuthorRun(a, msg({ id: 'b', createdAt: T0 + 4 * MIN + 59_000 }))).toBe(true);
    expect(isSameAuthorRun(a, msg({ id: 'c', createdAt: T0 + DEFAULT_GROUP_WINDOW_MS }))).toBe(true);
    expect(isSameAuthorRun(a, msg({ id: 'd', createdAt: T0 + DEFAULT_GROUP_WINDOW_MS + 1 }))).toBe(false);
  });

  it('never groups different authors, even in the same second', () => {
    const a = msg({ id: 'a', authorId: 'u1' });
    expect(isSameAuthorRun(a, msg({ id: 'b', authorId: 'agent', createdAt: T0 }))).toBe(false);
  });

  it('never groups across a system message', () => {
    const a = msg({ id: 'a', role: 'system', authorId: 'sys' });
    expect(isSameAuthorRun(a, msg({ id: 'b', role: 'system', authorId: 'sys' }))).toBe(false);
  });

  it('never groups across a day boundary, even inside the window', () => {
    // 23:58 and 00:01 UTC are three minutes apart and on different days.
    const late = msg({ id: 'a', createdAt: Date.UTC(2026, 2, 12, 23, 58) });
    const early = msg({ id: 'b', createdAt: Date.UTC(2026, 2, 13, 0, 1) });
    expect(early.createdAt - late.createdAt).toBeLessThan(DEFAULT_GROUP_WINDOW_MS);
    expect(isSameAuthorRun(late, early, DEFAULT_GROUP_WINDOW_MS, 'UTC')).toBe(false);
  });
});

describe('groupMessages', () => {
  it('collapses a run and starts a new one on author change', () => {
    const messages = [
      msg({ id: 'a', authorId: 'u1', createdAt: T0 }),
      msg({ id: 'b', authorId: 'u1', createdAt: T0 + MIN }),
      msg({ id: 'c', authorId: 'u1', createdAt: T0 + 2 * MIN }),
      msg({ id: 'd', authorId: 'agent', role: 'assistant', createdAt: T0 + 3 * MIN }),
      msg({ id: 'e', authorId: 'u1', createdAt: T0 + 4 * MIN }),
      // outside the window from 'e' -> its own run
      msg({ id: 'f', authorId: 'u1', createdAt: T0 + 40 * MIN }),
    ];
    const groups = groupMessages(messages, { timeZone: 'UTC' });

    // ★ The fixture deliberately contains a 3-run, an alternation AND an out-of-window pair.
    //   A fixture where no two consecutive messages share an author makes k = 0, and a
    //   renderer that draws an avatar on every message would pass.
    expect(groups.map((g) => g.messageIds)).toEqual([
      ['a', 'b', 'c'],
      ['d'],
      ['e'],
      ['f'],
    ]);
    expect(groups).toHaveLength(4);
    // 6 messages, 4 runs -> exactly 2 avatars suppressed. 0 < 2 < 6.
    const suppressed = messages.length - groups.length;
    expect(suppressed).toBe(2);
    expect(suppressed).toBeGreaterThan(0);
    expect(suppressed).toBeLessThan(messages.length);
  });

  it('returns no groups for no messages', () => {
    expect(groupMessages([])).toEqual([]);
  });
});
