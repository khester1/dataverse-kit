import { describe, it, expect } from 'vitest';
import {
  applyColumnOrder,
  initialColumnChoice,
  orderVisibleColumns,
  reconcileColumnChoice,
} from '../core/columnOrder';
import type { ColumnDef } from '../types';

const col = (key: string): ColumnDef => ({ key, fieldName: key, name: key.toUpperCase(), rendererType: 'text' });
const cols = (...keys: string[]): ColumnDef[] => keys.map(col);
const order = (c: ReturnType<typeof initialColumnChoice>): string[] => [...c.order];

describe('core/columnOrder — the column chooser state', () => {
  it('starts with every choosable column visible, in column order', () => {
    expect(order(initialColumnChoice(cols('a', 'b', 'c')))).toEqual(['a', 'b', 'c']);
  });

  it('initialVisibleOrder: listed keys visible IN THAT ORDER, other present keys hidden, unknown keys dropped', () => {
    const c = initialColumnChoice(cols('a', 'b', 'c'), ['c', 'zz', 'a', 'c']);
    expect(order(c)).toEqual(['c', 'a']);
    expect([...c.known].sort()).toEqual(['a', 'b', 'c']); // b is KNOWN → stays hidden on reconcile
    expect(order(reconcileColumnChoice(c, cols('a', 'b', 'c')))).toEqual(['c', 'a']);
  });

  it('★★ initialVisibleOrder survives columns that arrive AFTER mount (a PCF host mounts with none)', () => {
    const pending = initialColumnChoice([], ['c', 'a']);
    expect(order(pending)).toEqual([]);
    const arrived = reconcileColumnChoice(pending, cols('a', 'b', 'c'));
    expect(order(arrived)).toEqual(['c', 'a']); // b HIDDEN — the saved choice, not "all new, all visible"
    expect(reconcileColumnChoice(arrived, cols('a', 'b', 'c'))).toBe(arrived);
  });

  it('★★ a saved choice matching NO current column falls back to all visible — never an empty grid', () => {
    expect(order(initialColumnChoice(cols('a', 'b'), ['renamed']))).toEqual(['a', 'b']);
    const pending = initialColumnChoice([], ['renamed']);
    expect(order(reconcileColumnChoice(pending, cols('a', 'b')))).toEqual(['a', 'b']);
  });

  it('duplicate column keys appear once', () => {
    expect(order(initialColumnChoice(cols('a', 'a', 'b')))).toEqual(['a', 'b']);
  });

  it('★★ a HIDDEN column stays hidden when columns arrive as a new array with the same keys', () => {
    const hidden = applyColumnOrder(cols('a', 'b', 'c'), ['a', 'c']);
    expect(order(reconcileColumnChoice(hidden, cols('a', 'b', 'c')))).toEqual(['a', 'c']);
  });

  it('returns the SAME object when nothing changed (no re-render churn)', () => {
    const c = applyColumnOrder(cols('a', 'b', 'c'), ['c', 'a']);
    expect(reconcileColumnChoice(c, cols('a', 'b', 'c'))).toBe(c);
  });

  it('a never-seen column is appended VISIBLE; a removed one is dropped from both sets', () => {
    const c = applyColumnOrder(cols('a', 'b', 'c'), ['c', 'a']); // b hidden, user order c,a
    const next = reconcileColumnChoice(c, cols('a', 'c', 'd'));
    expect(order(next)).toEqual(['c', 'a', 'd']);
    expect([...next.known].sort()).toEqual(['a', 'c', 'd']);
  });

  it('a column removed and later re-added has been forgotten — it returns VISIBLE (deliberate)', () => {
    const hidden = applyColumnOrder(cols('a', 'b'), ['a']);
    const gone = reconcileColumnChoice(hidden, cols('a'));
    expect(order(reconcileColumnChoice(gone, cols('a', 'b')))).toEqual(['a', 'b']);
  });

  it('host `__…` columns never enter the state', () => {
    const c = initialColumnChoice(cols('a', '__nested', 'b'));
    expect(order(c)).toEqual(['a', 'b']);
    expect(c.known.has('__nested')).toBe(false);
    expect(order(applyColumnOrder(cols('a', '__nested'), ['__nested', 'a']))).toEqual(['a']);
  });

  it('applyColumnOrder drops keys that no longer exist and de-duplicates', () => {
    expect(order(applyColumnOrder(cols('a', 'b'), ['b', 'gone', 'b', 'a']))).toEqual(['b', 'a']);
  });

  it('orderVisibleColumns appends host `__…` columns after the chosen ones, in their original order', () => {
    const all = cols('a', '__x', 'b', '__y');
    expect(orderVisibleColumns(all, ['b', 'a', '__y']).map((c) => c.key)).toEqual(['b', 'a', '__x', '__y']);
    expect(orderVisibleColumns(all, ['b', 'b']).map((c) => c.key)).toEqual(['b', '__x', '__y']);
  });
});
