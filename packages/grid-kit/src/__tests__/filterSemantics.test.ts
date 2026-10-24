import { describe, it, expect } from 'vitest';
import { applyColumnFilters, activeFilterCount, evalCondition } from '../core/filter';
import type { FilterCondition, GridFilterModel } from '../core/filter';
import type { ColumnDef } from '../types';

/**
 * What a filter compares — written against REAL Dataverse row shapes (a value + its
 * `@OData…FormattedValue` sibling), where the raw value and the text the grid shows DIFFER.
 * A tidy `{ name, value }` fixture could not tell the two apart.
 */
const FV = '@OData.Community.Display.V1.FormattedValue';
type Row = Record<string, unknown> & { key: string };

const columns: ColumnDef<Row>[] = [
  { key: 'name', fieldName: 'name', name: 'Name', rendererType: 'text' },
  { key: 'parent', fieldName: '_parentaccountid_value', name: 'Parent', rendererType: 'lookup' },
  {
    key: 'status', fieldName: 'statuscode', name: 'Status', rendererType: 'optionset',
    rendererConfig: { optionSetOptions: [{ key: 1, text: 'Active' }, { key: 2, text: 'Inactive' }] },
  },
  { key: 'revenue', fieldName: 'revenue', name: 'Revenue', rendererType: 'currency' },
  {
    key: 'tags', fieldName: 'tags', name: 'Tags', rendererType: 'optionset',
    rendererConfig: { optionSetMultiSelect: true, optionSetOptions: [{ key: 1, text: 'A' }, { key: 2, text: 'B' }, { key: 3, text: 'C' }] },
  },
];

const rows: Row[] = [
  {
    key: 'r1', name: 'Alpha', _parentaccountid_value: 'a1b2c3d4-0000-0000-0000-000000000001', [`_parentaccountid_value${FV}`]: 'Contoso Ltd',
    statuscode: 1, [`statuscode${FV}`]: 'Active', revenue: 1500, [`revenue${FV}`]: '$1,500.00', tags: [1, 2],
  },
  {
    key: 'r2', name: 'Beta', _parentaccountid_value: 'ffff0000-0000-0000-0000-000000000002', [`_parentaccountid_value${FV}`]: 'Fabrikam',
    statuscode: 2, [`statuscode${FV}`]: 'Inactive', revenue: 900, [`revenue${FV}`]: '$900.00', tags: [3],
  },
];

const only = (...conditions: FilterCondition[]): string[] =>
  applyColumnFilters(rows, { match: 'all', conditions }, columns).map((r) => r.key);

describe('decision 1 — text operators match what the grid SHOWS (or the raw value)', () => {
  it('lookup "contains" matches the displayed NAME, not only the GUID', () => {
    expect(only({ fieldName: '_parentaccountid_value', operator: 'like', value: 'cont' })).toEqual(['r1']);
  });

  it('the raw value still matches too (a pasted GUID fragment keeps working)', () => {
    expect(only({ fieldName: '_parentaccountid_value', operator: 'like', value: 'a1b2' })).toEqual(['r1']);
  });

  it('lookup "equals" matches the displayed name; "does not equal" is its exact negation', () => {
    expect(only({ fieldName: '_parentaccountid_value', operator: 'eq', value: 'fabrikam' })).toEqual(['r2']);
    expect(only({ fieldName: '_parentaccountid_value', operator: 'ne', value: 'fabrikam' })).toEqual(['r1']);
  });

  it('"does not contain" excludes a row matching by EITHER the raw value or the text', () => {
    expect(only({ fieldName: '_parentaccountid_value', operator: 'not-like', value: 'contoso' })).toEqual(['r2']);
  });

  it('optionset stays on the CODE: `in [1]` matches, the label does not drive eq', () => {
    expect(only({ fieldName: 'statuscode', operator: 'in', values: ['1'] })).toEqual(['r1']);
    expect(only({ fieldName: 'statuscode', operator: 'eq', value: 'Active' })).toEqual([]);
  });

  it('currency stays NUMERIC: `gt 1000` compares 1500, not "$1,500.00"', () => {
    expect(only({ fieldName: 'revenue', operator: 'gt', value: '1000' })).toEqual(['r1']);
  });
});

describe('multi-select optionsets (array values) — a shipped v8 defect', () => {
  it('`eq` = contains the option; `ne` its negation', () => {
    expect(only({ fieldName: 'tags', operator: 'eq', value: '2' })).toEqual(['r1']);
    expect(only({ fieldName: 'tags', operator: 'ne', value: '2' })).toEqual(['r2']);
  });

  it('`in` = any overlap; `not-in` its negation (it used to match EVERYTHING)', () => {
    expect(only({ fieldName: 'tags', operator: 'in', values: ['2', '3'] })).toEqual(['r1', 'r2']);
    expect(only({ fieldName: 'tags', operator: 'not-in', values: ['3'] })).toEqual(['r1']);
  });

  it('an empty array is empty', () => {
    expect(evalCondition([], { fieldName: 'x', operator: 'null' })).toBe(true);
    expect(evalCondition([1], { fieldName: 'x', operator: 'null' })).toBe(false);
  });
});

describe('a condition on a field that is no longer offered — a shipped v8 defect', () => {
  const model: GridFilterModel = {
    match: 'all',
    conditions: [{ fieldName: 'removed_column', operator: 'eq', value: 'x' }, { fieldName: 'name', operator: 'eq', value: 'Beta' }],
  };

  it('is ignored (it used to read `undefined` and empty the grid)', () => {
    expect(applyColumnFilters(rows, model, columns).map((r) => r.key)).toEqual(['r2']);
  });

  it('is not counted in the "Filters (n)" badge', () => {
    expect(activeFilterCount(model, columns)).toBe(1);
  });
});
