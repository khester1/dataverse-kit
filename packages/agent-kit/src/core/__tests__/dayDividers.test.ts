import { describe, it, expect } from 'vitest';
import { bucketByDay, dayKeyOf } from '../dayDividers';
import { msg, T0 } from './testData';

describe('dayKeyOf', () => {
  // ★★ THE ROW THAT SEPARATES A CORRECT IMPLEMENTATION FROM A NAIVE ONE.
  //    The SAME instant falls on different calendar days either side of the date line. A
  //    `new Date().toDateString()` implementation passes any UTC-only test and fails here.
  it('resolves the same instant to different days in different zones', () => {
    const instant = Date.UTC(2026, 2, 12, 11, 0, 0);
    const kiritimati = dayKeyOf(instant, 'Pacific/Kiritimati'); // UTC+14
    const niue = dayKeyOf(instant, 'Pacific/Niue'); // UTC-11
    expect(kiritimati).not.toBe(niue);
    expect(kiritimati).toBe('2026-03-13');
    expect(niue).toBe('2026-03-12');
  });

  it('formats as YYYY-MM-DD', () => {
    expect(dayKeyOf(T0, 'UTC')).toBe('2026-03-12');
  });
});

describe('bucketByDay', () => {
  const now = Date.UTC(2026, 2, 12, 20, 0, 0); // 2026-03-12

  it('labels today, yesterday, a weekday and an older date', () => {
    const buckets = bucketByDay(
      [
        msg({ id: 'old', createdAt: Date.UTC(2026, 1, 1, 9) }),
        msg({ id: 'wk', createdAt: Date.UTC(2026, 2, 9, 9) }), // 3 days back
        msg({ id: 'y', createdAt: Date.UTC(2026, 2, 11, 9) }),
        msg({ id: 't1', createdAt: Date.UTC(2026, 2, 12, 9) }),
        msg({ id: 't2', createdAt: Date.UTC(2026, 2, 12, 10) }),
      ],
      { timeZone: 'UTC', now },
    );

    expect(buckets.map((b) => b.label.kind)).toEqual(['date', 'weekday', 'yesterday', 'today']);
    expect(buckets.map((b) => b.messageIds)).toEqual([['old'], ['wk'], ['y'], ['t1', 't2']]);
  });

  it('returns a descriptor, never a localised string', () => {
    const [bucket] = bucketByDay([msg({ id: 'a', createdAt: now })], { timeZone: 'UTC', now });
    // A string here could not be localised by the host and could not be asserted
    // deterministically across CI locales.
    expect(typeof bucket.label).toBe('object');
    expect(bucket.label).toEqual({ kind: 'today' });
  });
});
