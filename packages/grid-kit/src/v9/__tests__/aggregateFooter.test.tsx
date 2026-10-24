// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { render, cleanup, fireEvent } from '@testing-library/react';
import type { ColumnDef } from '../../types';
import { DataGrid } from '../hosts/DataGrid';
import { GroupedGrid } from '../hosts/GroupedGrid';
import { wrapper } from './testUtils';

afterEach(cleanup);

interface Row extends Record<string, unknown> {
  key: string;
  name: string;
  status: string;
  amount: number | null;
  pct: number | null;
}

const items: Row[] = [
  { key: '1', name: 'Alpha', status: 'Open', amount: 100, pct: 10 },
  { key: '2', name: 'Beta', status: 'Open', amount: 200, pct: null },
  { key: '3', name: 'Gamma', status: 'Won', amount: null, pct: 30 },
];

const columns: ColumnDef<Row>[] = [
  { key: 'name', fieldName: 'name', name: 'Name', rendererType: 'text' },
  { key: 'amount', fieldName: 'amount', name: 'Amount', rendererType: 'currency', aggregate: ['sum', 'avg'] },
  { key: 'pct', fieldName: 'pct', name: 'Pct', rendererType: 'number', aggregate: 'avg' },
];

const footer = (root: ParentNode = document): HTMLElement =>
  root.querySelector('[data-gridkit-aggregate-footer]') as HTMLElement;
const footerRows = (root: ParentNode = document): HTMLElement[] =>
  [...root.querySelectorAll('[data-gridkit-aggregate-footer] [data-aggregate-fn]')] as HTMLElement[];
const cellTexts = (row: HTMLElement): string[] =>
  [...row.querySelectorAll('[role="gridcell"]')].map((c) => (c.textContent ?? '').trim());

describe('v9 DataGrid — multi-row aggregate footer', () => {
  it('renders ONE row per function, each cell under its own column', () => {
    render(<DataGrid items={items} columns={columns} />, { wrapper });
    const r = footerRows();
    expect(r.map((x) => x.getAttribute('data-aggregate-fn'))).toEqual(['sum', 'avg']);
    expect(cellTexts(r[0])).toEqual(['', '$300.00', '']);
    // avg over NON-null values only: amount (100+200)/2, pct (10+30)/2.
    expect(cellTexts(r[1])).toEqual(['', 'avg $150.00', 'avg 20']);
    expect(r.map((x) => x.getAttribute('aria-label'))).toEqual(['Total', 'Average']);
  });

  it('the footer is INSIDE the grid (so it joins the grid sizing + horizontal scroll)', () => {
    render(<DataGrid items={items} columns={columns} />, { wrapper });
    const grid = document.querySelector('[role="grid"]')!;
    expect(grid.contains(footer())).toBe(true);
  });

  it('aggregateResults wins per (field, fn); a supplied null is blank; an absent pair is computed', () => {
    render(
      <DataGrid items={items} columns={columns} aggregateResults={{ amount: { sum: 123456 }, pct: { avg: null } }} />,
      { wrapper },
    );
    const r = footerRows();
    expect(cellTexts(r[0])).toEqual(['', '$123,456.00', '']);
    expect(cellTexts(r[1])).toEqual(['', 'avg $150.00', '']);
  });

  it('a consumer aggregateFormat that returns EMPTY renders blank — not a bare "avg" label', () => {
    const fmtCols = columns.map((c) => (c.aggregate ? { ...c, aggregateFormat: () => '' } : c));
    render(<DataGrid items={items} columns={fmtCols} />, { wrapper });
    for (const row of footerRows()) expect(cellTexts(row).every((t) => t === '')).toBe(true);
  });

  it('aggregateItems feeds every row that was not precomputed', () => {
    const all = [...items, { key: '4', name: 'Delta', status: 'Won', amount: 700, pct: 50 }];
    render(<DataGrid items={items.slice(0, 1)} aggregateItems={all} columns={columns} />, { wrapper });
    expect(cellTexts(footerRows()[0])).toEqual(['', '$1,000.00', '']);
  });

  it('an empty aggregate list renders no footer at all', () => {
    render(
      <DataGrid items={items} columns={[{ ...columns[1], aggregate: [] }, { ...columns[0] }]} />,
      { wrapper },
    );
    expect(footer()).toBeNull();
  });

  it('selectable: a selection cell WITHOUT its checkbox keeps the columns aligned', () => {
    render(<DataGrid items={items} columns={columns} selectionMode="multiple" />, { wrapper });
    const header = document.querySelector('[role="grid"] [role="row"]')!;
    for (const row of footerRows()) {
      // same number of cells as the header row (selection cell + 3 columns)
      expect(row.children.length).toBe(header.children.length);
      expect(row.querySelector('input,[role="checkbox"],[role="radio"]')).toBeNull();
    }
  });

  it('the footer takes no tab stop', () => {
    render(<DataGrid items={items} columns={columns} selectionMode="single" />, { wrapper });
    const rows = footerRows();
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.hasAttribute('tabindex')).toBe(false);
      expect(row.querySelector('[tabindex]:not([tabindex="-1"])')).toBeNull();
    }
  });

  it('an undefined precomputed value counts as ABSENT (computed); only null means blank', () => {
    render(<DataGrid items={items} columns={columns} aggregateResults={{ amount: { sum: undefined } }} />, { wrapper });
    expect(cellTexts(footerRows()[0])).toEqual(['', '$300.00', '']);
  });

  it('sticky only inside a bounded (height) grid', () => {
    const { unmount } = render(<DataGrid items={items} columns={columns} />, { wrapper });
    expect(footer().style.position).toBe('');
    unmount();
    render(<DataGrid items={items} columns={columns} height={300} />, { wrapper });
    expect(footer().style.position).toBe('sticky');
  });

  it('Ctrl+End still reaches the last BODY row (the footer is the last [role=row] and has nothing focusable)', () => {
    render(<DataGrid items={items} columns={columns} selectionMode="multiple" />, { wrapper });
    const grid = document.querySelector('[role="grid"]') as HTMLElement;
    const bodyRows = [...grid.querySelectorAll('[role="row"]')].filter(
      (r) => !r.closest('[data-gridkit-aggregate-footer]'),
    );
    const lastBody = bodyRows[bodyRows.length - 1] as HTMLElement;
    expect(lastBody.textContent).toContain('Gamma');
    (grid.querySelector('[role="gridcell"][tabindex]') as HTMLElement).focus();
    const before = document.activeElement;
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'End', ctrlKey: true });
    expect(document.activeElement).not.toBe(before);
    expect(lastBody.contains(document.activeElement)).toBe(true);
  });

  it('resizable: each footer cell takes the SAME width style as its header cell', () => {
    // Distinct min widths: jsdom has a 0px container, so each column settles at its minimum —
    // distinct values make a footer bound to the WRONG column fail, not just a missing width.
    const sized = columns.map((c, i) => ({ ...c, width: 150 + i * 40, minWidth: 90 + i * 30 }));
    render(<DataGrid items={items} columns={sized} resizableColumns />, { wrapper });
    const headerCells = [...document.querySelectorAll('[role="columnheader"]')] as HTMLElement[];
    expect(headerCells).toHaveLength(3);
    const widths = headerCells.map((h) => h.style.width);
    // Proves the header carries an explicit width at all — otherwise equality is vacuous.
    expect(widths.every((w) => /\dpx$/.test(w))).toBe(true);
    expect(new Set(widths).size).toBe(3);
    for (const row of footerRows()) {
      const cells = [...row.querySelectorAll('[role="gridcell"]')] as HTMLElement[];
      expect(cells.map((c) => c.style.width)).toEqual(widths);
    }
  });
});

