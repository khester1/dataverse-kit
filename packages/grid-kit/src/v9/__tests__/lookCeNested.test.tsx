// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent, cleanup, within, act } from '@testing-library/react';
import type { ColumnDef, NestedConfig } from '../../types';
import { NestedGrid } from '../hosts/nested/NestedGrid';
import { wrapper } from './testUtils';

// jsdom does no layout: the measured GEOMETRY of the inline nested look="ce" is gated in a real
// browser against the org capture (ce-parity). These pin STRUCTURE and behaviour, counts first.
afterEach(cleanup);

let errorSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  expect(errorSpy.mock.calls.map((c) => String(c[0]).slice(0, 160))).toEqual([]);
  errorSpy.mockRestore();
});

type Parent = { key: string; name: string; phone: string | null } & Record<string, unknown>;
type Child = { key: string; title: string; note: string | null } & Record<string, unknown>;
const items: Parent[] = [
  { key: 'a', name: 'Adatum', phone: '555-0101' },
  { key: 'f', name: 'Fabrikam', phone: null },
  { key: 'n', name: 'Northwind', phone: '555-0103' },
];
const columns: ColumnDef<Parent>[] = [
  { key: 'name', fieldName: 'name', name: 'Account Name', rendererType: 'text' },
  { key: 'phone', fieldName: 'phone', name: 'Main Phone', rendererType: 'text' },
];
const childColumns: ColumnDef<Child>[] = [
  { key: 'title', fieldName: 'title', name: 'Title', rendererType: 'text' },
  { key: 'note', fieldName: 'note', name: 'Note', rendererType: 'text' },
];
const kids: Record<string, Child[]> = {
  a: [{ key: 'a1', title: 'Adatum Health', note: 'x' }, { key: 'a2', title: 'Adatum Retail', note: null }],
  f: [{ key: 'f1', title: 'Fabrikam East', note: 'y' }],
  n: [],
};
const inline = (over: Partial<NestedConfig<Parent, Child>> = {}): NestedConfig<Parent, Child> => ({
  mode: 'inline',
  childColumns,
  getChildren: (p) => kids[p.key],
  ...over,
});

const body = () => document.querySelector('.fui-DataGridBody')!;
// `.children`, not `:scope > …`: jsdom's selector engine matched the CHILD grid's rows through it.
const bodyRows = (): HTMLElement[] => [...body().children].filter((c): c is HTMLElement => c.getAttribute('role') === 'row');
const detailRows = (): HTMLElement[] => bodyRows().filter((r) => r.hasAttribute('data-gridkit-detail-row'));
const parentRows = (): HTMLElement[] => bodyRows().filter((r) => !r.hasAttribute('data-gridkit-detail-row'));
const expanders = (): HTMLElement[] => parentRows().map((r) => r.querySelector<HTMLElement>('[data-gridkit-expander]')!);

