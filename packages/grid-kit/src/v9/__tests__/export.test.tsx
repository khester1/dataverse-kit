// @vitest-environment jsdom
/**
 * v9 `DataGrid` `exportConfig` — the turnkey CSV/JSON export (`hosts/useV9Export.tsx`) and the
 * shared "CSV carries what the grid SHOWS" rule (`export/exportGrid.ts`).
 *
 * ★ Nothing between the grid and the file is mocked: `URL.createObjectURL` is stubbed only to
 *   CAPTURE the real Blob dynamics-utils builds, and the anchor click only to capture its
 *   `download` filename — so every assertion reads the FILE a user would get.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { ColumnDef, GridExportConfig } from '../../types';
import type { V9GridToolbarConfig } from '../types';
import { DataGrid } from '../hosts/DataGrid';
import { ReadOnlyGrid } from '../hosts/ReadOnlyGrid';
import { NestedGrid } from '../hosts/nested/NestedGrid';
import { exportGrid } from '../../export/exportGrid';
import { wrapper } from './testUtils';

afterEach(cleanup);

const FV = '@OData.Community.Display.V1.FormattedValue';

interface Row extends Record<string, unknown> {
  key: string;
  name: string;
}

/** Shaped like Dataverse Web API rows: a choice CODE with its label annotation, a flat lookup GUID
 *  with its name annotation, money with the org's formatted string — the raw value and the
 *  displayed text DIFFER on every one of those, which is the only row that can prove anything. */
const items: Row[] = [
  {
    key: '1',
    name: 'Contoso Ltd',
    statuscode: 1,
    [`statuscode${FV}`]: 'Active',
    _parentaccountid_value: '7d8f3a52-1c2b-4e5f-9a8b-0c1d2e3f4a5b',
    [`_parentaccountid_value${FV}`]: 'Fabrikam Holdings',
    revenue: 1234.5,
    [`revenue${FV}`]: '€1.234,50',
    employees: 1500,
  },
  { key: '2', name: 'Beta', statuscode: 2, [`statuscode${FV}`]: 'Inactive', revenue: 10, [`revenue${FV}`]: '€10,00', employees: 7 },
  { key: '3', name: 'Gamma', statuscode: 1, [`statuscode${FV}`]: 'Active', revenue: 20, [`revenue${FV}`]: '€20,00', employees: 9 },
];

const columns: ColumnDef<Row>[] = [
  { key: 'name', fieldName: 'name', name: 'Name', rendererType: 'text' },
  { key: 'statuscode', fieldName: 'statuscode', name: 'Status', rendererType: 'optionset' },
  { key: 'parent', fieldName: '_parentaccountid_value', name: 'Parent', rendererType: 'lookup' },
  { key: 'revenue', fieldName: 'revenue', name: 'Revenue', rendererType: 'currency' },
  { key: 'employees', fieldName: 'employees', name: 'Employees', rendererType: 'number' },
];

// ── capture the downloaded files ──────────────────────────────────────────────────────────
interface Download {
  filename: string;
  text: Promise<string>;
}
let downloads: Download[];
let lastBlob: Blob | undefined;
const readBlob = (b: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsText(b);
  });

beforeEach(() => {
  downloads = [];
  lastBlob = undefined;
  (URL as unknown as { createObjectURL: (b: Blob) => string }).createObjectURL = (b: Blob) => {
    lastBlob = b;
    return 'blob:captured';
  };
  (URL as unknown as { revokeObjectURL: (u: string) => void }).revokeObjectURL = () => undefined;
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push({ filename: this.download, text: readBlob(lastBlob as Blob) });
  });
});
afterEach(() => vi.restoreAllMocks());

/** CSV text → rows of cells. Strips the BOM. Limits (fine for these fixtures): no embedded
 *  newlines, and a genuinely EMPTY LAST cell is dropped — never assert a trailing empty cell. */
