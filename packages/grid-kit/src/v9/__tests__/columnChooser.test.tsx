// @vitest-environment jsdom
/**
 * v9 `DataGrid` `columnChooser` — the "Columns" command, its drawer, and the projection.
 *
 * ★ Every "hidden" claim reads the HEADER after the drawer is PROVEN closed (an open modal can
 *   `aria-hide` the grid, which makes an absence query pass vacuously). Dialog queries are scoped by
 *   name. Focus RESTORE itself is tabster behaviour jsdom cannot run — here only its plumbing (the
 *   exact restorer attribute) is pinned; the behaviour is gated in real Chrome (ce-parity).
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react';
import type { ColumnDef } from '../../types';
import { DataGrid } from '../hosts/DataGrid';
import { GridColumnChooserV9 } from '../hosts/GridColumnChooserV9';
import { NestedGrid } from '../hosts/nested/NestedGrid';
import { wrapper } from './testUtils';

afterEach(cleanup);

interface Row extends Record<string, unknown> {
  key: string;
  name: string;
  city: string;
  revenue: number;
}
const items: Row[] = [
  { key: '1', name: 'Alpha', city: 'Oslo', revenue: 10 },
  { key: '2', name: 'Beta', city: 'Rome', revenue: 20 },
];
// Distinct widths: a footer bound to the WRONG column then has the wrong width, not just "a width".
const cols = (): ColumnDef<Row>[] => [
  { key: 'name', fieldName: 'name', name: 'Name', rendererType: 'text', width: 150, minWidth: 90 },
  { key: 'city', fieldName: 'city', name: 'City', rendererType: 'text', width: 190, minWidth: 120 },
  { key: 'revenue', fieldName: 'revenue', name: 'Revenue', rendererType: 'number', width: 230, minWidth: 150, aggregate: 'sum' },
];

const headers = (): string[] =>
  [...document.querySelectorAll('[role="columnheader"]')].map((h) => h.textContent?.trim() ?? '').filter(Boolean);
const chooser = () => screen.getByRole('dialog', { name: /columns/i });
const open = (name: RegExp | string = 'Columns') => fireEvent.click(screen.getByRole('button', { name }));
async function closedProof(): Promise<void> {
  await waitFor(() => expect(screen.queryByRole('dialog', { name: /columns/i })).toBeNull());
}
const listed = (kind: 'shown' | 'hidden'): string[] =>
  [...chooser().querySelectorAll(`[data-gridkit-chooser-${kind}]`)].map((r) => r.getAttribute(`data-gridkit-chooser-${kind}`) ?? '');

describe('v9 DataGrid columnChooser', () => {
  it('opt-in by import: `true` alone warns and adds NO command (no panel to open, nothing bundled)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<DataGrid items={items} columns={cols()} columnChooser toolbar={{ commands: [] }} />, { wrapper });
    expect(screen.queryByRole('button', { name: 'Columns' })).toBeNull();
    expect(headers()).toEqual(['Name', 'City', 'Revenue']);
    expect(warn.mock.calls.flat().join(' ')).toMatch(/columnChooser=\{true\} needs the panel/);
    warn.mockRestore();
  });

  it('(a) off by default — no Columns command, columns as given', () => {
    render(<DataGrid items={items} columns={cols()} toolbar={{ commands: [] }} />, { wrapper });
    expect(screen.queryByRole('button', { name: 'Columns' })).toBeNull();
    expect(headers()).toEqual(['Name', 'City', 'Revenue']);
  });

  it('(b) hiding a MIDDLE column: exact header list, footer aligned, onColumnOrderChange exact', async () => {
    const onOrder = vi.fn();
    render(<DataGrid items={items} columns={cols()} columnChooser={GridColumnChooserV9} resizableColumns onColumnOrderChange={onOrder} />, { wrapper });
    open();
    expect(listed('shown'), 'instrument: the drawer lists the shown columns').toEqual(['name', 'city', 'revenue']);
    fireEvent.click(within(chooser()).getByRole('checkbox', { name: 'Hide City' }));
    fireEvent.click(within(chooser()).getByRole('button', { name: 'Apply' }));
    await closedProof();
    expect(headers()).toEqual(['Name', 'Revenue']);
    expect(onOrder).toHaveBeenLastCalledWith(['name', 'revenue']);
    // The aggregate footer follows the projection: same cell count and the SAME widths as the header.
    const headerWidths = [...document.querySelectorAll('[role="columnheader"]')].map((h) => (h as HTMLElement).style.width);
    expect(new Set(headerWidths).size, 'instrument: distinct header widths').toBe(2);
    const footerRows = [...document.querySelectorAll('[data-gridkit-aggregate-footer] [data-aggregate-fn]')] as HTMLElement[];
    expect(footerRows.length, 'instrument: the aggregate footer row exists').toBeGreaterThan(0);
    for (const row of footerRows) {
      const cells = [...row.querySelectorAll('[role="gridcell"]')] as HTMLElement[];
      expect(cells.map((c) => c.style.width)).toEqual(headerWidths);
    }
  });

  it('(b2) hiding the only aggregate column removes the footer', async () => {
    render(<DataGrid items={items} columns={cols()} columnChooser={GridColumnChooserV9} />, { wrapper });
    expect(screen.getByText('30'), 'instrument: the sum footer renders').toBeTruthy();
    open();
    fireEvent.click(within(chooser()).getByRole('checkbox', { name: 'Hide Revenue' }));
    fireEvent.click(within(chooser()).getByRole('button', { name: 'Apply' }));
    await closedProof();
    expect(headers()).toEqual(['Name', 'City']);
    expect(screen.queryByText('30')).toBeNull();
  });

  it('(c) Move up/down reorders the HEADER; Cancel discards and a re-open shows the APPLIED order', async () => {
    render(<DataGrid items={items} columns={cols()} columnChooser={GridColumnChooserV9} />, { wrapper });
    open();
    fireEvent.click(within(chooser()).getByRole('button', { name: 'Move Revenue up' }));
    expect(listed('shown'), 'instrument: the move landed in the drawer').toEqual(['name', 'revenue', 'city']);
    fireEvent.click(within(chooser()).getByRole('button', { name: 'Apply' }));
    await closedProof();
    expect(headers()).toEqual(['Name', 'Revenue', 'City']);
    open();
    fireEvent.click(within(chooser()).getByRole('button', { name: 'Move Name down' }));
    expect(listed('shown')).toEqual(['revenue', 'name', 'city']);
    fireEvent.click(within(chooser()).getByRole('button', { name: 'Cancel' }));
    await closedProof();
    expect(headers()).toEqual(['Name', 'Revenue', 'City']);
    open();
    expect(listed('shown')).toEqual(['name', 'revenue', 'city']);
  });

  it('(d) the last shown column cannot be hidden — its checkbox is disabled', () => {
    render(<DataGrid items={items} columns={cols()} columnChooser={GridColumnChooserV9} initialVisibleOrder={['name']} />, { wrapper });
    expect(headers(), 'instrument: only Name is shown').toEqual(['Name']);
    open();
    const last = within(chooser()).getByRole('checkbox', { name: 'Hide Name' }) as HTMLInputElement;
    expect(last.disabled).toBe(true);
  });

  it('(e) ★★ a hidden column STAYS hidden when the grid receives a new columns array with the same keys', async () => {
    const { rerender } = render(<DataGrid items={items} columns={cols()} columnChooser={GridColumnChooserV9} />, { wrapper });
    open();
    fireEvent.click(within(chooser()).getByRole('checkbox', { name: 'Hide City' }));
    fireEvent.click(within(chooser()).getByRole('button', { name: 'Apply' }));
    await closedProof();
    expect(headers(), 'instrument: City hidden').toEqual(['Name', 'Revenue']);
    rerender(<DataGrid items={items} columns={cols()} columnChooser={GridColumnChooserV9} />);
    expect(headers()).toEqual(['Name', 'Revenue']);
  });

  it('initialVisibleOrder restores a persisted choice; a column added later appears', () => {
    const { rerender } = render(<DataGrid items={items} columns={cols()} columnChooser={GridColumnChooserV9} initialVisibleOrder={['revenue', 'name']} />, { wrapper });
    expect(headers()).toEqual(['Revenue', 'Name']);
    const withCountry = [...cols(), { key: 'country', fieldName: 'country', name: 'Country', rendererType: 'text' } as ColumnDef<Row>];
    rerender(<DataGrid items={items} columns={withCountry} columnChooser={GridColumnChooserV9} initialVisibleOrder={['revenue', 'name']} />);
    expect(headers()).toEqual(['Revenue', 'Name', 'Country']);
  });

  it('★★ initialVisibleOrder applies when the columns arrive AFTER mount (a PCF host mounts with none)', () => {
    const { rerender } = render(
      <DataGrid items={items} columns={[]} columnChooser={GridColumnChooserV9} initialVisibleOrder={['revenue', 'name']} />,
      { wrapper },
    );
    expect(headers(), 'instrument: no columns yet').toEqual([]);
    rerender(<DataGrid items={items} columns={cols()} columnChooser={GridColumnChooserV9} initialVisibleOrder={['revenue', 'name']} />);
    expect(headers()).toEqual(['Revenue', 'Name']);
  });

  it('★★ a saved choice matching NO current column shows every column — never an empty grid', () => {
    render(<DataGrid items={items} columns={cols()} columnChooser={GridColumnChooserV9} initialVisibleOrder={['renamed_column']} />, { wrapper });
    expect(headers()).toEqual(['Name', 'City', 'Revenue']);
  });

  it('(f) NestedGrid side-panel: "Related" is not choosable and still renders last', () => {
    render(
      <NestedGrid items={items} columns={cols()} columnChooser={GridColumnChooserV9} nested={{ mode: 'side-panel', childColumns: [], getChildren: () => [] }} />,
      { wrapper },
    );
    expect(headers()).toEqual(['Name', 'City', 'Revenue', 'Related']);
    open();
    expect(listed('shown')).toEqual(['name', 'city', 'revenue']);
    expect(within(chooser()).queryByText('Related')).toBeNull();
  });

  it('(g) export still writes a HIDDEN column — the chooser is a view choice, not a data choice', async () => {
    let blob: Blob | undefined;
    (URL as unknown as { createObjectURL: (b: Blob) => string }).createObjectURL = (b: Blob) => ((blob = b), 'blob:x');
    (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = () => undefined;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(<DataGrid items={items} columns={cols()} columnChooser={GridColumnChooserV9} exportConfig={{ enabled: true, formats: ['csv'] }} />, { wrapper });
    open();
    fireEvent.click(within(chooser()).getByRole('checkbox', { name: 'Hide City' }));
    fireEvent.click(within(chooser()).getByRole('button', { name: 'Apply' }));
    await closedProof();
    expect(headers(), 'instrument: City hidden on screen').toEqual(['Name', 'Revenue']);
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    const text = await new Promise<string>((res) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.readAsText(blob as Blob);
    });
    expect(text.split('\r\n')[0].replace(/^\uFEFF/, '')).toBe('Name,City,Revenue');
    click.mockRestore();
  });

  it('look="ce": the command and drawer read "Edit columns"', () => {
    render(<DataGrid items={items} columns={cols()} columnChooser={GridColumnChooserV9} look="ce" />, { wrapper });
    open('Edit columns');
    expect(screen.getByRole('dialog', { name: 'Edit columns' })).toBeTruthy();
  });

  it('(i) plumbing: the Columns button is a focus-restore TARGET (exact attribute)', () => {
    render(<DataGrid items={items} columns={cols()} columnChooser={GridColumnChooserV9} />, { wrapper });
    const btn = screen.getByRole('button', { name: 'Columns' });
    expect(JSON.parse(btn.getAttribute('data-tabster') ?? '{}')).toEqual({ restorer: { type: 1 } });
  });

  describe('collisions are per feature', () => {
    let warn: ReturnType<typeof vi.spyOn>;
    beforeEach(() => {
      warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    });
    afterEach(() => warn.mockRestore());

    it("a consumer '__gridkit_export__' command keeps Columns", () => {
      render(
        <DataGrid
          items={items}
          columns={cols()}
          columnChooser={GridColumnChooserV9}
          exportConfig={{ enabled: true }}
          toolbar={{ commands: [{ key: '__gridkit_export__', text: 'Mine', onClick: () => undefined }] }}
        />,
        { wrapper },
      );
      expect(screen.getByRole('button', { name: 'Columns' })).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Export CSV' })).toBeNull();
    });

    it("a consumer '__gridkit_columns__' command keeps Export, and warns once", () => {
      render(
        <DataGrid
          items={items}
          columns={cols()}
          columnChooser={GridColumnChooserV9}
          exportConfig={{ enabled: true, formats: ['csv'] }}
          toolbar={{ commands: [{ key: '__gridkit_columns__', text: 'My columns', onClick: () => undefined }] }}
        />,
        { wrapper },
      );
      expect(screen.getByRole('button', { name: 'Export' })).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Columns' })).toBeNull();
      expect(warn.mock.calls.filter((c) => /'__gridkit_columns__' command/.test(String(c[0])))).toHaveLength(1);
    });

    it('a consumer export-keyed command with export OFF warns nothing', () => {
      render(
        <DataGrid items={items} columns={cols()} toolbar={{ commands: [{ key: '__gridkit_export__', text: 'Mine', onClick: () => undefined }] }} />,
        { wrapper },
      );
      expect(warn.mock.calls.flat().join(' ')).not.toMatch(/already has a/);
    });
  });
});