describe('v9 NestedGrid inline look="ce"', () => {
  it('is ONE ce grid: select + expander + data columns in the header, no manual Table', () => {
    render(<NestedGrid<Parent, Child> look="ce" items={items} columns={columns} nested={inline()} selectionMode="multiple" />, { wrapper });
    expect(document.querySelectorAll('[data-gridkit-look="ce"]')).toHaveLength(1);
    const header = document.querySelector('.fui-DataGridHeader [role="row"]')!;
    expect(header.querySelectorAll(':scope > *').length).toBe(1 + 1 + columns.length);
    expect([...document.querySelectorAll('[role="columnheader"]')].map((h) => h.textContent)).toEqual(['', 'Account Name', 'Main Phone']);
    expect(parentRows()).toHaveLength(3);
    expect(detailRows()).toHaveLength(0);
    expect(expanders().every(Boolean)).toBe(true);
    for (const e of expanders()) expect(e.getAttribute('aria-expanded')).toBe('false');
  });

  it('the select cell narrows to the checkbox zone in every row (header, data) — 19.9 + 24.1 = 44', () => {
    render(<NestedGrid<Parent, Child> look="ce" items={items} columns={columns} nested={inline()} selectionMode="multiple" />, { wrapper });
    const selectCells = [...document.querySelectorAll<HTMLElement>('.fui-TableSelectionCell')];
    expect(selectCells.length).toBe(1 + items.length);
    for (const c of selectCells) expect([c.style.minWidth, c.style.maxWidth]).toEqual(['19.9px', '19.9px']);
  });

  it('without selection there is no select cell; the expander column remains', () => {
    render(<NestedGrid<Parent, Child> look="ce" items={items} columns={columns} nested={inline()} />, { wrapper });
    expect(document.querySelectorAll('.fui-TableSelectionCell')).toHaveLength(0);
    expect(expanders()).toHaveLength(3);
  });

  it('expanding inserts a detail row DIRECTLY after its parent, holding a ce child grid', () => {
    render(<NestedGrid<Parent, Child> look="ce" items={items} columns={columns} nested={inline()} selectionMode="multiple" />, { wrapper });
    fireEvent.click(expanders()[0]);
    expect(detailRows()).toHaveLength(1);
    const rows = bodyRows();
    expect(rows).toHaveLength(items.length + 1);
    expect(rows[1].hasAttribute('data-gridkit-detail-row')).toBe(true);
    expect(expanders()[0].getAttribute('aria-expanded')).toBe('true');
    const child = rows[1].querySelector('[data-gridkit-look]')!;
    expect(child.getAttribute('data-gridkit-look')).toBe('ce');
    expect([...child.querySelector('.fui-DataGridBody')!.children].filter((r) => r.getAttribute('role') === 'row')).toHaveLength(2);
    // Its own "Rows: N"; no toolbar.
    expect(child.querySelector('[data-gridkit-row-count]')!.textContent).toBe('Rows: 2');
    expect(child.querySelector('[data-gridkit-toolbar]')).toBeNull();
    // ce empty cells in the child are blank beside a filled sibling.
    const retail = within(child as HTMLElement).getByText('Adatum Retail').closest('[role="row"]')!;
    expect([...retail.querySelectorAll('[role="gridcell"]')].map((c) => c.textContent)).toEqual(['Adatum Retail', '']);
  });

  it('several rows can be open at once, each with its own detail row', () => {
    render(<NestedGrid<Parent, Child> look="ce" items={items} columns={columns} nested={inline()} />, { wrapper });
    fireEvent.click(expanders()[0]);
    fireEvent.click(expanders()[1]);
    expect(detailRows()).toHaveLength(2);
    expect(bodyRows().map((r) => (r.hasAttribute('data-gridkit-detail-row') ? 'D' : 'P'))).toEqual(['P', 'D', 'P', 'D', 'P']);
    fireEvent.click(expanders()[0]);
    expect(detailRows()).toHaveLength(1);
  });

  it('expanding never selects the row', () => {
    const onSelectionChanged = vi.fn();
    render(<NestedGrid<Parent, Child> look="ce" items={items} columns={columns} nested={inline()} selectionMode="multiple" onSelectionChanged={onSelectionChanged} />, { wrapper });
    fireEvent.click(expanders()[1]);
    fireEvent.click(expanders()[1]);
    expect(onSelectionChanged).not.toHaveBeenCalled();
    for (const r of parentRows()) expect(r.getAttribute('aria-selected')).toBe('false');
  });

  it('a lazy getChildren is called ONCE per parent across expand / collapse / re-expand, with a spinner meanwhile', async () => {
    let resolve!: (rows: Child[]) => void;
    const getChildren = vi.fn(() => new Promise<Child[]>((r) => (resolve = r)));
    render(<NestedGrid<Parent, Child> look="ce" items={items} columns={columns} nested={inline({ getChildren })} />, { wrapper });
    fireEvent.click(expanders()[0]);
    expect(detailRows()).toHaveLength(1);
    expect(within(detailRows()[0]).getByText('Loading related records…')).toBeTruthy();
    await act(async () => resolve(kids.a));
    expect(within(detailRows()[0]).getByText('Adatum Health')).toBeTruthy();
    fireEvent.click(expanders()[0]);
    fireEvent.click(expanders()[0]);
    expect(within(detailRows()[0]).getByText('Adatum Health')).toBeTruthy();
    expect(getChildren).toHaveBeenCalledTimes(1);
  });

  it('every data row after the FIRST carries the rule class (one class for all of them)', () => {
    render(<NestedGrid<Parent, Child> look="ce" items={items} columns={columns} nested={inline()} />, { wrapper });
    const cls = parentRows().map((r) => r.className);
    expect(cls).toHaveLength(3);
    expect(cls[1]).toBe(cls[2]);
    expect(cls[0]).not.toBe(cls[1]);
  });

  it('parent ce empty cells are blank; "Rows: N" counts parents', () => {
    render(<NestedGrid<Parent, Child> look="ce" items={items} columns={columns} nested={inline()} />, { wrapper });
    const fab = parentRows()[1];
    expect([...fab.querySelectorAll('[role="gridcell"]')].map((c) => c.textContent)).toEqual(['', 'Fabrikam', '']);
    fireEvent.click(expanders()[0]);
    const counts = [...document.querySelectorAll('[data-gridkit-row-count]')].map((e) => e.textContent);
    expect(counts).toEqual(['Rows: 2', 'Rows: 3']);
  });

  it('Ctrl+End with the LAST parent expanded lands on the last PARENT row, not inside its child', () => {
    render(<NestedGrid<Parent, Child> look="ce" items={items.slice(0, 2)} columns={columns} nested={inline()} selectionMode="multiple" />, { wrapper });
    fireEvent.click(expanders()[1]);
    expect(detailRows()).toHaveLength(1);
    const first = parentRows()[0];
    first.focus();
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: 'End', ctrlKey: true });
    const lastParent = parentRows()[1];
    expect(lastParent.contains(document.activeElement)).toBe(true);
    expect(detailRows()[0].contains(document.activeElement)).toBe(false);
  });

  it('a parent with NO children expands to a child grid reading "Rows: 0"', () => {
    render(<NestedGrid<Parent, Child> look="ce" items={items} columns={columns} nested={inline()} />, { wrapper });
    fireEvent.click(expanders()[2]);
    expect(detailRows()).toHaveLength(1);
    const child = detailRows()[0].querySelector('[data-gridkit-look="ce"]')!;
    expect([...child.querySelector('.fui-DataGridBody')!.children]).toHaveLength(0);
    expect(child.querySelector('[data-gridkit-row-count]')!.textContent).toBe('Rows: 0');
  });

  it('the expander column header has an accessible name', () => {
    render(<NestedGrid<Parent, Child> look="ce" items={items} columns={columns} nested={inline()} selectionMode="multiple" />, { wrapper });
    const headers = [...document.querySelectorAll('[role="columnheader"]')];
    expect(headers).toHaveLength(1 + columns.length);
    expect(headers[0].getAttribute('aria-label')).toBe('Expand row');
  });

  it('double-clicking the expander is not a row navigate', () => {
    const onRowNavigate = vi.fn();
    render(<NestedGrid<Parent, Child> look="ce" items={items} columns={columns} nested={inline()} onRowNavigate={onRowNavigate} />, { wrapper });
    fireEvent.doubleClick(expanders()[0]);
    expect(onRowNavigate).not.toHaveBeenCalled();
    // …while a double-click on the row itself still is (the guard is the expander's, not the row's).
    fireEvent.doubleClick(parentRows()[0]);
    expect(onRowNavigate).toHaveBeenCalledTimes(1);
  });

  it('a CHILD grid with its own aggregate row keeps its Ctrl+End (the filter is bounded to each grid)', () => {
    type Kid = Child & { n: number };
    const kidCols: ColumnDef<Kid>[] = [
      { key: 'title', fieldName: 'title', name: 'Title', rendererType: 'text' },
      { key: 'n', fieldName: 'n', name: 'N', rendererType: 'number', aggregate: 'sum' },
    ];
    const rows: Record<string, Kid[]> = { a: [{ key: 'k1', title: 'One', note: null, n: 1 }, { key: 'k2', title: 'Two', note: null, n: 2 }] };
    render(
      <NestedGrid<Parent, Kid> look="ce" items={items.slice(0, 1)} columns={columns} nested={{ mode: 'inline', childColumns: kidCols, getChildren: (p) => rows[p.key] ?? [], childSelectionMode: 'multiple' }} />,
      { wrapper },
    );
    fireEvent.click(expanders()[0]);
    const child = detailRows()[0].querySelector<HTMLElement>('[data-gridkit-look="ce"]')!;
    const childRows = [...child.querySelector('.fui-DataGridBody')!.children] as HTMLElement[];
    expect(childRows).toHaveLength(2);
    expect(child.querySelectorAll('[data-gridkit-aggregate-footer] [role="row"]')).toHaveLength(1);
    childRows[0].focus();
    expect(document.activeElement).toBe(childRows[0]);
    fireEvent.keyDown(childRows[0], { key: 'End', ctrlKey: true });
    // The child's own handler moved focus to its last BODY row (unbounded, it found no rows at all).
    expect(childRows[1].contains(document.activeElement)).toBe(true);
  });
});
