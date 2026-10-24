import { addDays, fromWall, kindOf, toDate, toInstant, toWall, utcFieldsToWall } from './datetime';
import { berlin2026, pacific2026, tokyo } from '../__tests__/zones';

describe('kindOf — the SHAPE of the text is the kind', () => {
  it.each([
    ['2026-09-29', 'date'],
    ['2026-09-29T23:30', 'floating'],
    ['2026-09-29T23:30:00', 'floating'],
    ['2026-09-29T23:30:00.000', 'floating'],
    ['2026-09-30T06:30:00Z', 'instant'],
    ['2026-09-30T06:30:00.000Z', 'instant'],
    ['2026-09-30T15:30:00+09:00', 'instant'],
  ])('%s → %s', (v, k) => expect(kindOf(v)).toBe(k));

  it('a Date is always an instant', () => expect(kindOf(new Date(0))).toBe('instant'));
  it.each(['', '29/09/2026', '2026-9-29', 'tomorrow', '2026-02-31', '2026-02-29', '2026-09-29T24:00', '2026-13-01T10:00:00Z'])(
    'rejects %j',
    (v) => expect(() => kindOf(v)).toThrow(RangeError)
  );
  it('accepts a real leap day', () => expect(kindOf('2028-02-29')).toBe('date'));
  it('rejects an Invalid Date', () => expect(() => kindOf(new Date('nope'))).toThrow(RangeError));
});

describe('toWall / fromWall — the user zone, never the process zone', () => {
  it('shows an instant in the given zone (Tokyo reads it as the NEXT day)', () => {
    // MEASURED on the org: this instant was "9/29 11:30 PM" for a Pacific user and
    // "9/30 3:30 PM" for a Tokyo user.
    expect(toWall('2026-09-30T06:30:00.000Z', pacific2026)).toBe('2026-09-29T23:30:00');
    expect(toWall('2026-09-30T06:30:00.000Z', tokyo)).toBe('2026-09-30T15:30:00');
  });

  it('round-trips an ordinary wall time in both directions', () => {
    for (const wall of ['2026-01-15T09:00:00', '2026-07-15T09:00:00', '2026-12-31T23:59:59']) {
      expect(toWall(fromWall(wall, pacific2026), pacific2026)).toBe(wall);
      expect(toWall(fromWall(wall, tokyo), tokyo)).toBe(wall);
    }
  });

  it('uses the offset IN FORCE at each instant (winter −8 h, summer −7 h)', () => {
    expect(fromWall('2026-01-15T09:00:00', pacific2026)).toBe('2026-01-15T17:00:00.000Z');
    expect(fromWall('2026-07-15T09:00:00', pacific2026)).toBe('2026-07-15T16:00:00.000Z');
  });

  it('spring-forward gap: 02:30 does not exist and is pushed to 03:30 PDT', () => {
    expect(fromWall('2026-03-08T02:30:00', pacific2026)).toBe('2026-03-08T10:30:00.000Z');
    expect(toWall('2026-03-08T10:30:00.000Z', pacific2026)).toBe('2026-03-08T03:30:00');
  });

  it('fall-back overlap: 01:30 exists twice and resolves to the EARLIER (PDT) one', () => {
    expect(fromWall('2026-11-01T01:30:00', pacific2026)).toBe('2026-11-01T08:30:00.000Z');
  });

  it('EAST of UTC too: Berlin fall-back 02:30 resolves to the EARLIER (CEST) one', () => {
    expect(fromWall('2026-10-25T02:30:00', berlin2026)).toBe('2026-10-25T00:30:00.000Z');
  });

  it('EAST of UTC too: Berlin spring gap 02:30 is pushed to 03:30 CEST', () => {
    expect(fromWall('2026-03-29T02:30:00', berlin2026)).toBe('2026-03-29T01:30:00.000Z');
    expect(toWall('2026-03-29T01:30:00.000Z', berlin2026)).toBe('2026-03-29T03:30:00');
  });

  it('round-trips every half hour across both 2026 transitions, in both hemispheres', () => {
    for (const [zone, day] of [[pacific2026, '2026-03-08'], [pacific2026, '2026-11-01'], [berlin2026, '2026-03-29'], [berlin2026, '2026-10-25']] as const) {
      for (let m = 0; m < 24 * 60; m += 30) {
        const wall = `${day}T${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:00`;
        const back = toWall(fromWall(wall, zone), zone);
        // A gap time legitimately comes back one hour later; every other time must be exact.
        if (back !== wall) expect(new Date(`${back}Z`).getTime() - new Date(`${wall}Z`).getTime()).toBe(3_600_000);
      }
    }
  });

  it('both sides of the transition hour are exact', () => {
    expect(fromWall('2026-03-08T01:59:00', pacific2026)).toBe('2026-03-08T09:59:00.000Z');
    expect(fromWall('2026-03-08T03:00:00', pacific2026)).toBe('2026-03-08T10:00:00.000Z');
  });
});

describe('toDate / addDays / toInstant', () => {
  it('the day of an instant depends on the zone', () => {
    expect(toDate('2026-09-30T06:30:00.000Z', pacific2026)).toBe('2026-09-29');
    expect(toDate('2026-09-30T06:30:00.000Z', tokyo)).toBe('2026-09-30');
  });
  it('a floating or date value keeps its own day', () => {
    expect(toDate('2026-09-29T23:30:00', tokyo)).toBe('2026-09-29');
    expect(toDate('2026-09-29', tokyo)).toBe('2026-09-29');
  });
  it('addDays crosses months, years and the spring gap as whole days', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('toInstant canonicalises offsets to Z', () => {
    expect(toInstant('2026-09-30T15:30:00+09:00')).toBe('2026-09-30T06:30:00.000Z');
    expect(() => toInstant('2026-09-30T06:30:00')).toThrow(RangeError);
  });
  it('utcFieldsToWall reads a UTC-as-wall Date', () => {
    expect(utcFieldsToWall(new Date(Date.UTC(2026, 8, 29, 23, 30)))).toBe('2026-09-29T23:30:00');
  });
});
