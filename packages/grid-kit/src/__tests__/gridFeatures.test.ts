import { describe, it, expect } from 'vitest';
import { computeAggregate, computeAggregates, computeGroupAggregates } from '../core/aggregate';
import { applyFilters, evalCondition, isConditionComplete } from '../core/filter';
import type { FilterCondition, GridFilterModel } from '../core/filter';
import { fromGridCustomizerColumn } from '../adapters';
import { orderVisibleColumns, getOperatorsForFieldType, fieldTypeForRenderer } from '../hosts';
import type { ColumnDef } from '../types';

describe('orderVisibleColumns (column chooser)', () => {
  const cols: ColumnDef[] = [
    { key: 'a', fieldName: 'a', name: 'A', rendererType: 'text' },
    { key: 'b', fieldName: 'b', name: 'B', rendererType: 'text' },
    { key: 'c', fieldName: 'c', name: 'C', rendererType: 'text' },
  ];

  it('reorders to the given visible order', () => {
    expect(orderVisibleColumns(cols, ['c', 'a', 'b']).map((c) => c.key)).toEqual(['c', 'a', 'b']);
  });

  it('hides columns not in the visible order', () => {
    expect(orderVisibleColumns(cols, ['b', 'a']).map((c) => c.key)).toEqual(['b', 'a']);
  });

  it('skips unknown keys in the visible order', () => {
    expect(orderVisibleColumns(cols, ['a', 'zzz', 'c']).map((c) => c.key)).toEqual(['a', 'c']);
  });
});

describe('computeAggregate', () => {
  const rows = [{ a: 10 }, { a: 20 }, { a: null }, { a: '30' }, { a: 'x' }];

  it('sum/avg consider only numeric-coercible values', () => {
    expect(computeAggregate(rows, 'a', 'sum')).toBe(60); // 10 + 20 + 30
    expect(computeAggregate(rows, 'a', 'avg')).toBe(20); // 60 / 3
  });

  it('count counts ALL rows (including null/non-numeric)', () => {
    expect(computeAggregate(rows, 'a', 'count')).toBe(5);
  });

  it('min/max over numeric values', () => {
    expect(computeAggregate(rows, 'a', 'min')).toBe(10);
    expect(computeAggregate(rows, 'a', 'max')).toBe(30);
  });

  it('returns null for sum/avg/min/max over an empty numeric set (never NaN/Infinity)', () => {
    expect(computeAggregate([], 'a', 'sum')).toBeNull();
    expect(computeAggregate([{ a: null }, { a: 'x' }], 'a', 'avg')).toBeNull();
    expect(computeAggregate([], 'a', 'min')).toBeNull();
    expect(computeAggregate([], 'a', 'max')).toBeNull();
  });

  it('handles large arrays without a spread/stack overflow', () => {
    const big = Array.from({ length: 200000 }, (_, i) => ({ a: i }));
    expect(computeAggregate(big, 'a', 'min')).toBe(0);
    expect(computeAggregate(big, 'a', 'max')).toBe(199999);
  });
});

describe('computeAggregates', () => {
  it('includes only columns that declared an aggregate', () => {
    const rows = [{ a: 1, b: 2 }, { a: 3, b: 4 }];
    const out = computeAggregates(rows, [
      { fieldName: 'a', aggregate: 'sum' },
      { fieldName: 'b' },
    ]);
    expect(out).toEqual({ a: { fn: 'sum', value: 4 } });
  });
});

describe('computeGroupAggregates (per-group subtotals)', () => {
  // group-ordered (contiguous) like buildGroups produces
  const ordered = [
    { status: 'A', rev: 10 },
    { status: 'A', rev: 20 },
    { status: 'B', rev: 5 },
    { status: 'B', rev: 7 },
    { status: 'B', rev: 3 },
  ];
  const ranges = [
    { key: 'A', startIndex: 0, count: 2 },
    { key: 'B', startIndex: 2, count: 3 },
  ];

  it('aggregates each group slice independently (not the whole set)', () => {
    const out = computeGroupAggregates(ordered, ranges, [
      { fieldName: 'rev', aggregate: 'sum' },
    ]);
    expect(out.A.rev).toEqual({ fn: 'sum', value: 30 });
    expect(out.B.rev).toEqual({ fn: 'sum', value: 15 });
  });

  it('respects per-group count and avg', () => {
    const out = computeGroupAggregates(ordered, ranges, [
      { fieldName: 'rev', aggregate: 'avg' },
      { fieldName: 'status', aggregate: 'count' },
    ]);
    expect(out.A.rev.value).toBe(15); // (10+20)/2
    expect(out.B.rev.value).toBe(5); // (5+7+3)/3
    expect(out.A.status.value).toBe(2);
    expect(out.B.status.value).toBe(3);
  });

  it('returns an empty per-group map when no column declares an aggregate', () => {
    const out = computeGroupAggregates(ordered, ranges, [{ fieldName: 'rev' }]);
    expect(out.A).toEqual({});
    expect(out.B).toEqual({});
  });
});

