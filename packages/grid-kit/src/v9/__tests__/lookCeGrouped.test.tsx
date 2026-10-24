// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import React from 'react';
import { render, fireEvent, cleanup, within } from '@testing-library/react';
import type { ColumnDef, GroupConfig } from '../../types';
import { GroupedGrid } from '../hosts/GroupedGrid';
import { wrapper } from './testUtils';

// jsdom does no layout: the measured GEOMETRY of GroupedGrid look="ce" is gated in a real browser
// against the org capture (ce-parity). These pin STRUCTURE and behaviour. Counts come first in every
// test — a property asserted over an empty set is not a pass.
afterEach(cleanup);

let errorSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  // React key / DOM-nesting warnings arrive as console.error — none are allowed.
  expect(errorSpy.mock.calls.map((c) => String(c[0]).slice(0, 160))).toEqual([]);
  errorSpy.mockRestore();
});

interface Row extends Record<string, unknown> {
  key: string;
  name: string;
  status: string | null;
  city: string | null;
}
// INTERLEAVED and out of label order: first appearance is Open, Active, Closed, (blank) — the
// measured stock order is by LABEL, so a first-appearance implementation fails the order test.
const items: Row[] = [
  { key: '1', name: 'Alpha', status: 'Open', city: 'Oslo' },
  { key: '2', name: 'Beta', status: 'Active', city: null },
  { key: '3', name: 'Gamma', status: 'Open', city: 'Rome' },
  { key: '4', name: 'Delta', status: 'Closed', city: 'Paris' },
  { key: '5', name: 'Epsilon', status: 'Active', city: 'Lima' },
  { key: '6', name: 'Zeta', status: null, city: 'Kyiv' },
];
const columns: ColumnDef<Row>[] = [
  { key: 'name', fieldName: 'name', name: 'Name', rendererType: 'text' },
  { key: 'status', fieldName: 'status', name: 'Status', rendererType: 'text' },
  { key: 'city', fieldName: 'city', name: 'City', rendererType: 'text' },
];
const group: GroupConfig<Row> = { groupBy: 'status' };

const bodyRows = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.fui-DataGridBody [role="row"]')];
const groupRows = (): HTMLElement[] => bodyRows().filter((r) => r.hasAttribute('data-gridkit-group-row'));
const dataRows = (): HTMLElement[] => bodyRows().filter((r) => !r.hasAttribute('data-gridkit-group-row'));
const groupRow = (label: string): HTMLElement => {
  const r = groupRows().filter((g) => g.getAttribute('aria-label') === label);
  expect(r, `group row "${label}"`).toHaveLength(1);
  return r[0];
};
const leadCell = (row: HTMLElement): HTMLElement => {
  const c = row.querySelector<HTMLElement>('[data-gridkit-group-label]')!.closest<HTMLElement>('[role="gridcell"]');
  expect(c).toBeTruthy();
  return c!;
};

