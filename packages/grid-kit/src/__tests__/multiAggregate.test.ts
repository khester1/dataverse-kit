import { describe, it, expect } from 'vitest';
import {
  aggregateList,
  hasAggregate,
  computeAggregates,
  computeAggregateRows,
  computeGroupAggregates,
} from '../core/aggregate';
import { shedColumns } from '../core/responsive';
import {
  aggregateList as rootList,
  hasAggregate as rootHas,
  computeAggregateRows as rootRows,
  fillColumnWidths as rootFill,
  type AggregateSpec as _RootSpec,
  type AggregateValues as _RootValues,
  type AggregateRowResult as _RootRow,
} from '../index';
import {
  aggregateList as v9List,
  hasAggregate as v9Has,
  computeAggregateRows as v9Rows,
  fillColumnWidths as v9Fill,
  type AggregateSpec as _V9Spec,
  type AggregateValues as _V9Values,
  type AggregateRowResult as _V9Row,
} from '../v9/index';

// Type-level: the exported types must exist on both entry points.
export type _ExportedTypes = [_RootSpec, _RootValues, _RootRow, _V9Spec, _V9Values, _V9Row];

const rows = [
  { amount: 10, pct: 1 },
  { amount: null, pct: 2 },
  { amount: 30, pct: null },
];

describe('aggregateList / hasAggregate', () => {
  it('normalises a single function, a list, duplicates, and the empty cases', () => {
    expect(aggregateList({})).toEqual([]);
    expect(aggregateList({ aggregate: 'sum' })).toEqual(['sum']);
    expect(aggregateList({ aggregate: ['avg', 'sum', 'avg'] })).toEqual(['avg', 'sum']);
    expect(aggregateList({ aggregate: [] })).toEqual([]);
  });

  it('an EMPTY list declares nothing (it is truthy, which is the trap)', () => {
    expect(hasAggregate({ aggregate: [] })).toBe(false);
    expect(hasAggregate({ aggregate: ['sum'] })).toBe(true);
    expect(hasAggregate({ aggregate: 'count' })).toBe(true);
  });
});

describe('computeAggregates keeps its one-result-per-column contract (the v8 footers)', () => {
  it('a list contributes its FIRST function', () => {
    const out = computeAggregates(rows, [{ fieldName: 'amount', aggregate: ['avg', 'sum'] }]);
    expect(out).toEqual({ amount: { fn: 'avg', value: 20 } });
  });

  it('an empty list contributes nothing', () => {
    expect(computeAggregates(rows, [{ fieldName: 'amount', aggregate: [] }])).toEqual({});
  });

  it('a single function is unchanged', () => {
    expect(computeAggregates(rows, [{ fieldName: 'amount', aggregate: 'sum' }])).toEqual({
      amount: { fn: 'sum', value: 40 },
    });
  });

  it('per-group aggregates take the first function too', () => {
    const out = computeGroupAggregates(rows, [{ key: 'g', startIndex: 0, count: 2 }], [
      { fieldName: 'amount', aggregate: ['sum', 'avg'] },
    ]);
    expect(out).toEqual({ g: { amount: { fn: 'sum', value: 10 } } });
  });
});

describe('computeAggregateRows — one row per function', () => {
  const columns = [
    { fieldName: 'amount', aggregate: ['sum', 'avg'] as const },
    { fieldName: 'pct', aggregate: 'avg' as const },
    { fieldName: 'name' },
  ];

  it('orders rows by first appearance and fills only the declaring columns', () => {
    const out = computeAggregateRows(rows, columns);
    expect(out.map((r) => r.fn)).toEqual(['sum', 'avg']);
    expect(out[0].cells).toEqual({ amount: { fn: 'sum', value: 40 } });
    expect(out[1].cells).toEqual({ amount: { fn: 'avg', value: 20 }, pct: { fn: 'avg', value: 1.5 } });
  });

  it('a precomputed pair wins; a present null means blank; an absent pair is computed', () => {
    const out = computeAggregateRows(rows, columns, {
      amount: { sum: 9999 },
      pct: { avg: null },
    });
    expect(out[0].cells.amount.value).toBe(9999);
    // amount.avg was NOT supplied — computed from the rows, never borrowed from `sum`.
    expect(out[1].cells.amount.value).toBe(20);
    expect(out[1].cells.pct.value).toBeNull();
  });

  it('no declaring column → no rows', () => {
    expect(computeAggregateRows(rows, [{ fieldName: 'amount', aggregate: [] }])).toEqual([]);
  });
});

describe('shedColumns protection', () => {
  const wide = (agg: unknown) =>
    [
      { key: 'a', responsivePriority: 10 },
      { key: 'b', responsivePriority: 1, aggregate: agg },
      { key: 'c', responsivePriority: 10 },
      { key: 'd', responsivePriority: 10 },
      { key: 'e', responsivePriority: 10 },
    ] as { key: string; responsivePriority?: number; aggregate?: unknown }[];

  it('a column with a non-empty aggregate list is never shed', () => {
    expect(shedColumns(wide(['sum', 'avg']), 300).map((c) => c.key)).toContain('b');
  });

  it('an empty aggregate list does not protect the column', () => {
    expect(shedColumns(wide([]), 300).map((c) => c.key)).not.toContain('b');
  });
});

describe('public entry points expose the multi-aggregate API', () => {
  it('. and ./v9 both export the helpers (static imports: a missing export fails typecheck too)', () => {
    for (const fn of [rootList, rootHas, rootRows, rootFill, v9List, v9Has, v9Rows, v9Fill]) {
      expect(typeof fn).toBe('function');
    }
  });
});
