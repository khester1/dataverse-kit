import {
  buildRangeFilter,
  isNotFoundError,
  readDatasetEvents,
  resolveBehaviors,
  resolveColumnMap,
} from './pcf-dataset';
import { DateTimeBehavior as B } from '../dataverse/dates';
import { col, makeDataset } from '../__tests__/dataset-fixture';
import { pacific2026 } from '../__tests__/zones';

const columns = [
  col('dvk_startlocal', 'startColumn'),
  col('dvk_endlocal', 'endColumn'),
  col('dvk_name', 'titleColumn', 'SingleLine.Text'),
  col('dvk_location', 'groupColumn', 'Lookup.Simple'),
  col('createdon', 'createdon'),
];

describe('resolveColumnMap — by property-set ALIAS (measured shape)', () => {
  it('maps every bound role and records dataTypes', () => {
    const r = resolveColumnMap(makeDataset(columns));
    expect(r?.map).toEqual({ start: 'dvk_startlocal', end: 'dvk_endlocal', title: 'dvk_name', group: 'dvk_location' });
    expect(r?.dataTypes.dvk_startlocal).toBe('DateAndTime.DateAndTime');
  });
  it('returns null when the start column is unbound — the control shows a binding prompt', () => {
    expect(resolveColumnMap(makeDataset([col('dvk_name', 'titleColumn')]))).toBeNull();
  });
});

describe('resolveBehaviors', () => {
  const resolved = resolveColumnMap(makeDataset(columns))!;
  it('with metadata: exact', () => {
    const r = resolveBehaviors(resolved, () => ({ Behavior: 3 }));
    expect(r.behaviors).toEqual({ dvk_startlocal: B.TimeZoneIndependent, dvk_endlocal: B.TimeZoneIndependent });
    expect(r.unresolved).toEqual([]);
  });
  it('without metadata: date-time columns are GUESSED and REPORTED, DateOnly is not', () => {
    const r = resolveBehaviors(resolved);
    expect(r.unresolved).toEqual(['dvk_startlocal', 'dvk_endlocal']);
    const dateOnly = resolveColumnMap(makeDataset([col('dvk_daystart', 'startColumn', 'DateAndTime.DateOnly')]))!;
    expect(resolveBehaviors(dateOnly).unresolved).toEqual([]);
    expect(resolveBehaviors(dateOnly).behaviors.dvk_daystart).toBe(B.DateOnly);
  });
});

describe('readDatasetEvents', () => {
  const ds = makeDataset(columns);
  const { map } = resolveColumnMap(ds)!;
  const opts = { behaviors: { dvk_startlocal: B.UserLocal, dvk_endlocal: B.UserLocal }, zone: pacific2026 };

  it('one event per record with a start, in dataset order', () => {
    const events = readDatasetEvents(ds, map, opts);
    expect(events.map((e) => e.id)).toEqual(['A', 'B', 'D']); // NOSTART dropped
    expect(events[1]).toMatchObject({ start: '2026-09-30T06:30:00.000Z', title: 'B Tue 23:30 PDT', resourceId: 'South clinic' });
  });
  it('an event with no group gets no resourceId and no invented colour', () => {
    const d = readDatasetEvents(ds, map, opts).find((e) => e.id === 'D');
    expect(d?.resourceId).toBeUndefined();
    expect(d?.color).toBeUndefined();
  });
  it('a withheld (unexposed) column reads as absent, not as a value', () => {
    const narrow = makeDataset([col('dvk_startlocal', 'startColumn')]);
    const [a] = readDatasetEvents(narrow, { start: 'dvk_startlocal', title: 'dvk_name' }, opts);
    expect(a.title).toBe('(untitled)');
  });
  it('one unreadable record is skipped and reported — the other events still render', () => {
    const bad = makeDataset(columns, ['A', 'B']);
    const realB = bad.records.B!;
    (bad.records as Record<string, unknown>).B = { ...realB, getValue: (c: string) => (c === 'dvk_startlocal' ? 'not a date' : realB.getValue(c)) };
    const invalid: string[] = [];
    const events = readDatasetEvents(bad, map, { ...opts, onInvalid: (id) => invalid.push(id) });
    expect(events.map((e) => e.id)).toEqual(['A']);
    expect(invalid).toEqual(['B']);
  });

  it('a loading dataset renders nothing rather than stale rows', () => {
    expect(readDatasetEvents({ ...ds, loading: true }, map, opts)).toEqual([]);
  });
});

describe('buildRangeFilter — overlap, not "starts inside"', () => {
  const range = {
    start: '2026-09-27T07:00:00.000Z',
    end: '2026-10-04T07:00:00.000Z',
    startDate: '2026-09-27',
    endDate: '2026-10-04',
    view: 'timeGridWeek',
  };
  it('with an end column: start < end-of-range AND (end >= start-of-range OR start >= start-of-range)', () => {
    const f = buildRangeFilter(range, { start: 'dvk_startlocal', end: 'dvk_endlocal' }, { dvk_startlocal: B.UserLocal, dvk_endlocal: B.UserLocal }, pacific2026);
    expect(f).toEqual({
      filterOperator: 0,
      conditions: [{ attributeName: 'dvk_startlocal', conditionOperator: 3, value: '2026-10-04T07:00:00.000Z' }],
      filters: [
        {
          filterOperator: 1,
          conditions: [
            { attributeName: 'dvk_endlocal', conditionOperator: 4, value: '2026-09-27T07:00:00.000Z' },
            { attributeName: 'dvk_startlocal', conditionOperator: 4, value: '2026-09-27T07:00:00.000Z' },
          ],
        },
      ],
    });
  });
  it('the multi-day event that STARTED before the range is kept by the end branch', () => {
    // A starts 09-25, ends 09-28: start < 10-04 ✓ and end >= 09-27 ✓ — a "start inside" filter drops it.
    const f = buildRangeFilter(range, { start: 's', end: 'e' }, {}, pacific2026);
    expect(f.filters?.[0].conditions[0]).toMatchObject({ attributeName: 'e', conditionOperator: 4 });
  });
  it('DateOnly bounds are calendar days', () => {
    const f = buildRangeFilter(range, { start: 'd' }, { d: B.DateOnly }, pacific2026);
    expect(f.conditions.map((c) => c.value)).toEqual(['2026-10-04', '2026-09-27']);
  });
});

describe('isNotFoundError', () => {
  it('recognises the MEASURED message', () => {
    expect(isNotFoundError(new Error('The requested record was not found.'))).toBe(true);
    expect(isNotFoundError({ errorCode: -2147220969, message: 'x' })).toBe(true);
    expect(isNotFoundError(new Error('Principal user is missing prvWrite privilege'))).toBe(false);
  });
});