describe('v9 GroupedGrid look="ce"', () => {
  it('is ONE grid: one header row, a "Group by: <column>" column first, the grouped column kept', () => {
    render(<GroupedGrid look="ce" items={items} columns={columns} group={group} selectionMode="multiple" />, { wrapper });
    expect(document.querySelectorAll('[role="grid"]')).toHaveLength(1);
    expect(document.querySelector('.fui-Accordion')).toBeNull();
    const headers = [...document.querySelectorAll('[role="columnheader"]')].map((h) => h.textContent);
    expect(headers).toEqual(['Group by: Status', 'Name', 'Status', 'City']);
    expect(document.querySelector('[data-gridkit-look="ce"]')).toBeTruthy();
  });

  it('starts ALL collapsed, groups ordered by label, label + count as ONE run, "(blank)" lowercase', () => {
    render(<GroupedGrid look="ce" items={items} columns={columns} group={group} />, { wrapper });
    expect(groupRows()).toHaveLength(4);
    expect(dataRows()).toHaveLength(0);
    expect(groupRows().map((r) => r.getAttribute('aria-label'))).toEqual(['(blank) (1)', 'Active (2)', 'Closed (1)', 'Open (2)']);
    for (const r of groupRows()) expect(r.getAttribute('aria-expanded')).toBe('false');
    // ONE text node per label: "Label (n)" is a single run, not label + count spans.
    const labels = [...document.querySelectorAll('[data-gridkit-group-label]')];
    expect(labels).toHaveLength(4);
    for (const l of labels) expect(l.childNodes).toHaveLength(1);
  });

  it('collapsedByDefault:false opens every group; showCount:false drops the count', () => {
    render(<GroupedGrid look="ce" items={items} columns={columns} group={{ ...group, collapsedByDefault: false, showCount: false }} />, { wrapper });
    expect(groupRows()).toHaveLength(4);
    expect(dataRows()).toHaveLength(items.length);
    expect(bodyRows()).toHaveLength(4 + items.length);
    expect(groupRows().map((r) => r.getAttribute('aria-label'))).toEqual(['(blank)', 'Active', 'Closed', 'Open']);
    // Interleaved input → each group's rows directly under its header.
    expect(bodyRows().map((r) => r.getAttribute('aria-label') ?? within(r).queryByText(/^(Alpha|Beta|Gamma|Delta|Epsilon|Zeta)$/)?.textContent)).toEqual([
      '(blank)', 'Zeta', 'Active', 'Beta', 'Epsilon', 'Closed', 'Delta', 'Open', 'Alpha', 'Gamma',
    ]);
  });

  it('a click on the Group-by cell expands ONE group; body rows = groups + that group\'s rows', () => {
    render(<GroupedGrid look="ce" items={items} columns={columns} group={group} />, { wrapper });
    fireEvent.click(leadCell(groupRow('Open (2)')));
    expect(groupRow('Open (2)').getAttribute('aria-expanded')).toBe('true');
    expect(dataRows()).toHaveLength(2);
    expect(bodyRows()).toHaveLength(4 + 2);
    fireEvent.click(leadCell(groupRow('Open (2)')));
    expect(groupRow('Open (2)').getAttribute('aria-expanded')).toBe('false');
    expect(dataRows()).toHaveLength(0);
  });

  it('Space on the focused group row toggles it — the SAME element stays focused', () => {
    render(<GroupedGrid look="ce" items={items} columns={columns} group={group} />, { wrapper });
    const r = groupRow('Active (2)');
    r.focus();
    expect(document.activeElement).toBe(r);
    fireEvent.keyDown(r, { key: ' ' });
    expect(dataRows()).toHaveLength(2);
    // Not remounted by the toggle (a remount would drop focus from the row being toggled).
    expect(groupRow('Active (2)')).toBe(r);
    expect(r.getAttribute('aria-expanded')).toBe('true');
    fireEvent.keyDown(r, { key: ' ' });
    expect(dataRows()).toHaveLength(0);
    expect(groupRow('Active (2)')).toBe(r);
  });

  it('toggling a group never changes the selection', () => {
    const onSelectionChanged = vi.fn();
    render(<GroupedGrid look="ce" items={items} columns={columns} group={group} selectionMode="multiple" onSelectionChanged={onSelectionChanged} />, { wrapper });
    const r = groupRow('Open (2)');
    fireEvent.click(leadCell(r));
    r.focus();
    fireEvent.keyDown(r, { key: ' ' });
    fireEvent.keyDown(r, { key: ' ' });
    expect(onSelectionChanged).not.toHaveBeenCalled();
    expect(dataRows()).toHaveLength(2);
    for (const d of dataRows()) expect(d.getAttribute('aria-selected')).toBe('false');
  });

  it('the group checkbox selects the group\'s rows (collapsed or not) and shows mixed', () => {
    const onSelectionChanged = vi.fn();
    render(<GroupedGrid look="ce" items={items} columns={columns} group={group} selectionMode="multiple" onSelectionChanged={onSelectionChanged} />, { wrapper });
    const box = (label: string) => within(groupRow(label)).getByRole('checkbox');
    fireEvent.click(box('Active (2)'));
    expect(onSelectionChanged).toHaveBeenCalledTimes(1);
    expect(onSelectionChanged.mock.calls[0][0].map((r: Row) => r.key).sort()).toEqual(['2', '5']);
    expect((box('Active (2)') as HTMLInputElement).checked).toBe(true);
    // Open it, untick one row → the group reads mixed.
    fireEvent.click(leadCell(groupRow('Active (2)')));
    expect(dataRows()).toHaveLength(2);
    const beta = dataRows().find((d) => within(d).queryByText('Beta'))!;
    fireEvent.click(within(beta).getByRole('checkbox'));
    expect(onSelectionChanged.mock.calls.at(-1)![0].map((r: Row) => r.key)).toEqual(['5']);
    expect((box('Active (2)') as HTMLInputElement).indeterminate || box('Active (2)').getAttribute('aria-checked') === 'mixed').toBe(true);
    // A mixed group's checkbox selects the rest; a full one clears.
    fireEvent.click(box('Active (2)'));
    expect(onSelectionChanged.mock.calls.at(-1)![0].map((r: Row) => r.key).sort()).toEqual(['2', '5']);
    fireEvent.click(box('Active (2)'));
    expect(onSelectionChanged.mock.calls.at(-1)![0]).toEqual([]);
  });

  it('select in A, collapse A, select in B → the emission still holds A\'s record', () => {
    const onSelectionChanged = vi.fn();
    render(<GroupedGrid look="ce" items={items} columns={columns} group={{ ...group, collapsedByDefault: false }} selectionMode="multiple" onSelectionChanged={onSelectionChanged} />, { wrapper });
    expect(dataRows()).toHaveLength(items.length);
    const rowOf = (name: string) => dataRows().find((d) => within(d).queryByText(name))!;
    fireEvent.click(within(rowOf('Alpha')).getByRole('checkbox'));
    fireEvent.click(leadCell(groupRow('Open (2)')));
    expect(dataRows()).toHaveLength(items.length - 2);
    fireEvent.click(within(rowOf('Delta')).getByRole('checkbox'));
    expect(onSelectionChanged.mock.calls.at(-1)![0].map((r: Row) => r.key).sort()).toEqual(['1', '4']);
  });

  it('a group row lines its cells up with the columns: select + Group-by + one per data column', () => {
    render(<GroupedGrid look="ce" items={items} columns={columns} group={group} selectionMode="multiple" />, { wrapper });
    const header = document.querySelector('.fui-DataGridHeader [role="row"]')!;
    const headerCells = header.querySelectorAll(':scope > *').length;
    expect(headerCells).toBe(1 + 1 + columns.length);
    for (const r of groupRows()) expect(r.querySelectorAll(':scope > *').length).toBe(headerCells);
    // Only the FIRST group row has no top rule (a class difference, since jsdom has no layout).
    const classes = groupRows().map((r) => r.className);
    expect(new Set(classes.slice(1)).size).toBe(1);
    expect(classes[0]).not.toBe(classes[1]);
  });

  it('ce empty cells are blank beside a filled sibling, and a data row\'s Group-by cell is empty', () => {
    render(<GroupedGrid look="ce" items={items} columns={columns} group={{ ...group, collapsedByDefault: false }} />, { wrapper });
    const beta = dataRows().find((d) => within(d).queryByText('Beta'))!;
    const cells = [...beta.querySelectorAll('[role="gridcell"]')].map((c) => c.textContent);
    expect(cells).toHaveLength(1 + columns.length);
    expect(cells).toEqual(['', 'Beta', 'Active', '']);
  });

  it('"Rows: N" counts records (or totalRowCount), unchanged by expansion', () => {
    const { rerender } = render(<GroupedGrid look="ce" items={items} columns={columns} group={group} />, { wrapper });
    expect(document.querySelector('[data-gridkit-row-count]')!.textContent).toBe('Rows: 6');
    fireEvent.click(leadCell(groupRow('Open (2)')));
    expect(document.querySelector('[data-gridkit-row-count]')!.textContent).toBe('Rows: 6');
    rerender(<GroupedGrid look="ce" items={items} columns={columns} group={group} totalRowCount={2396} />);
    expect(document.querySelector('[data-gridkit-row-count]')!.textContent).toBe('Rows: 2396');
  });

  it('per-group subtotals are not rendered under ce — warned, overall row still shown', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const money: ColumnDef<Row & { amount: number }>[] = [
      { key: 'name', fieldName: 'name', name: 'Name', rendererType: 'text' },
      { key: 'amount', fieldName: 'amount', name: 'Amount', rendererType: 'number', aggregate: 'sum' },
    ];
    const rows = items.map((r, i) => ({ ...r, amount: (i + 1) * 10 }));
    render(<GroupedGrid look="ce" items={rows} columns={money} group={{ ...group, showGroupAggregates: true, collapsedByDefault: false }} />, { wrapper });
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
    const footers = document.querySelectorAll('[data-gridkit-aggregate-footer] [role="row"]');
    expect(footers).toHaveLength(1);
    expect(footers[0].textContent).toContain('210');
    // The footer row has a cell for the Group-by column too, so totals sit under their headers.
    expect(footers[0].querySelectorAll(':scope > *').length).toBe(1 + money.length);
  });

  it('single selection: no group checkbox (same cell count), one row emitted at a time', () => {
    const onSelectionChanged = vi.fn();
    render(<GroupedGrid look="ce" items={items} columns={columns} group={{ ...group, collapsedByDefault: false }} selectionMode="single" onSelectionChanged={onSelectionChanged} />, { wrapper });
    expect(groupRows()).toHaveLength(4);
    const headerCells = document.querySelector('.fui-DataGridHeader [role="row"]')!.querySelectorAll(':scope > *').length;
    expect(headerCells).toBe(1 + 1 + columns.length);
    for (const r of groupRows()) {
      expect(r.querySelectorAll(':scope > *').length).toBe(headerCells);
      expect(within(r).queryByRole('checkbox')).toBeNull();
      expect(within(r).queryByRole('radio')).toBeNull();
    }
    const rowOf = (name: string) => dataRows().find((d) => within(d).queryByText(name))!;
    fireEvent.click(within(rowOf('Alpha')).getByRole('radio'));
    fireEvent.click(within(rowOf('Delta')).getByRole('radio'));
    expect(onSelectionChanged).toHaveBeenCalledTimes(2);
    expect(onSelectionChanged.mock.calls.at(-1)![0].map((r: Row) => r.key)).toEqual(['4']);
  });

  it('Ctrl+End with every group collapsed lands on the LAST group row', () => {
    render(<GroupedGrid look="ce" items={items} columns={columns} group={group} selectionMode="multiple" />, { wrapper });
    expect(groupRows()).toHaveLength(4);
    const first = groupRows()[0];
    first.focus();
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: 'End', ctrlKey: true });
    const last = groupRows()[3];
    // The last row's last tab stop: the row itself (its cells take none).
    expect(document.activeElement === last || last.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(first);
  });

  it('numeric groups order by VALUE (not label), the empty-value group first', () => {
    type N = { key: string; name: string; code: number | null };
    const rows: N[] = [
      { key: 'a', name: 'A', code: 10 },
      { key: 'b', name: 'B', code: -5 },
      { key: 'c', name: 'C', code: null },
      { key: 'd', name: 'D', code: 2 },
      { key: 'e', name: 'E', code: -2147188466 },
    ];
    const cols: ColumnDef<N>[] = [{ key: 'name', fieldName: 'name', name: 'Name', rendererType: 'text' }];
    render(<GroupedGrid<N> look="ce" items={rows} columns={cols} group={{ groupBy: 'code', showCount: false }} />, { wrapper });
    expect(groupRows()).toHaveLength(5);
    // By label (string) this would read -2147188466, -5, 10, 2 — the value order is the claim.
    expect(groupRows().map((r) => r.getAttribute('aria-label'))).toEqual(['(blank)', '-2147188466', '-5', '2', '10']);
  });
});
