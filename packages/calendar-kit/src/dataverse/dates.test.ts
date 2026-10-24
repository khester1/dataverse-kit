import {
  DateTimeBehavior as B,
  behaviorOf,
  readDataverseDate,
  toFormParameterDate,
  toWebApiDate,
} from './dates';
import { pacific2026, tokyo } from '../__tests__/zones';

/**
 * ★ Every raw input and every expected output below was READ OFF A LIVE ORG (orge2e285aa,
 *   2026-09-26, Pacific user) — the raw strings from dataset `getValue()`, the stored values from
 *   the Web API after the write. They are the fixtures because a fixture tidier than the platform
 *   measures a data source that does not exist.
 */
describe('behaviorOf', () => {
  it('reads PCF getEntityMetadata (Behavior 1/2/3, measured)', () => {
    expect(behaviorOf({ Behavior: 1 })).toBe(B.UserLocal);
    expect(behaviorOf({ Behavior: 2 })).toBe(B.DateOnly);
    expect(behaviorOf({ Behavior: 3 })).toBe(B.TimeZoneIndependent);
  });
  it('reads Web API EntityDefinitions ({ Value: name })', () => {
    expect(behaviorOf({ DateTimeBehavior: { Value: 'TimeZoneIndependent' } })).toBe(B.TimeZoneIndependent);
    expect(behaviorOf({ DateTimeBehavior: { Value: 'DateOnly' } })).toBe(B.DateOnly);
  });
  it('without metadata: DateOnly by dataType, and a TZI column is INDISTINGUISHABLE (→ UserLocal)', () => {
    expect(behaviorOf(undefined, 'DateAndTime.DateOnly')).toBe(B.DateOnly);
    expect(behaviorOf(undefined, 'DateAndTime.DateAndTime')).toBe(B.UserLocal);
  });
});

describe('readDataverseDate — dataset getValue() is an ISO STRING for all three', () => {
  it('UserLocal: an instant', () => {
    expect(readDataverseDate('2026-09-30T06:30:00.000Z', B.UserLocal)).toBe('2026-09-30T06:30:00.000Z');
  });
  it('DateOnly: UTC midnight → the day itself, NOT the previous day', () => {
    expect(readDataverseDate('2026-09-29T00:00:00.000Z', B.DateOnly)).toBe('2026-09-29');
    // Web API shape of the same column:
    expect(readDataverseDate('2026-09-29', B.DateOnly)).toBe('2026-09-29');
  });
  it('the naive reading this replaces IS off by one west of UTC (documents the defect)', () => {
    const naive = new Date('2026-09-29T00:00:00.000Z');
    const localDay = `${naive.getFullYear()}-${String(naive.getMonth() + 1).padStart(2, '0')}-${String(naive.getDate()).padStart(2, '0')}`;
    // Under TZ=America/Los_Angeles this is 2026-09-28; the kit's reading never is.
    if (process.env.TZ === 'America/Los_Angeles') expect(localDay).toBe('2026-09-28');
  });
  it('TZI: the digits are the face value; the Z is ignored', () => {
    expect(readDataverseDate('2026-09-29T23:30:00.000Z', B.TimeZoneIndependent)).toBe('2026-09-29T23:30:00');
  });
  it('TZI without seconds or with an explicit offset still reads the face value', () => {
    expect(readDataverseDate('2026-09-29T23:30Z', B.TimeZoneIndependent)).toBe('2026-09-29T23:30:00');
    expect(readDataverseDate('2026-09-29T23:30:00+00:00', B.TimeZoneIndependent)).toBe('2026-09-29T23:30:00');
  });
  it('empty values are null, and a Date is read through its UTC fields', () => {
    expect(readDataverseDate(null, B.UserLocal)).toBeNull();
    expect(readDataverseDate('', B.DateOnly)).toBeNull();
    expect(readDataverseDate(new Date(Date.UTC(2026, 8, 29)), B.DateOnly)).toBe('2026-09-29');
  });
});

describe('toWebApiDate — what a drag must SEND (measured: all three stored correctly)', () => {
  it('UserLocal: the instant', () => {
    expect(toWebApiDate('2026-09-28T18:00:00.000Z', B.UserLocal, pacific2026)).toBe('2026-09-28T18:00:00.000Z');
  });
  it('DateOnly: YYYY-MM-DD', () => {
    expect(toWebApiDate('2026-10-03', B.DateOnly, pacific2026)).toBe('2026-10-03');
  });
  it('TZI: wall clock WITH Z — stored and read back as a 1 PM face value', () => {
    expect(toWebApiDate('2026-09-29T13:00:00', B.TimeZoneIndependent, pacific2026)).toBe('2026-09-29T13:00:00Z');
  });
  it('a value of another kind is converted in the USER zone', () => {
    expect(toWebApiDate('2026-09-29', B.UserLocal, tokyo)).toBe('2026-09-28T15:00:00.000Z');
    expect(toWebApiDate('2026-09-30T06:30:00.000Z', B.DateOnly, pacific2026)).toBe('2026-09-29');
  });
});

describe('toFormParameterDate — what a quick-create PREFILL must send', () => {
  // Measured: every one of these shapes stored the intended value; the commented-out shapes are
  // the ones that did NOT (bare YYYY-MM-DD → previous day; TZI with Z → shifted −7 h).
  it('UserLocal: wall clock in the user zone, no Z', () => {
    expect(toFormParameterDate('2026-09-30T15:00:00.000Z', B.UserLocal, pacific2026)).toBe('2026-09-30T08:00:00');
  });
  it('DateOnly: T00:00:00, no Z — never a bare date', () => {
    expect(toFormParameterDate('2026-09-30', B.DateOnly, pacific2026)).toBe('2026-09-30T00:00:00');
    expect(toFormParameterDate('2026-09-30', B.DateOnly, pacific2026)).not.toBe('2026-09-30');
  });
  it('TZI: wall clock, NO Z', () => {
    expect(toFormParameterDate('2026-09-30T08:00:00', B.TimeZoneIndependent, pacific2026)).toBe('2026-09-30T08:00:00');
    expect(toFormParameterDate('2026-09-30T08:00:00', B.TimeZoneIndependent, pacific2026)).not.toMatch(/Z$/);
  });
  it('the two write paths DISAGREE for TZI — the whole reason there are two functions', () => {
    const v = '2026-09-30T08:00:00';
    expect(toWebApiDate(v, B.TimeZoneIndependent, pacific2026)).not.toBe(toFormParameterDate(v, B.TimeZoneIndependent, pacific2026));
  });
});