describe('isConditionComplete (filter builder)', () => {
  it('needs a field and operator', () => {
    expect(isConditionComplete({ fieldName: '', operator: 'eq', value: 'x' })).toBe(false);
  });
  it('null/not-null are complete without a value', () => {
    expect(isConditionComplete({ fieldName: 'a', operator: 'null' })).toBe(true);
    expect(isConditionComplete({ fieldName: 'a', operator: 'not-null' })).toBe(true);
  });
  it('single-value operators need a non-empty value', () => {
    expect(isConditionComplete({ fieldName: 'a', operator: 'eq' })).toBe(false);
    expect(isConditionComplete({ fieldName: 'a', operator: 'eq', value: '' })).toBe(false);
    expect(isConditionComplete({ fieldName: 'a', operator: 'eq', value: '5' })).toBe(true);
  });
  it('in/not-in need a non-empty values list', () => {
    expect(isConditionComplete({ fieldName: 'a', operator: 'in', values: [] })).toBe(false);
    expect(isConditionComplete({ fieldName: 'a', operator: 'in', values: ['1'] })).toBe(true);
  });
});

describe('evalCondition (filter operators)', () => {
  const c = (operator: FilterCondition['operator'], value?: string, values?: string[]): FilterCondition => ({
    fieldName: 'f',
    operator,
    value,
    values,
  });

  it('eq/ne compare numerically when both sides coerce to numbers, else case-insensitive text', () => {
    expect(evalCondition(5, c('eq', '5'))).toBe(true); // 5 === '5'
    expect(evalCondition('ACME', c('eq', 'acme'))).toBe(true); // case-insensitive
    expect(evalCondition('Acme', c('ne', 'contoso'))).toBe(true);
  });

  it('like / begins-with / ends-with are substring matches (case-insensitive)', () => {
    expect(evalCondition('Contoso Ltd', c('like', 'oso'))).toBe(true);
    expect(evalCondition('Contoso Ltd', c('not-like', 'zzz'))).toBe(true);
    expect(evalCondition('Contoso Ltd', c('begins-with', 'con'))).toBe(true);
    expect(evalCondition('Contoso Ltd', c('ends-with', 'ltd'))).toBe(true);
  });

  it('gt/ge/lt/le compare numerically', () => {
    expect(evalCondition(10, c('gt', '5'))).toBe(true);
    expect(evalCondition(5, c('gt', '5'))).toBe(false);
    expect(evalCondition(5, c('ge', '5'))).toBe(true);
    expect(evalCondition(3, c('lt', '5'))).toBe(true);
    expect(evalCondition(5, c('le', '5'))).toBe(true);
  });

  it('date comparisons via on-or-before / on-or-after', () => {
    expect(evalCondition('2026-01-01', c('on-or-before', '2026-06-15'))).toBe(true);
    expect(evalCondition('2026-12-01', c('on-or-after', '2026-06-15'))).toBe(true);
    expect(evalCondition('2026-12-01', c('on-or-before', '2026-06-15'))).toBe(false);
  });

  it('date eq/range matches by calendar day (date-only operand vs date-only OR datetime row)', () => {
    expect(evalCondition('2026-06-15', c('eq', '2026-06-15'))).toBe(true);
    // same calendar day, time-of-day ignored (day-granular, timezone-stable)
    expect(evalCondition('2026-06-15T14:30:00Z', c('eq', '2026-06-15'))).toBe(true);
    expect(evalCondition('2026-06-16', c('eq', '2026-06-15'))).toBe(false);
    expect(evalCondition('2026-06-15T14:30:00Z', c('on-or-before', '2026-06-15'))).toBe(true);
  });

  it('boolean eq/ne works for JS boolean, numeric 1/0, and string "1"/"0" rows', () => {
    expect(evalCondition(true, c('eq', 'true'))).toBe(true);
    expect(evalCondition(1, c('eq', 'true'))).toBe(true);
    expect(evalCondition('1', c('eq', 'true'))).toBe(true);
    expect(evalCondition(0, c('eq', 'false'))).toBe(true);
    expect(evalCondition(false, c('eq', 'false'))).toBe(true);
    expect(evalCondition(0, c('ne', 'true'))).toBe(true);
  });

  it('non-comparable values never pass a comparison operator', () => {
    expect(evalCondition('not-a-number', c('gt', '5'))).toBe(false);
  });

  it('in / not-in against a values list', () => {
    expect(evalCondition('b', c('in', undefined, ['a', 'b', 'c']))).toBe(true);
    expect(evalCondition('z', c('in', undefined, ['a', 'b', 'c']))).toBe(false);
    expect(evalCondition('z', c('not-in', undefined, ['a', 'b']))).toBe(true);
  });

  it('null / not-null treat null, undefined and empty-string as empty', () => {
    expect(evalCondition(null, c('null'))).toBe(true);
    expect(evalCondition('', c('null'))).toBe(true);
    expect(evalCondition(undefined, c('null'))).toBe(true);
    expect(evalCondition('x', c('not-null'))).toBe(true);
    expect(evalCondition(0, c('not-null'))).toBe(true); // 0 is NOT empty
  });
});

