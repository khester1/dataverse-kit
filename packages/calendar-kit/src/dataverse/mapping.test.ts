import { DateTimeBehavior as B } from './dates';
import { mapRecordToEvent, readYesNo, toQuickCreateParameters, toWebApiPatch, type ColumnMap } from './mapping';
import { ROWS } from '../__tests__/dataset-fixture';
import { pacific2026, tokyo } from '../__tests__/zones';

const rec = (id: keyof typeof ROWS) => ({
  id,
  value: (c: string) => ROWS[id][c]?.[0] ?? null,
  formatted: (c: string) => ROWS[id][c]?.[1] ?? '',
});

const behaviors = {
  dvk_startlocal: B.UserLocal,
  dvk_endlocal: B.UserLocal,
  dvk_daystart: B.DateOnly,
  dvk_dayend: B.DateOnly,
  dvk_tzistart: B.TimeZoneIndependent,
  dvk_tziend: B.TimeZoneIndependent,
};
const opts = { behaviors, zone: pacific2026 };

describe('readYesNo', () => {
  it('"0" is FALSE — Boolean("0") is true, which rendered every false row ON in a sibling control', () => {
    expect(readYesNo('0')).toBe(false);
    expect(readYesNo('1')).toBe(true);
    expect(readYesNo(true)).toBe(true);
    expect(readYesNo(null)).toBe(false);
  });
});