describe('v9 GroupedGrid — subtotals + grand total', () => {
  it('per-group subtotals render inside each group grid; the grand total takes aggregateResults', () => {
    render(
      <GroupedGrid
        items={items}
        columns={columns}
        group={{ groupBy: 'status', showGroupAggregates: true }}
        aggregateResults={{ amount: { sum: 999 } }}
      />,
      { wrapper },
    );
    const grids = [...document.querySelectorAll('[data-gridkit-group-key] [role="grid"]')];
    expect(grids).toHaveLength(2);
    // Open group: 100+200; Won group: the only amount is null → blank sum.
    expect(cellTexts(footerRows(grids[0])[0])).toEqual(['', '$300.00', '']);
    expect(cellTexts(footerRows(grids[1])[0])).toEqual(['', '', '']);
    // The grand total is its own (headerless) grid, outside the group grids, and the only one given
    // the override.
    const grands = [...document.querySelectorAll('[data-gridkit-grand-total]')];
    expect(grands).toHaveLength(1);
    expect(grids.some((g) => g.contains(grands[0]))).toBe(false);
    const grand = grands[0].querySelector('[data-gridkit-aggregate-footer]')!;
    expect(grand).toBeTruthy();
    const grandRows = [...grand.querySelectorAll('[data-aggregate-fn]')] as HTMLElement[];
    expect(grandRows.map((r) => r.getAttribute('data-aggregate-fn'))).toEqual(['sum', 'avg']);
    expect(cellTexts(grandRows[0])).toEqual(['', '$999.00', '']);
    expect(cellTexts(grandRows[1])).toEqual(['', 'avg $150.00', 'avg 20']);
  });

  it('without showGroupAggregates, only the grand total renders', () => {
    render(<GroupedGrid items={items} columns={columns} group={{ groupBy: 'status' }} />, { wrapper });
    const grids = [...document.querySelectorAll('[data-gridkit-group-key] [role="grid"]')];
    expect(grids).toHaveLength(2);
    const footers = [...document.querySelectorAll('[data-gridkit-aggregate-footer]')];
    expect(footers).toHaveLength(1);
    expect(grids.some((g) => g.contains(footers[0]))).toBe(false);
    expect(footers[0].closest('[data-gridkit-grand-total]')).toBeTruthy();
  });
});
