// @vitest-environment jsdom
/**
 * v9 `DataGrid` `filterBuilder` — the "Filters" command, the `GridFilterBuilderV9` drawer, and what the
 * filter feeds: rows, badge, `onFilterChange`, footer (incl. `aggregateItems`), `Rows: N`, export and
 * selection.
 *
 * ★ The fixture is FOUR rows — A only, B only, both, neither — so All (1 row), Any (3) and none (4) are
 *   all different; revenues are distinct powers of ten, so a sum names exactly which rows it counted.
 *   Rows carry the Dataverse `@OData…FormattedValue` annotation, so raw ≠ shown.
 * ★ Every row claim is read AFTER the drawer is PROVEN closed (an open modal can `aria-hide` the grid).
 *   Every control the drawer is driven through is asserted to hold the value it was given — a value that
 *   never landed and a filter that rejects it read the same.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react';
import type { ColumnDef } from '../../types';
import type { GridFilterModel } from '../../core/filter';
import { DataGrid } from '../hosts/DataGrid';
import { GridFilterBuilderV9 } from '../hosts/GridFilterBuilderV9';
import { GridColumnChooserV9 } from '../hosts/GridColumnChooserV9';
import { NestedGrid } from '../hosts/nested/NestedGrid';
import { wrapper } from './testUtils';

const FV = '@OData.Community.Display.V1.FormattedValue';
type Row = Record<string, unknown> & { key: string; name: string };

// A = city eq Oslo · B = tier in [Gold]
const items: Row[] = [
  { key: 'a', name: 'Alpha', city: 'Oslo', tier: 2, [`tier${FV}`]: 'Silver', revenue: 1, score: 10.2, due: '2026-06-14', parent: 'a1b2c3d4-0000-0000-0000-000000000001', [`parent${FV}`]: 'Contoso Ltd' },
  { key: 'b', name: 'Beta', city: 'Rome', tier: 1, [`tier${FV}`]: 'Gold', revenue: 20, score: 10.7, due: '2026-06-15', parent: 'ffff0000-0000-0000-0000-000000000002', [`parent${FV}`]: 'Fabrikam' },
  { key: 'c', name: 'Gamma', city: 'Oslo', tier: 1, [`tier${FV}`]: 'Gold', revenue: 300, score: 11, due: '2026-06-16', parent: 'eeee0000-0000-0000-0000-000000000003', [`parent${FV}`]: 'Contoso Ltd' },
  { key: 'd', name: 'Delta', city: 'Rome', tier: 2, [`tier${FV}`]: 'Silver', revenue: 4000, score: 9, due: '2026-06-01', parent: 'dddd0000-0000-0000-0000-000000000004', [`parent${FV}`]: 'Northwind' },
];
const ALL_NAMES = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'];

const cols = (): ColumnDef<Row>[] => [
  { key: 'name', fieldName: 'name', name: 'Name', rendererType: 'text' },
  { key: 'city', fieldName: 'city', name: 'City', rendererType: 'text' },
  {
    key: 'tier', fieldName: 'tier', name: 'Tier', rendererType: 'optionset',
    rendererConfig: { optionSetOptions: [{ key: 1, text: 'Gold' }, { key: 2, text: 'Silver' }] },
  },
  { key: 'revenue', fieldName: 'revenue', name: 'Revenue', rendererType: 'number', aggregate: 'sum', aggregateFormat: (v) => `SUM=${v}` },
  { key: 'score', fieldName: 'score', name: 'Score', rendererType: 'number' },
  { key: 'due', fieldName: 'due', name: 'Due', rendererType: 'date' },
  { key: 'parent', fieldName: 'parent', name: 'Parent', rendererType: 'lookup' },
];

beforeEach(() => vi.spyOn(console, 'warn').mockImplementation(() => undefined));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ── reading the grid ──────────────────────────────────────────────────────────────────────────
const bodyRows = (root: ParentNode = document): HTMLElement[] =>
  [...root.querySelectorAll<HTMLElement>('[role="row"]')].filter(
    // A data row: has cells, is not the header (whose select-all cell is a gridcell too) or a footer row.
    (r) => !!r.querySelector('[role="gridcell"]') && !r.querySelector('[role="columnheader"]') && !r.closest('[data-gridkit-aggregate-footer]'),
  );
const shownNames = (): string[] =>
  bodyRows().map((r) => ALL_NAMES.find((n) => (r.textContent ?? '').includes(n)) ?? '?');
const rowOf = (name: string): HTMLElement => {
  const r = bodyRows().find((x) => (x.textContent ?? '').includes(name));
  if (!r) throw new Error(`instrument: no row ${name}`);
  return r;
};
const sumText = (): string[] => screen.queryAllByText(/^SUM=/).map((e) => e.textContent ?? '');
const filtersButton = (): HTMLElement => screen.getByRole('button', { name: /^Filters/ });

// ── driving the drawer ────────────────────────────────────────────────────────────────────────
const drawer = (): HTMLElement => screen.getByRole('dialog', { name: /edit filters/i });
async function closedProof(): Promise<void> {
  await waitFor(() => expect(screen.queryByRole('dialog', { name: /edit filters/i })).toBeNull());
}
function setSelect(el: HTMLElement, value: string): void {
  fireEvent.change(el, { target: { value } });
  expect((el as HTMLSelectElement).value, `instrument: ${el.getAttribute('aria-label')} = ${value} landed`).toBe(value);
}
function setInput(el: HTMLElement, value: string): void {
  fireEvent.change(el, { target: { value } });
  expect((el as HTMLInputElement).value, `instrument: ${el.getAttribute('aria-label')} = ${value} landed`).toBe(value);
}
interface Cond {
  field: string;
  op: string;
  value?: string;
  checks?: string[];
}
function addCondition({ field, op, value, checks }: Cond): void {
  fireEvent.click(within(drawer()).getByRole('button', { name: 'Add condition' }));
  const rows = drawer().querySelectorAll<HTMLElement>('[data-gridkit-filter-row]');
  const row = rows[rows.length - 1];
  setSelect(within(row).getByRole('combobox', { name: 'Column' }), field);
  setSelect(within(row).getByRole('combobox', { name: 'Operator' }), op);
  if (checks) {
    const group = within(row).getByRole('group', { name: 'Values' });
    for (const label of checks) {
      const box = within(group).getByRole('checkbox', { name: label }) as HTMLInputElement;
      fireEvent.click(box);
      expect(box.checked, `instrument: ${label} checked`).toBe(true);
    }
  } else if (value !== undefined) {
    const editor = within(row).getByLabelText('Value');
    if (editor.tagName === 'SELECT') setSelect(editor, value);
    else setInput(editor, value);
  }
}
async function build(conds: Cond[], match?: 'all' | 'any'): Promise<void> {
  fireEvent.click(filtersButton());
  conds.forEach(addCondition);
  if (match) setSelect(within(drawer()).getByRole('combobox', { name: 'Match' }), match);
  fireEvent.click(within(drawer()).getByRole('button', { name: 'Apply' }));
  await closedProof();
}
const A: Cond = { field: 'city', op: 'eq', value: 'Oslo' };
const B: Cond = { field: 'tier', op: 'in', checks: ['Gold'] };
const model = (...conditions: GridFilterModel['conditions']): GridFilterModel => ({ match: 'all', conditions });

describe('v9 DataGrid filterBuilder — opt-in', () => {
  it('off by default: no Filters command, every row', () => {
    render(<DataGrid items={items} columns={cols()} toolbar={{ commands: [] }} />, { wrapper });
    expect(screen.queryByRole('button', { name: /^Filters/ })).toBeNull();
    expect(shownNames()).toEqual(['Alpha', 'Beta', 'Gamma', 'Delta']);
  });

  it('`true` alone warns and adds NO command (no panel to open, nothing bundled)', () => {
    render(<DataGrid items={items} columns={cols()} filterBuilder toolbar={{ commands: [] }} />, { wrapper });
    expect(screen.queryByRole('button', { name: /^Filters/ })).toBeNull();
    expect(vi.mocked(console.warn).mock.calls.flat().join(' ')).toMatch(/filterBuilder=\{true\} needs the panel/);
  });
});

describe('v9 DataGrid filterBuilder — building filters in the drawer', () => {
  it('one condition → exact rows, "Filters (1)", exact onFilterChange', async () => {
    const onFilterChange = vi.fn();
    render(<DataGrid items={items} columns={cols()} filterBuilder={GridFilterBuilderV9} onFilterChange={onFilterChange} />, { wrapper });
    expect(filtersButton().textContent).toBe('Filters');
    await build([A]);
    expect(shownNames()).toEqual(['Alpha', 'Gamma']);
    expect(filtersButton().textContent).toBe('Filters (1)');
    expect(onFilterChange).toHaveBeenCalledTimes(1);
    expect(onFilterChange).toHaveBeenLastCalledWith({ match: 'all', conditions: [{ fieldName: 'city', operator: 'eq', value: 'Oslo', values: undefined }] });
  });

  it('All vs Any over the 4-row fixture (B via the checkbox list): All 1 row, Any 3', async () => {
    render(<DataGrid items={items} columns={cols()} filterBuilder={GridFilterBuilderV9} />, { wrapper });
    await build([A, B]);
    expect(shownNames()).toEqual(['Gamma']);
    expect(filtersButton().textContent).toBe('Filters (2)');
    fireEvent.click(filtersButton());
    setSelect(within(drawer()).getByRole('combobox', { name: 'Match' }), 'any');
    fireEvent.click(within(drawer()).getByRole('button', { name: 'Apply' }));
    await closedProof();
    expect(shownNames()).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('number: `gt 10.5` separates 10.2 from 10.7', async () => {
    render(<DataGrid items={items} columns={cols()} filterBuilder={GridFilterBuilderV9} />, { wrapper });
    await build([{ field: 'score', op: 'gt', value: '10.5' }]);
    expect(shownNames()).toEqual(['Beta', 'Gamma']);
  });

  it('date: `on-or-after 2026-06-15` via <input type="date">', async () => {
    render(<DataGrid items={items} columns={cols()} filterBuilder={GridFilterBuilderV9} />, { wrapper });
    await build([{ field: 'due', op: 'on-or-after', value: '2026-06-15' }]);
    expect(shownNames()).toEqual(['Beta', 'Gamma']);
  });

  it('decision 1: a lookup "contains" matches the NAME the grid shows', async () => {
    render(<DataGrid items={items} columns={cols()} filterBuilder={GridFilterBuilderV9} />, { wrapper });
    await build([{ field: 'parent', op: 'like', value: 'contoso' }]);
    expect(shownNames()).toEqual(['Alpha', 'Gamma']);
  });

  it('Apply → edit → Cancel → reopen shows the APPLIED model, and the rows never changed', async () => {
    render(<DataGrid items={items} columns={cols()} filterBuilder={GridFilterBuilderV9} />, { wrapper });
    await build([A]);
    fireEvent.click(filtersButton());
    addCondition(B);
    expect(drawer().querySelectorAll('[data-gridkit-filter-row]'), 'instrument: the edit added a row').toHaveLength(2);
    fireEvent.click(within(drawer()).getByRole('button', { name: 'Cancel' }));
    await closedProof();
    expect(shownNames()).toEqual(['Alpha', 'Gamma']);
    fireEvent.click(filtersButton());
    const rows = drawer().querySelectorAll<HTMLElement>('[data-gridkit-filter-row]');
    expect(rows).toHaveLength(1);
    expect((within(rows[0]).getByRole('combobox', { name: 'Column' }) as HTMLSelectElement).value).toBe('city');
  });

  it('Apply drops an INCOMPLETE row (a column picked, no value) — onFilterChange carries only the complete one', async () => {
    const onFilterChange = vi.fn();
    render(<DataGrid items={items} columns={cols()} filterBuilder={GridFilterBuilderV9} onFilterChange={onFilterChange} />, { wrapper });
    await build([A, { field: 'name', op: 'like' }]);
    expect(onFilterChange.mock.calls.at(-1)![0].conditions.map((c: { fieldName: string }) => c.fieldName)).toEqual(['city']);
    expect(filtersButton().textContent).toBe('Filters (1)');
  });

  it('the panel never shows a removed field\'s condition, so its next Apply drops it for good', async () => {
    const onFilterChange = vi.fn();
    const p = { items, filterBuilder: GridFilterBuilderV9, onFilterChange, initialFilterModel: model({ fieldName: 'city', operator: 'eq', value: 'Oslo' }) };
    const { rerender } = render(<DataGrid {...p} columns={cols().filter((c) => c.key !== 'city')} />, { wrapper });
    fireEvent.click(filtersButton());
    expect(drawer().querySelectorAll('[data-gridkit-filter-row]')).toHaveLength(0);
    fireEvent.click(within(drawer()).getByRole('button', { name: 'Apply' }));
    await closedProof();
    expect(onFilterChange).toHaveBeenLastCalledWith({ match: 'all', conditions: [] });
    rerender(<DataGrid {...p} columns={cols()} />);
    expect(shownNames()).toEqual(['Alpha', 'Beta', 'Gamma', 'Delta']);
  });

  it('the Column picker offers exactly the filterable fields (no host `__` column, no isFilterable:false, no fileDrop)', () => {
    const extra: ColumnDef<Row>[] = [
      ...cols(),
      { key: 'secret', fieldName: 'secret', name: 'Secret', rendererType: 'text', isFilterable: false },
      { key: 'drop', fieldName: 'drop', name: 'Drop', rendererType: 'fileDrop' },
      { key: '__related', fieldName: '__related', name: 'Related', rendererType: 'text' },
    ];
    render(<DataGrid items={items} columns={extra} filterBuilder={GridFilterBuilderV9} />, { wrapper });
    fireEvent.click(filtersButton());
    fireEvent.click(within(drawer()).getByRole('button', { name: 'Add condition' }));
    const options = [...within(drawer()).getByRole('combobox', { name: 'Column' }).querySelectorAll('option')].map((o) => o.textContent);
    expect(options).toEqual(['Select a column', 'Name', 'City', 'Tier', 'Revenue', 'Score', 'Due', 'Parent']);
  });
});

describe('v9 DataGrid filterBuilder — what the filter feeds', () => {
  it('badge counts COMPLETE conditions on offered fields only (an incomplete and a removed-field one present)', () => {
    render(
      <DataGrid
        items={items}
        columns={cols()}
        filterBuilder={GridFilterBuilderV9}
        initialFilterModel={model(
          { fieldName: 'city', operator: 'eq', value: 'Oslo' },
          { fieldName: 'name', operator: 'like' },
          { fieldName: 'ghost', operator: 'eq', value: 'x' },
        )}
      />,
      { wrapper },
    );
    expect(shownNames()).toEqual(['Alpha', 'Gamma']);
    expect(filtersButton().textContent).toBe('Filters (1)');
  });

  it('initialFilterModel waits for columns that arrive after mount, and does not fire onFilterChange', () => {
    const onFilterChange = vi.fn();
    const seed = model({ fieldName: 'city', operator: 'eq', value: 'Rome' });
    const p = { items, filterBuilder: GridFilterBuilderV9, initialFilterModel: seed, onFilterChange };
    const { rerender } = render(<DataGrid {...p} columns={[]} />, { wrapper });
    rerender(<DataGrid {...p} columns={cols()} />);
    expect(shownNames()).toEqual(['Beta', 'Delta']);
    expect(onFilterChange).not.toHaveBeenCalled();
  });

  it('a field REMOVED after the filter applied is ignored — rows and badge', () => {
    const seed = model({ fieldName: 'city', operator: 'eq', value: 'Oslo' });
    const p = { items, filterBuilder: GridFilterBuilderV9, initialFilterModel: seed };
    const { rerender } = render(<DataGrid {...p} columns={cols()} />, { wrapper });
    expect(shownNames(), 'instrument: the city filter applied first').toEqual(['Alpha', 'Gamma']);
    rerender(<DataGrid {...p} columns={cols().filter((c) => c.key !== 'city')} />);
    expect(shownNames()).toEqual(['Alpha', 'Beta', 'Gamma', 'Delta']);
    expect(filtersButton().textContent).toBe('Filters');
  });

  it('hiding a column in the chooser does NOT drop its filter', () => {
    render(
      <DataGrid
        items={items}
        columns={cols()}
        columnChooser={GridColumnChooserV9}
        initialVisibleOrder={['name', 'revenue']}
        filterBuilder={GridFilterBuilderV9}
        initialFilterModel={model({ fieldName: 'city', operator: 'eq', value: 'Oslo' })}
      />,
      { wrapper },
    );
    expect(shownNames()).toEqual(['Alpha', 'Gamma']);
    expect(filtersButton().textContent).toBe('Filters (1)');
  });

  it('aggregate footer sums the SHOWN rows; with aggregateItems, the filtered full set (off-page row included)', () => {
    const seed = model({ fieldName: 'city', operator: 'eq', value: 'Oslo' });
    const { unmount } = render(<DataGrid items={items} columns={cols()} filterBuilder={GridFilterBuilderV9} initialFilterModel={seed} />, { wrapper });
    expect(sumText()).toEqual(['SUM=301']);
    unmount();
    const offPage = { ...items[0], key: 'e', name: 'Epsilon', revenue: 50000 };
    render(<DataGrid items={items} aggregateItems={[...items, offPage]} columns={cols()} filterBuilder={GridFilterBuilderV9} initialFilterModel={seed} />, { wrapper });
    expect(sumText()).toEqual(['SUM=50301']);
  });

  it('look="ce" `Rows: N`: the shown count while a filter applies — even over totalRowCount; totalRowCount otherwise', () => {
    const seed = model({ fieldName: 'city', operator: 'eq', value: 'Oslo' });
    const count = (): string => document.querySelector('[data-gridkit-row-count]')?.textContent ?? '';
    const { unmount } = render(<DataGrid look="ce" items={items} columns={cols()} filterBuilder={GridFilterBuilderV9} initialFilterModel={seed} totalRowCount={53} />, { wrapper });
    expect(count()).toBe('Rows: 2');
    unmount();
    render(<DataGrid look="ce" items={items} columns={cols()} filterBuilder={GridFilterBuilderV9} totalRowCount={53} />, { wrapper });
    expect(count()).toBe('Rows: 53');
  });

  it('collisions: a consumer `__gridkit_filters__` command suppresses Filters only (warns); Columns is still added', () => {
    render(
      <DataGrid
        items={items}
        columns={cols()}
        filterBuilder={GridFilterBuilderV9}
        columnChooser={GridColumnChooserV9}
        toolbar={{ commands: [{ key: '__gridkit_filters__', text: 'My filters' }] }}
      />,
      { wrapper },
    );
    // Default layout: the kit's injected commands come FIRST (the v8 rule).
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Columns', 'My filters']);
    expect(vi.mocked(console.warn).mock.calls.flat().join(' ')).toMatch(/'__gridkit_filters__' command — filterBuilder's Filters is not added/);
  });

  it('injected order is export → columns → filters', () => {
    render(
      <DataGrid
        items={items}
        columns={cols()}
        exportConfig={{ enabled: true, formats: ['csv'] }}
        columnChooser={GridColumnChooserV9}
        filterBuilder={GridFilterBuilderV9}
        toolbar={{ commands: [{ key: 'mine', text: 'Mine' }] }}
      />,
      { wrapper },
    );
    const labels = screen.getAllByRole('button').map((b) => b.textContent);
    // One format ⇒ one "Export" button. Default layout: injected first, then the consumer's.
    expect(labels).toEqual(['Export', 'Columns', 'Filters', 'Mine']);
  });

  it('server totals under a filter: one dev warning (they cannot be filtered)', () => {
    render(
      <DataGrid
        items={items}
        columns={cols()}
        aggregateResults={{ revenue: { sum: 999 } }}
        filterBuilder={GridFilterBuilderV9}
        initialFilterModel={model({ fieldName: 'city', operator: 'eq', value: 'Oslo' })}
      />,
      { wrapper },
    );
    expect(vi.mocked(console.warn).mock.calls.flat().join(' ')).toMatch(/aggregateResults are precomputed and are NOT filtered/);
  });
});

describe('v9 DataGrid filterBuilder — selection', () => {
  const check = (name: string): void => {
    const box = rowOf(name).querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(box);
  };
  const isChecked = (name: string): boolean => (rowOf(name).querySelector('input[type="checkbox"]') as HTMLInputElement).checked;

  it('★ a selected row that a filter hides is DROPPED from the selection: it does not come back when the filter clears', async () => {
    const onSel = vi.fn();
    render(<DataGrid items={items} columns={cols()} selectionMode="multiple" onSelectionChanged={onSel} filterBuilder={GridFilterBuilderV9} />, { wrapper });
    check('Beta');
    expect(onSel.mock.calls.at(-1)![0].map((r: Row) => r.name), 'instrument: Beta selected').toEqual(['Beta']);
    await build([A]); // Oslo — Beta (Rome) is filtered out
    expect(onSel.mock.calls.at(-1)![0], 'the trim is emitted once, on Apply').toEqual([]);
    check('Gamma');
    expect(onSel.mock.calls.at(-1)![0].map((r: Row) => r.name)).toEqual(['Gamma']);
    // Clear the filter: Beta must NOT reappear selected.
    fireEvent.click(filtersButton());
    fireEvent.click(within(drawer()).getByRole('button', { name: 'Clear all' }));
    fireEvent.click(within(drawer()).getByRole('button', { name: 'Apply' }));
    await closedProof();
    expect(shownNames()).toEqual(['Alpha', 'Beta', 'Gamma', 'Delta']);
    expect(isChecked('Beta')).toBe(false);
    expect(isChecked('Gamma')).toBe(true);
  });

  it('a filter that keeps every selected row emits nothing extra', async () => {
    const onSel = vi.fn();
    render(<DataGrid items={items} columns={cols()} selectionMode="multiple" onSelectionChanged={onSel} filterBuilder={GridFilterBuilderV9} />, { wrapper });
    check('Gamma');
    const before = onSel.mock.calls.length;
    await build([A]); // Oslo keeps Gamma
    expect(onSel.mock.calls.length).toBe(before);
    expect(isChecked('Gamma')).toBe(true);
  });

  it('★ a seeded selection the seeded filter HIDES is dropped (initialSelectedKeys + initialFilterModel)', () => {
    const onSel = vi.fn();
    render(
      <DataGrid items={items} columns={cols()} selectionMode="multiple" initialSelectedKeys={['b']} onSelectionChanged={onSel}
        filterBuilder={GridFilterBuilderV9} initialFilterModel={model({ fieldName: 'city', operator: 'eq', value: 'Oslo' })} />,
      { wrapper },
    );
    expect(shownNames(), 'instrument: Beta (Rome) is hidden').toEqual(['Alpha', 'Gamma']);
    check('Alpha');
    expect(onSel.mock.calls.at(-1)![0].map((r: Row) => r.name)).toEqual(['Alpha']);
  });

  it('★ a selected row that a DATA REFRESH moves out of the filter is dropped', () => {
    const onSel = vi.fn();
    const p = { columns: cols(), selectionMode: 'multiple' as const, onSelectionChanged: onSel, filterBuilder: GridFilterBuilderV9,
      initialFilterModel: model({ fieldName: 'city', operator: 'eq', value: 'Oslo' }) };
    const { rerender } = render(<DataGrid {...p} items={items} />, { wrapper });
    check('Gamma');
    rerender(<DataGrid {...p} items={items.map((r) => (r.key === 'c' ? { ...r, city: 'Rome' } : r))} />);
    expect(shownNames(), 'instrument: Gamma moved to Rome and is hidden').toEqual(['Alpha']);
    expect(onSel.mock.calls.at(-1)![0], 'the drop is emitted').toEqual([]);
    check('Alpha');
    expect(onSel.mock.calls.at(-1)![0].map((r: Row) => r.name)).toEqual(['Alpha']);
  });

  it('a seeded key whose row has NOT ARRIVED yet stays selected (the trim drops hidden rows, not absent ones)', () => {
    const p = { columns: cols(), selectionMode: 'multiple' as const, initialSelectedKeys: ['c'], filterBuilder: GridFilterBuilderV9 };
    const { rerender } = render(<DataGrid {...p} items={[]} />, { wrapper });
    rerender(<DataGrid {...p} items={items} />);
    expect(isChecked('Gamma')).toBe(true);
  });

  it('initialSelectedKeys still seed the (now grid-owned) selection', () => {
    render(<DataGrid items={items} columns={cols()} selectionMode="multiple" initialSelectedKeys={['c']} filterBuilder={GridFilterBuilderV9} />, { wrapper });
    expect(isChecked('Gamma')).toBe(true);
    expect(isChecked('Alpha')).toBe(false);
  });
});

describe('v9 DataGrid filterBuilder — export', () => {
  let lastBlob: Blob | undefined;
  const readBlob = (b: Blob): Promise<string> =>
    new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.readAsText(b);
    });
  beforeEach(() => {
    lastBlob = undefined;
    (URL as unknown as { createObjectURL: (b: Blob) => string }).createObjectURL = (b: Blob) => {
      lastBlob = b;
      return 'blob:captured';
    };
    (URL as unknown as { revokeObjectURL: (u: string) => void }).revokeObjectURL = () => undefined;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });
  const exportedNames = async (): Promise<string[]> => {
    expect(lastBlob, 'instrument: a file was written').toBeDefined();
    const text = await readBlob(lastBlob as Blob);
    return ALL_NAMES.filter((n) => text.includes(n));
  };

  it('scope "all" exports the SHOWN rows', async () => {
    render(
      <DataGrid items={items} columns={cols()} exportConfig={{ enabled: true, formats: ['csv'], scope: 'all' }} filterBuilder={GridFilterBuilderV9} initialFilterModel={model({ fieldName: 'city', operator: 'eq', value: 'Oslo' })} />,
      { wrapper },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(await exportedNames()).toEqual(['Alpha', 'Gamma']);
  });

  it('★ export of the selection after a filter hid a selected row and was cleared: only the rows still selected', async () => {
    render(
      <DataGrid items={items} columns={cols()} selectionMode="multiple" exportConfig={{ enabled: true, formats: ['csv'], scope: 'selected' }} filterBuilder={GridFilterBuilderV9} />,
      { wrapper },
    );
    fireEvent.click(rowOf('Beta').querySelector('input[type="checkbox"]') as HTMLElement);
    await build([A]);
    fireEvent.click(rowOf('Gamma').querySelector('input[type="checkbox"]') as HTMLElement);
    fireEvent.click(filtersButton());
    fireEvent.click(within(drawer()).getByRole('button', { name: 'Clear all' }));
    fireEvent.click(within(drawer()).getByRole('button', { name: 'Apply' }));
    await closedProof();
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(await exportedNames()).toEqual(['Gamma']);
  });
});

describe('NestedGrid look="ce" — the first-row rule follows the DISPLAYED rows', () => {
  it('when a filter removes items[0], the new first row is the unruled one', () => {
    const nested = { mode: 'inline' as const, getChildren: () => [], childColumns: [] };
    // Control: no filter, so Alpha (items[0]) is first — its class string IS the unruled one.
    const { unmount } = render(<NestedGrid look="ce" items={items} columns={cols()} nested={nested} filterBuilder={GridFilterBuilderV9} />, { wrapper });
    const [first, second] = bodyRows();
    const unruled = first.className;
    expect(second.className, 'instrument: a later row IS ruled (else there is no rule to observe)').not.toBe(unruled);
    unmount();
    render(
      <NestedGrid
        look="ce"
        items={items}
        columns={cols()}
        nested={nested}
        filterBuilder={GridFilterBuilderV9}
        initialFilterModel={model({ fieldName: 'city', operator: 'eq', value: 'Rome' })}
      />,
      { wrapper },
    );
    const rows = bodyRows();
    expect(shownNames()).toEqual(['Beta', 'Delta']);
    expect(rows[0].className).toBe(unruled);
    expect(rows[1].className).not.toBe(unruled);
  });
});
