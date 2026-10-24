import { DateTimeBehavior as B } from './dates';
import { andFilters, buildODataRangeFilter, selectFor, webApiRowAccessor } from './odata';
import { RANGE, ROWS } from '../__tests__/webapi-fixture';
import { pacific2026, tokyo } from '../__tests__/zones';

describe('buildODataRangeFilter', () => {
  it('UserLocal: the range INSTANTS, with the overlap rule (an event begun before the week is kept)', () => {
    expect(buildODataRangeFilter(RANGE, { start: 's', end: 'e' }, {}, pacific2026)).toBe(
      's lt 2026-10-05T07:00:00.000Z and (e ge 2026-09-28T07:00:00.000Z or s ge 2026-09-28T07:00:00.000Z)'
    );
  });

  it('DateOnly: the range DAYS — never an instant, which a date column cannot compare', () => {
    expect(buildODataRangeFilter(RANGE, { start: 's', end: 'e' }, { s: B.DateOnly, e: B.DateOnly }, pacific2026)).toBe(
      's lt 2026-10-05 and (e ge 2026-09-28 or s ge 2026-09-28)'
    );
  });

  it('TZI: the wall clock in the calendar zone, written the way a TZI write is (+Z)', () => {
    // 07:00Z is 00:00 PDT — so the face value is midnight, not 07:00.
    expect(buildODataRangeFilter(RANGE, { start: 's' }, { s: B.TimeZoneIndependent }, pacific2026)).toBe(
      's lt 2026-10-05T00:00:00Z and s ge 2026-09-28T00:00:00Z'
    );
  });

  it('DateOnly east of UTC: still the calendar DAYS, not the UTC date of the first instant (MEASURED)', () => {
    // Tokyo week: Mon 28 Sep 00:00 JST = 27 Sep 15:00Z. An instant literal here filtered by the
    // UTC date on the org — the 27th was included and the 4th dropped.
    const east = { start: '2026-09-27T15:00:00.000Z', end: '2026-10-04T15:00:00.000Z', view: 'timeGridWeek', startDate: '2026-09-28', endDate: '2026-10-05' };
    expect(buildODataRangeFilter(east, { start: 's' }, { s: B.DateOnly }, tokyo)).toBe('s lt 2026-10-05 and s ge 2026-09-28');
  });

  it('mixed: each column gets ITS OWN behaviour', () => {
    const f = buildODataRangeFilter(RANGE, { start: 's', end: 'e' }, { e: B.DateOnly }, pacific2026);
    expect(f).toBe('s lt 2026-10-05T07:00:00.000Z and (e ge 2026-09-28 or s ge 2026-09-28T07:00:00.000Z)');
  });
});

describe('andFilters', () => {
  it('parenthesises every part — an `or` in the caller filter must not escape into the range', () => {
    expect(andFilters('a eq 1 or b eq 2', 'x lt 3')).toBe('(a eq 1 or b eq 2) and (x lt 3)');
  });
  it('drops empties; a single part is left alone', () => {
    expect(andFilters(undefined, '  ', 'x lt 3')).toBe('x lt 3');
    expect(andFilters()).toBe('');
  });
});

describe('selectFor', () => {
  it('id first, every mapped column once', () => {
    expect(selectFor({ start: 's', end: 'e', title: 't', group: 's' }, 'id')).toEqual(['id', 's', 'e', 't']);
  });
});

describe('webApiRowAccessor', () => {
  const r = webApiRowAccessor(ROWS[0], 'a1');
  it('formatted value from the annotation — the LABEL, not the GUID', () => {
    expect(r.formatted('_dvk_locationid_value')).toBe('North clinic');
    expect(r.formatted('statuscode')).toBe('Open');
  });
  it('without an annotation, the raw value as text — never silently empty', () => {
    expect(r.formatted('dvk_name')).toBe('Consult');
    expect(webApiRowAccessor({ n: 3 }, 'x').formatted('n')).toBe('3');
  });
  it('absent is null / empty', () => {
    expect(r.value('nope')).toBeNull();
    expect(r.formatted('nope')).toBe('');
  });
});