const parseCsv = (text: string): string[][] =>
  text
    .replace(/^\uFEFF/, '')
    .split('\r\n')
    .map((line) => (line.match(/("([^"]|"")*"|[^,]*)(,|$)/g) ?? []).filter((c, i, a) => i < a.length - 1 || c !== '')
      .map((c) => c.replace(/,$/, '').replace(/^"(.*)"$/, '$1').replace(/""/g, '"')));

const cfg = (over: Partial<GridExportConfig> = {}): GridExportConfig => ({ enabled: true, filename: 'accounts', ...over });

// ── the shared rule: CSV = what the grid shows ────────────────────────────────────────────
describe('exportGrid — CSV carries the displayed text, JSON the raw values', () => {
  it('CSV: a FormattedValue wins over the raw value; a column without one keeps dynamics-utils formatting', async () => {
    exportGrid([items[0]], columns, 'csv', 'accounts');
    expect(downloads).toHaveLength(1);
    expect(downloads[0].filename).toBe('accounts.csv');
    const text = await downloads[0].text;
    expect(parseCsv(text)).toEqual([
      ['Name', 'Status', 'Parent', 'Revenue', 'Employees'],
      // ★ the half that differs: `1`/GUID/1234.5 is what a raw export wrote
      ['Contoso Ltd', 'Active', 'Fabrikam Holdings', '€1.234,50', '1,500'],
    ]);
  });

  it('two columns on ONE field keep their own formatting (rows are keyed by column position)', async () => {
    const twoViews: ColumnDef<Row>[] = [
      { key: 'n', fieldName: 'employees', name: 'As number', rendererType: 'number' },
      { key: 'c', fieldName: 'employees', name: 'As currency', rendererType: 'currency' },
    ];
    exportGrid([items[0]], twoViews, 'csv', 'x');
    expect(parseCsv(await downloads[0].text)[1]).toEqual(['1,500', '$1,500.00']);
  });

  it('JSON stays raw — codes, GUIDs and numbers, not labels', async () => {
    exportGrid([items[0]], columns, 'json', 'accounts');
    const parsed = JSON.parse(await downloads[0].text) as Array<Record<string, unknown>>;
    expect(downloads[0].filename).toBe('accounts.json');
    expect(parsed).toHaveLength(1);
    // dynamics-utils writes a choice code as the string "1" in JSON (unchanged here) — the claim is
    // that JSON carries the CODE and the GUID, never the labels the CSV now shows.
    expect(parsed[0]).toMatchObject({ Status: '1', Parent: '7d8f3a52-1c2b-4e5f-9a8b-0c1d2e3f4a5b', Revenue: 1234.5 });
    expect(JSON.stringify(parsed[0])).not.toMatch(/Active|Fabrikam|€/);
  });
});

// ── the v9 grid's Export command ──────────────────────────────────────────────────────────
const exportedNames = async (i = 0): Promise<string[]> =>
  parseCsv(await downloads[i].text).slice(1).map((r) => r[0]);

describe('v9 DataGrid exportConfig', () => {
  it('(a) no exportConfig → no Export command and no synthesized toolbar', () => {
    render(<DataGrid items={items} columns={columns} />, { wrapper });
    expect(screen.queryByRole('toolbar')).toBeNull();
    expect(screen.queryByRole('button', { name: /export/i })).toBeNull();
  });

  it('(b-default) default layout: one button per format, each exporting ITS format (no dead menu button)', async () => {
    render(<DataGrid items={items} columns={columns} toolbar={{ commands: [] }} exportConfig={cfg()} />, { wrapper });
    // The two buttons ARE the proof: a menu command here renders as ONE dead `Export` button.
    // (Not asserted via the dynamics-only warning — GridToolbar warns once per MODULE, so that
    // reading would depend on test order.)
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    fireEvent.click(screen.getByRole('button', { name: 'Export JSON' }));
    expect(downloads.map((d) => d.filename)).toEqual(['accounts.csv', 'accounts.json']);
  });

  it('(b-dynamics) dynamics layout: an Export ▾ menu of the formats', async () => {
    render(
      <DataGrid items={items} columns={columns} toolbar={{ layout: 'dynamics', commands: [] }} exportConfig={cfg()} />,
      { wrapper },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'CSV' }));
    expect(downloads.map((d) => d.filename)).toEqual(['accounts.csv']);
  });

  it('(b-single) one format → a single plain Export button', () => {
    render(<DataGrid items={items} columns={columns} exportConfig={cfg({ formats: ['json'] })} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(downloads.map((d) => d.filename)).toEqual(['accounts.json']);
  });

  it('(c) nothing selected → every item, every column, the filename exactly', async () => {
    render(<DataGrid items={items} columns={columns} selectionMode="multiple" exportConfig={cfg()} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(downloads[0].filename).toBe('accounts.csv');
    expect(await exportedNames()).toEqual(['Contoso Ltd', 'Beta', 'Gamma']);
    expect(parseCsv(await downloads[0].text)[0]).toEqual(['Name', 'Status', 'Parent', 'Revenue', 'Employees']);
  });

  it('(d) a selection → exactly the selected rows', async () => {
    render(<DataGrid items={items} columns={columns} selectionMode="multiple" exportConfig={cfg()} />, { wrapper });
    const boxes = screen.getAllByLabelText('Select row');
    fireEvent.click(boxes[0]);
    fireEvent.click(boxes[2]);
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(await exportedNames()).toEqual(['Contoso Ltd', 'Gamma']);
  });

  it('(d2) a loading round-trip remounts Fluent onto initialSelectedKeys — export follows what is SHOWN', async () => {
    const props = { items, columns, selectionMode: 'multiple' as const, initialSelectedKeys: ['2'], exportConfig: cfg() };
    const { rerender } = render(<DataGrid {...props} />, { wrapper });
    fireEvent.click(screen.getAllByLabelText('Select row')[0]); // user adds Contoso → {1,2}
    rerender(<DataGrid {...props} isLoading />);
    rerender(<DataGrid {...props} isLoading={false} />);
    // Fluent re-applied defaultSelectedItems: only Beta is checked now.
    const checked = ['Contoso Ltd', 'Beta', 'Gamma'].map(
      (n) => screen.getByText(n).closest('[role="row"]')?.getAttribute('aria-selected') === 'true',
    );
    expect(checked).toEqual([false, true, false]);
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(await exportedNames()).toEqual(['Beta']);
  });

  it('(d4) a selected row that leaves `items` is not exported (keys resolve against CURRENT items)', async () => {
    const { rerender } = render(<DataGrid items={items} columns={columns} selectionMode="multiple" exportConfig={cfg()} />, { wrapper });
    const boxes = screen.getAllByLabelText('Select row');
    fireEvent.click(boxes[0]);
    fireEvent.click(boxes[1]);
    rerender(<DataGrid items={[items[1], items[2]]} columns={columns} selectionMode="multiple" exportConfig={cfg()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(await exportedNames()).toEqual(['Beta']);
  });

  it('(d5) a selectionMode change does NOT remount Fluent — the export keeps the selection it shows', async () => {
    const p = { items, columns, exportConfig: cfg() };
    const { rerender } = render(<DataGrid {...p} selectionMode="multiple" />, { wrapper });
    fireEvent.click(screen.getAllByLabelText('Select row')[0]);
    rerender(<DataGrid {...p} selectionMode="none" />);
    rerender(<DataGrid {...p} selectionMode="multiple" />);
    const shown = ['Contoso Ltd', 'Beta', 'Gamma'].map(
      (n) => screen.getByText(n).closest('[role="row"]')?.getAttribute('aria-selected') === 'true',
    );
    expect(shown, 'instrument: Fluent kept the selection').toEqual([true, false, false]);
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(await exportedNames()).toEqual(['Contoso Ltd']);
  });

  it("(e) scope 'all' ignores the selection; scope 'selected' with none selected writes no file", async () => {
    const { unmount } = render(
      <DataGrid items={items} columns={columns} selectionMode="multiple" exportConfig={cfg({ scope: 'all' })} />,
      { wrapper },
    );
    fireEvent.click(screen.getAllByLabelText('Select row')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(await exportedNames()).toEqual(['Contoso Ltd', 'Beta', 'Gamma']);
    unmount();
    render(<DataGrid items={items} columns={columns} selectionMode="multiple" exportConfig={cfg({ scope: 'selected' })} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(downloads).toHaveLength(1);
  });

  it('(f) dialog:true warns with its OWN message and still exports directly', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<DataGrid items={items} columns={columns} exportConfig={cfg({ dialog: true, formats: ['csv'] })} />, { wrapper });
    expect(warn.mock.calls.flat().join(' ')).toMatch(/exportConfig\.dialog is not supported on v9/);
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(downloads.map((d) => d.filename)).toEqual(['accounts.csv']);
  });

  it('(g) look="ce" with no toolbar synthesizes a DYNAMICS toolbar (the ce bar is not restyled otherwise)', async () => {
    render(<DataGrid items={items} columns={columns} look="ce" exportConfig={cfg()} />, { wrapper });
    // The dynamics layout renders the formats as a menu; the default layout would show `Export CSV`.
    expect(screen.queryByRole('button', { name: 'Export CSV' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'JSON' }));
    expect(downloads.map((d) => d.filename)).toEqual(['accounts.json']);
  });

  it('(g2) a consumer command already keyed __gridkit_export__ is kept, and ours is not added', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const toolbar: V9GridToolbarConfig = { commands: [{ key: '__gridkit_export__', text: 'My export', onClick: () => undefined }] };
    render(<DataGrid items={items} columns={columns} toolbar={toolbar} exportConfig={cfg()} />, { wrapper });
    expect(screen.getByRole('button', { name: 'My export' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Export CSV' })).toBeNull();
    expect(warn.mock.calls.flat().join(' ')).toMatch(/already has a '__gridkit_export__/);
  });

  it('(g2b) the collision warning fires ONCE, not on every re-render with an inline toolbar', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const bar = () => ({ commands: [{ key: '__gridkit_export__csv', text: 'Mine', onClick: () => undefined }] });
    const { rerender } = render(<DataGrid items={items} columns={columns} toolbar={bar()} exportConfig={cfg()} />, { wrapper });
    for (let i = 0; i < 4; i++) rerender(<DataGrid items={[...items]} columns={columns} toolbar={bar()} exportConfig={cfg()} />);
    // a per-format key collides too (duplicate React keys otherwise)
    expect(screen.queryByRole('button', { name: 'Export JSON' })).toBeNull();
    expect(warn.mock.calls.filter((c) => /already has a '__gridkit_export__/.test(String(c[0])))).toHaveLength(1);
  });

  it('(g3) look="ce" with the consumer\'s OWN toolbar (no layout) keeps that layout — export does not restyle it', () => {
    render(<DataGrid items={items} columns={columns} look="ce" toolbar={{ commands: [] }} exportConfig={cfg()} />, { wrapper });
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Export' })).toBeNull();
  });

  it("(r) ReadOnlyGrid: scope 'selected' warns — there is no selection column to choose with", () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<ReadOnlyGrid items={items} columns={columns} exportConfig={cfg({ scope: 'selected' })} />, { wrapper });
    expect(warn.mock.calls.flat().join(' ')).toMatch(/scope 'selected' on a grid with no selection column/);
  });

  it('(i2) NestedGrid inline (default look) cannot show Export — it says so', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <NestedGrid items={items} columns={columns} nested={{ mode: 'inline', childColumns: [], getChildren: () => [] }} exportConfig={cfg()} />,
      { wrapper },
    );
    expect(screen.queryByRole('button', { name: /export/i })).toBeNull();
    expect(warn.mock.calls.flat().join(' ')).toMatch(/not supported by NestedGrid inline mode/);
  });

  it('(i) NestedGrid side-panel: the injected "Related" trigger column is not exported', async () => {
    render(
      <NestedGrid
        items={items}
        columns={columns}
        nested={{ mode: 'side-panel', childColumns: [], getChildren: () => [] }}
        exportConfig={cfg({ formats: ['csv'] })}
      />,
      { wrapper },
    );
    expect(screen.getAllByText('Related').length).toBeGreaterThan(0); // instrument: the column IS on screen
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(parseCsv(await downloads[0].text)[0]).toEqual(['Name', 'Status', 'Parent', 'Revenue', 'Employees']);
  });
});
