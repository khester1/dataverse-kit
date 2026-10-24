/**
 * Framework-agnostic footer aggregates. No React / no Fluent imports (enforced by
 * the package ESLint guard on src/core/**). Used by the host footer renderers.
 */
import { toNumber } from './coercion';

export type AggregateFunction = 'sum' | 'avg' | 'count' | 'min' | 'max';

/**
 * What a column declares in `ColumnDef.aggregate`: one function, or several (one footer row
 * each on the v9 hosts). Read it ONLY through `aggregateList` / `hasAggregate` — an empty
 * array is truthy, so a bare `if (col.aggregate)` would render an empty footer.
 */
export type AggregateSpec = AggregateFunction | ReadonlyArray<AggregateFunction>;

/** A column's declared functions, in declaration order, de-duplicated. `undefined`/`[]` → `[]`. */
export function aggregateList(col: { aggregate?: AggregateSpec }): AggregateFunction[] {
  const a = col.aggregate;
  if (a == null) return [];
  const list = typeof a === 'string' ? [a] : a;
  const out: AggregateFunction[] = [];
  for (const fn of list) if (!out.includes(fn)) out.push(fn);
  return out;
}

/** True when the column declares at least one aggregate function. */
export function hasAggregate(col: { aggregate?: AggregateSpec }): boolean {
  return aggregateList(col).length > 0;
}

export interface AggregateResult {
  fn: AggregateFunction;
  value: number | null;
}

/**
 * Compute one aggregate over a column's values.
 * - `count` counts ALL rows (including null/empty values).
 * - `sum`/`avg`/`min`/`max` consider only numeric-coercible values; over an empty
 *   numeric set they return `null` (so a footer renders blank, never NaN/Infinity).
 * Implemented with a single pass (no `Math.min(...nums)` spread, which blows the
 * argument limit on large grids).
 */
export function computeAggregate(
  items: ReadonlyArray<Record<string, unknown>>,
  fieldName: string,
  fn: AggregateFunction
): number | null {
  if (fn === 'count') return items.length;

  let count = 0;
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const item of items) {
    const n = toNumber(item?.[fieldName]);
    if (n === null) continue;
    count++;
    sum += n;
    if (n < min) min = n;
    if (n > max) max = n;
  }
  if (count === 0) return null;

  switch (fn) {
    case 'sum':
      return sum;
    case 'avg':
      return sum / count;
    case 'min':
      return min;
    case 'max':
      return max;
    default:
      return null;
  }
}

/**
 * Compute aggregates for every column that declared one → `{ fieldName: { fn, value } }`.
 * ONE result per column: a column declaring several functions contributes its FIRST (the
 * single-row v8 footers). The multi-row v9 footer uses `computeAggregateRows`.
 */
export function computeAggregates<T extends Record<string, unknown>>(
  items: ReadonlyArray<T>,
  columns: ReadonlyArray<{ fieldName: string; aggregate?: AggregateSpec }>
): Record<string, AggregateResult> {
  const out: Record<string, AggregateResult> = {};
  for (const col of columns) {
    const fn = aggregateList(col)[0];
    if (fn) {
      out[col.fieldName] = { fn, value: computeAggregate(items, col.fieldName, fn) };
    }
  }
  return out;
}

/**
 * Precomputed aggregate values supplied by the consumer (e.g. server-side totals over every
 * matching record), keyed by field then function: `{ amount: { sum: 1234, avg: 56.7 } }`.
 * A pair with a value (including `null` = "blank") wins over computing it from the items; an
 * absent or `undefined` pair falls back to computing. A consumer that cannot vouch for a value omits it.
 */
export type AggregateValues = Record<string, Partial<Record<AggregateFunction, number | null>>>;

/** One footer row: a function, and each declaring column's result for it. */
export interface AggregateRowResult {
  fn: AggregateFunction;
  /** fieldName → result, only for columns that declared `fn`. */
  cells: Record<string, AggregateResult>;
}

/**
 * The multi-row footer model: one row per distinct function, in order of first appearance
 * (columns left→right, each column's list in declaration order). Each row holds a result
 * only for the columns that declared that function.
 */
export function computeAggregateRows<T extends Record<string, unknown>>(
  items: ReadonlyArray<T>,
  columns: ReadonlyArray<{ fieldName: string; aggregate?: AggregateSpec }>,
  precomputed?: AggregateValues
): AggregateRowResult[] {
  const order: AggregateFunction[] = [];
  for (const col of columns) for (const fn of aggregateList(col)) if (!order.includes(fn)) order.push(fn);
  return order.map((fn) => {
    const cells: Record<string, AggregateResult> = {};
    for (const col of columns) {
      if (!aggregateList(col).includes(fn)) continue;
      const given = precomputed?.[col.fieldName];
      // `undefined` counts as ABSENT (computed); only an explicit `null` means blank.
      const v = given?.[fn];
      const value = v !== undefined ? v : computeAggregate(items, col.fieldName, fn);
      cells[col.fieldName] = { fn, value };
    }
    return { fn, cells };
  });
}

/**
 * Per-group aggregates over a contiguous, group-ordered item array. `ranges` are
 * `{ key, startIndex, count }` (the buckets from `buildGroups`); each group's
 * rows are `orderedItems.slice(startIndex, startIndex + count)`. Returns
 * `{ [groupKey]: { [fieldName]: { fn, value } } }`. Pure (no Fluent types) so it
 * stays in framework-agnostic core and is unit-testable.
 */
export function computeGroupAggregates<T extends Record<string, unknown>>(
  orderedItems: ReadonlyArray<T>,
  ranges: ReadonlyArray<{ key: string; startIndex: number; count: number }>,
  columns: ReadonlyArray<{ fieldName: string; aggregate?: AggregateSpec }>
): Record<string, Record<string, AggregateResult>> {
  const out: Record<string, Record<string, AggregateResult>> = {};
  for (const r of ranges) {
    out[r.key] = computeAggregates(orderedItems.slice(r.startIndex, r.startIndex + r.count), columns);
  }
  return out;
}
