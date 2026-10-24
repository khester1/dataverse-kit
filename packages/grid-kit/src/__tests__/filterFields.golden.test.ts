import { describe, it, expect } from 'vitest';
import * as hosts from '../hosts';
import * as root from '../index';

/**
 * Refactor safety for moving the filter-builder field helpers out of the Fluent v8 panel and into
 * `core/` (so the v9 skin can share them). Written — and seen passing — against the UNMOVED code,
 * through the import paths consumers use today; every value is pinned literally (no oracle shared
 * with the implementation). Paths that must keep working: `'../hosts'` and the package root.
 */
const OPS = {
  text: ['eq', 'ne', 'like', 'not-like', 'begins-with', 'ends-with', 'null', 'not-null'],
  number: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'null', 'not-null'],
  currency: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'null', 'not-null'],
  date: ['eq', 'ne', 'on-or-after', 'on-or-before', 'gt', 'lt', 'null', 'not-null'],
  boolean: ['eq', 'ne'],
  optionset: ['eq', 'ne', 'in', 'not-in', 'null', 'not-null'],
  lookup: ['eq', 'ne', 'like', 'null', 'not-null'],
} as const;

const LABELS: Record<string, string> = {
  eq: 'Equals', ne: 'Does Not Equal', like: 'Contains', 'not-like': 'Does Not Contain', 'begins-with': 'Begins With',
  'ends-with': 'Ends With', gt: 'Greater Than', ge: 'Greater Or Equal', lt: 'Less Than', le: 'Less Or Equal',
  'on-or-after': 'On Or After', 'on-or-before': 'On Or Before', in: 'Is One Of', 'not-in': 'Is Not One Of',
  null: 'Is Empty', 'not-null': 'Is Not Empty',
};

describe.each([
  ['hosts', hosts],
  ['package root', root],
] as const)('filter field helpers via %s (golden)', (_path, mod) => {
  it('getOperatorsForFieldType: every field type, exact operators and labels', () => {
    for (const [type, ops] of Object.entries(OPS)) {
      const expected = ops.map((op) => ({
        op,
        label: type === 'date' && op === 'gt' ? 'After' : type === 'date' && op === 'lt' ? 'Before' : LABELS[op],
      }));
      expect(mod.getOperatorsForFieldType(type as keyof typeof OPS), type).toEqual(expected);
    }
  });

  it('fieldTypeForRenderer: every renderer type, plus the unknown fall-through', () => {
    const expected: Record<string, string> = {
      text: 'text', link: 'text', lookup: 'lookup', optionset: 'optionset', currency: 'currency', number: 'number',
      date: 'date', datetime: 'date', boolean: 'boolean', toggle: 'boolean', icon: 'text', progress: 'number',
      coloredCell: 'text', rating: 'number', composite: 'text', fileDrop: 'text', somethingElse: 'text',
    };
    for (const [renderer, type] of Object.entries(expected)) expect(mod.fieldTypeForRenderer(renderer), renderer).toBe(type);
  });
});

describe('one implementation, every import path', () => {
  it('root, hosts and core expose the SAME functions (no copy left behind in the v8 panel)', async () => {
    const core = await import('../core');
    for (const name of ['fieldTypeForRenderer', 'getOperatorsForFieldType'] as const) {
      expect(hosts[name], `hosts.${name}`).toBe(core[name]);
      expect(root[name], `root.${name}`).toBe(core[name]);
    }
  });
});

describe('core/filterFields — the helpers that were private in the v8 panel', async () => {
  const { filterFieldOptions, toFilterField, filterableFields } = await import('../core/filterFields');
  const col = (o: Record<string, unknown>) => ({ key: 'k', fieldName: 'f', name: 'F', rendererType: 'optionset', ...o }) as never;

  it('options: both config shapes, label fallbacks, null keys dropped, keys stringified', () => {
    expect(filterFieldOptions(col({ rendererConfig: { optionSetOptions: [{ key: 1, text: 'Active' }, { key: null, text: 'x' }] } })))
      .toEqual([{ key: '1', text: 'Active' }]);
    expect(filterFieldOptions(col({ rendererConfig: { options: [{ value: 'a', label: 'Alpha' }, { value: 'b' }] } })))
      .toEqual([{ key: 'a', text: 'Alpha' }, { key: 'b', text: 'b' }]);
    expect(filterFieldOptions(col({ rendererConfig: {} }))).toBeUndefined();
  });

  it('an optionset column with no choices is filtered as TEXT (else `in` could never be completed)', () => {
    expect(toFilterField(col({})).fieldType).toBe('text');
    expect(toFilterField(col({ rendererConfig: { optionSetOptions: [{ key: 1, text: 'A' }] } })).fieldType).toBe('optionset');
  });

  it('filterableFields: skips isFilterable:false, fileDrop and host `__` columns (key OR field); one per field', () => {
    const c = (key: string, fieldName: string, extra: Record<string, unknown> = {}) =>
      ({ key, fieldName, name: key, rendererType: 'text', ...extra }) as never;
    const out = filterableFields([
      c('a', 'a'), c('a2', 'a'), c('b', 'b', { isFilterable: false }), c('d', 'd', { rendererType: 'fileDrop' }),
      c('__nested', '__nested'), c('x', '__hidden'), c('e', 'e'),
    ]);
    expect(out.map((f) => f.key)).toEqual(['a', 'e']);
  });
});
