import { describe, it, expect } from 'vitest';
import { evalCondition } from '../core/filter';

/**
 * Date filtering at a timezone where UTC and local CALENDAR DAYS differ. ★ CI runs in UTC, where a
 * UTC-day vs local-day defect cannot fail — so this file is run a SECOND time by the package `test`
 * script under `TZ=Pacific/Kiritimati` (UTC+14), and only does its work there.
 *
 * The rule (what the grid shows): a DATE-ONLY value ("2026-06-15") is that calendar day everywhere; a
 * DATETIME is the viewer's LOCAL day. The shipped v8 compared both by UTC day, so a record at
 * 2026-06-15T14:30Z — shown as Jun 16 in Kiritimati — matched "on Jun 15".
 */
const inKiritimati = process.env.TZ === 'Pacific/Kiritimati';
const c = (operator: 'eq' | 'on-or-after' | 'on-or-before', value: string) => ({ fieldName: 'd', operator, value });

describe.runIf(inKiritimati)('date filters at UTC+14', () => {
  it('instrument: the process really is at UTC+14 (else this file proves nothing)', () => {
    expect(new Date('2026-06-15T00:00:00Z').getTimezoneOffset()).toBe(-840);
  });

  it('a DATETIME is compared by the viewer\'s LOCAL day', () => {
    // 2026-06-15T14:30Z is 2026-06-16 04:30 in Kiritimati — the grid shows Jun 16.
    expect(evalCondition('2026-06-15T14:30:00Z', c('eq', '2026-06-16'))).toBe(true);
    expect(evalCondition('2026-06-15T14:30:00Z', c('eq', '2026-06-15'))).toBe(false);
    expect(evalCondition('2026-06-15T14:30:00Z', c('on-or-after', '2026-06-16'))).toBe(true);
  });

  it('a DATE-ONLY value is that calendar day in every timezone', () => {
    expect(evalCondition('2026-06-15', c('eq', '2026-06-15'))).toBe(true);
    expect(evalCondition('2026-06-15', c('on-or-before', '2026-06-15'))).toBe(true);
    expect(evalCondition('2026-06-15', c('eq', '2026-06-16'))).toBe(false);
  });
});

/**
 * West of UTC the OTHER branch is the one that can fail: `new Date("2026-06-15")` is UTC midnight, which
 * is Jun 14 in Los Angeles — so a date-only value compared via `Date` lands a day early. At UTC+14 that
 * same parse stays on Jun 15, which is why the Kiritimati run alone could not see the date-only rule
 * (review, #450). Both zones run from `scripts/test-tz.mjs`.
 */
const inLosAngeles = process.env.TZ === 'America/Los_Angeles';

describe.runIf(inLosAngeles)('date filters at UTC-7', () => {
  it('instrument: the process really is at UTC-7 in June (else this file proves nothing)', () => {
    expect(new Date('2026-06-15T12:00:00Z').getTimezoneOffset()).toBe(420);
  });

  it('a DATE-ONLY value is that calendar day — not the previous day a UTC-midnight parse gives', () => {
    expect(evalCondition('2026-06-15', c('eq', '2026-06-15'))).toBe(true);
    expect(evalCondition('2026-06-15', c('eq', '2026-06-14'))).toBe(false);
    expect(evalCondition('2026-06-15', c('on-or-after', '2026-06-15'))).toBe(true);
  });

  it('a DATETIME is compared by the viewer\'s LOCAL day', () => {
    // 2026-06-15T02:00Z is 2026-06-14 19:00 in Los Angeles — the grid shows Jun 14.
    expect(evalCondition('2026-06-15T02:00:00Z', c('eq', '2026-06-14'))).toBe(true);
    expect(evalCondition('2026-06-15T02:00:00Z', c('eq', '2026-06-15'))).toBe(false);
  });
});

describe.runIf(!inKiritimati && !inLosAngeles)('date filters (run again under two pinned timezones)', () => {
  it('is skipped here by design — see the package `test` script', () => {
    expect(inKiritimati || inLosAngeles).toBe(false);
  });
});