describe('applyFilters', () => {
  const rows = [
    { key: '1', name: 'Acme', revenue: 100, status: 'active' },
    { key: '2', name: 'Contoso', revenue: 50, status: 'inactive' },
    { key: '3', name: 'Acme West', revenue: 200, status: 'active' },
  ];
  const model = (m: GridFilterModel): GridFilterModel => m;

  it('returns the input unchanged with no model or no complete conditions', () => {
    expect(applyFilters(rows, undefined)).toBe(rows);
    expect(applyFilters(rows, model({ match: 'all', conditions: [] }))).toBe(rows);
    expect(
      applyFilters(rows, model({ match: 'all', conditions: [{ fieldName: 'name', operator: 'eq' }] }))
    ).toBe(rows); // incomplete (no value) → ignored → input returned
  });

  it('match all (AND) requires every condition', () => {
    const out = applyFilters(
      rows,
      model({
        match: 'all',
        conditions: [
          { fieldName: 'status', operator: 'eq', value: 'active' },
          { fieldName: 'revenue', operator: 'gt', value: '150' },
        ],
      })
    );
    expect(out.map((r) => r.key)).toEqual(['3']);
  });

  it('match any (OR) requires at least one condition', () => {
    const out = applyFilters(
      rows,
      model({
        match: 'any',
        conditions: [
          { fieldName: 'name', operator: 'begins-with', value: 'Con' },
          { fieldName: 'revenue', operator: 'gt', value: '150' },
        ],
      })
    );
    expect(out.map((r) => r.key)).toEqual(['2', '3']);
  });

  it('ignores incomplete conditions while honoring the complete ones', () => {
    const out = applyFilters(
      rows,
      model({
        match: 'all',
        conditions: [
          { fieldName: 'name', operator: 'like', value: 'Acme' },
          { fieldName: 'status', operator: 'eq' }, // incomplete → dropped
        ],
      })
    );
    expect(out.map((r) => r.key)).toEqual(['1', '3']);
  });
});

describe('filter field-type + operator mapping', () => {
  it('maps renderer types to filter field-type buckets', () => {
    expect(fieldTypeForRenderer('currency')).toBe('currency');
    expect(fieldTypeForRenderer('number')).toBe('number');
    expect(fieldTypeForRenderer('progress')).toBe('number');
    expect(fieldTypeForRenderer('date')).toBe('date');
    expect(fieldTypeForRenderer('datetime')).toBe('date');
    expect(fieldTypeForRenderer('boolean')).toBe('boolean');
    expect(fieldTypeForRenderer('optionset')).toBe('optionset');
    expect(fieldTypeForRenderer('lookup')).toBe('lookup');
    expect(fieldTypeForRenderer('link')).toBe('text');
  });

  it('offers type-appropriate operators (date relabels gt/lt to After/Before)', () => {
    const textOps = getOperatorsForFieldType('text').map((o) => o.op);
    expect(textOps).toContain('like');
    expect(textOps).not.toContain('gt');
    const dateOps = getOperatorsForFieldType('date');
    expect(dateOps.find((o) => o.op === 'gt')?.label).toBe('After');
    expect(dateOps.find((o) => o.op === 'lt')?.label).toBe('Before');
    expect(getOperatorsForFieldType('boolean').map((o) => o.op)).toEqual(['eq', 'ne']);
  });
});

describe('fromGridCustomizerColumn aggregate mapping', () => {
  it('maps form-runtime aggregateFunction → ColumnDef.aggregate', () => {
    const col = fromGridCustomizerColumn({
      fieldName: 'revenue',
      displayName: 'Revenue',
      dataType: 'currency',
      rendererType: 'currency',
      aggregateFunction: 'sum',
    });
    expect(col.aggregate).toBe('sum');
  });
});