describe('mapRecordToEvent', () => {
  it('UserLocal: instants, untouched', () => {
    const e = mapRecordToEvent(rec('B'), { start: 'dvk_startlocal', end: 'dvk_endlocal', title: 'dvk_name' }, opts);
    expect(e).toMatchObject({ id: 'B', start: '2026-09-30T06:30:00.000Z', end: '2026-09-30T07:30:00.000Z', allDay: false, title: 'B Tue 23:30 PDT' });
  });

  it('DateOnly: all-day, and the inclusive Dataverse end becomes EXCLUSIVE', () => {
    const b = mapRecordToEvent(rec('B'), { start: 'dvk_daystart', end: 'dvk_dayend' }, opts);
    expect(b).toMatchObject({ start: '2026-09-29', end: '2026-09-30', allDay: true });
    const d = mapRecordToEvent(rec('D'), { start: 'dvk_daystart', end: 'dvk_dayend' }, opts);
    expect(d).toMatchObject({ start: '2026-10-01', end: '2026-10-03' }); // Thu + Fri shown
  });

  it('TZI: floating wall clock, identical in every zone', () => {
    const map: ColumnMap = { start: 'dvk_tzistart', end: 'dvk_tziend' };
    const p = mapRecordToEvent(rec('B'), map, opts);
    const t = mapRecordToEvent(rec('B'), map, { behaviors, zone: tokyo });
    expect(p).toMatchObject({ start: '2026-09-29T23:30:00', end: '2026-09-30T00:30:00' });
    expect(t?.start).toBe(p?.start);
  });

  it('★★★ an all-day FLAG on date-time columns: the platform stores UTC MIDNIGHT — read the UTC day (MEASURED, appointment)', () => {
    // A one-day appointment on Oct 1, created through the FORM by a Pacific user, is stored
    // 2026-10-01T00:00:00Z → 2026-10-02T00:00:00Z. Reading it in the user zone drew it on
    // Wed 30 AND Thu 1 on the org. It is Oct 1 in EVERY zone.
    const appt = {
      id: 'appt',
      value: (c: string) => ({ s: '2026-10-01T00:00:00Z', e: '2026-10-02T00:00:00Z', ad: '1' } as Record<string, unknown>)[c] ?? null,
      formatted: () => '',
    };
    for (const zone of [pacific2026, tokyo]) {
      expect(mapRecordToEvent(appt, { start: 's', end: 'e', allDay: 'ad' }, { behaviors: {}, zone })).toMatchObject({
        start: '2026-10-01',
        end: '2026-10-02',
        allDay: true,
      });
    }
  });

  it('a flagged all-day move is WRITTEN at UTC midnight, end exclusive (the stored shape above)', () => {
    const ev = { id: 'appt', title: 'a', start: '2026-10-01' };
    expect(
      toWebApiPatch({ event: ev, kind: 'move', start: '2026-10-03', end: '2026-10-04', allDay: true }, { start: 's', end: 'e', allDay: 'ad' }, { behaviors: {}, zone: pacific2026 })
    ).toEqual({ s: '2026-10-03T00:00:00Z', e: '2026-10-04T00:00:00Z' });
  });

  it('the "0" all-day flag leaves the event timed', () => {
    const e = mapRecordToEvent(rec('A'), { start: 'dvk_startlocal', allDay: 'dvk_allday' }, opts);
    expect(e?.allDay).toBe(false);
  });

  it('no start → no event', () => {
    expect(mapRecordToEvent(rec('NOSTART'), { start: 'dvk_startlocal' }, opts)).toBeNull();
  });

  it('group → resourceId (the label) and a group colour; an explicit colorOf wins', () => {
    const g = mapRecordToEvent(rec('A'), { start: 'dvk_startlocal', group: 'dvk_location' }, opts);
    expect(g?.resourceId).toBe('North clinic');
    expect(g?.color).toMatch(/^#[0-9a-f]{6}$/);
    const c = mapRecordToEvent(rec('A'), { start: 'dvk_startlocal', color: 'dvk_location' }, { ...opts, colorOf: () => '#123456' });
    expect(c?.color).toBe('#123456');
  });

  it('a missing title reads "(untitled)" rather than rendering an empty block', () => {
    expect(mapRecordToEvent(rec('A'), { start: 'dvk_startlocal' }, opts)?.title).toBe('(untitled)');
  });
});

describe('toWebApiPatch — writes only mapped columns, in the MEASURED shapes', () => {
  const ev = { id: 'A', title: 'A', start: 'x' };
  it('UserLocal move', () => {
    const patch = toWebApiPatch(
      { event: ev, kind: 'move', start: '2026-09-28T18:00:00.000Z', end: '2026-09-28T19:00:00.000Z', allDay: false },
      { start: 'dvk_startlocal', end: 'dvk_endlocal', title: 'dvk_name' },
      opts
    );
    expect(patch).toEqual({ dvk_startlocal: '2026-09-28T18:00:00.000Z', dvk_endlocal: '2026-09-28T19:00:00.000Z' });
  });
  it('DateOnly move: exclusive end back to INCLUSIVE (measured: Sat 10/3 stored as 2026-10-03)', () => {
    const patch = toWebApiPatch(
      { event: ev, kind: 'move', start: '2026-10-03', end: '2026-10-04', allDay: true },
      { start: 'dvk_daystart', end: 'dvk_dayend' },
      opts
    );
    expect(patch).toEqual({ dvk_daystart: '2026-10-03', dvk_dayend: '2026-10-03' });
  });
  it('TZI resize: wall clock + Z (measured: stored 13:00Z–15:00Z = Tue 1–3 PM)', () => {
    const patch = toWebApiPatch(
      { event: ev, kind: 'resize', start: '2026-09-29T13:00:00', end: '2026-09-29T15:00:00', allDay: false },
      { start: 'dvk_tzistart', end: 'dvk_tziend' },
      opts
    );
    expect(patch).toEqual({ dvk_tzistart: '2026-09-29T13:00:00Z', dvk_tziend: '2026-09-29T15:00:00Z' });
  });
});

describe('toQuickCreateParameters — the prefill that the reference control got wrong', () => {
  it('a timed selection (Wed 8:00–8:30 Pacific) prefills every behaviour correctly', () => {
    const sel = { start: '2026-09-30T15:00:00.000Z', end: '2026-09-30T15:30:00.000Z', allDay: false };
    expect(toQuickCreateParameters(sel, { start: 'dvk_startlocal', end: 'dvk_endlocal' }, opts)).toEqual({
      dvk_startlocal: '2026-09-30T08:00:00',
      dvk_endlocal: '2026-09-30T08:30:00',
    });
    // MEASURED: before this rule the DateOnly column stored 09-29 and TZI stored 01:00.
    expect(toQuickCreateParameters(sel, { start: 'dvk_daystart' }, opts)).toEqual({ dvk_daystart: '2026-09-30T00:00:00' });
    expect(toQuickCreateParameters(sel, { start: 'dvk_tzistart' }, opts)).toEqual({ dvk_tzistart: '2026-09-30T08:00:00' });
  });
  it('an all-day selection: inclusive DateOnly end, all-day flag set, extra params underneath', () => {
    const sel = { start: '2026-10-01', end: '2026-10-03', allDay: true };
    expect(
      toQuickCreateParameters(sel, { start: 'dvk_daystart', end: 'dvk_dayend', allDay: 'dvk_allday' }, opts, {
        dvk_parentid: { id: 'p', entityType: 'account' },
      })
    ).toEqual({
      dvk_parentid: { id: 'p', entityType: 'account' },
      dvk_daystart: '2026-10-01T00:00:00',
      dvk_dayend: '2026-10-02T00:00:00',
      dvk_allday: true,
    });
  });
});
