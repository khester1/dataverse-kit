// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { ColumnDef } from '../../types';
import type { V9RowCommand } from '../types';

// Explicit cleanup between tests: with a per-file `@vitest-environment` (no global
// `globals: true`), @testing-library's auto-cleanup does not register, so rendered
// trees would otherwise accumulate and make shared text ambiguous.
afterEach(cleanup);
import { DataGrid } from '../hosts/DataGrid';
import { ReadOnlyGrid } from '../hosts/ReadOnlyGrid';
import { wrapper } from './testUtils';

interface Row extends Record<string, unknown> {
  key: string;
  name: string;
  revenue: number;
}

const items: Row[] = [
  { key: '1', name: 'Alpha', revenue: 100 },
  { key: '2', name: 'Beta', revenue: 200 },
];

const columns: ColumnDef<Row>[] = [
  { key: 'name', fieldName: 'name', name: 'Name', rendererType: 'text', isSortable: true },
  { key: 'revenue', fieldName: 'revenue', name: 'Revenue', rendererType: 'currency', aggregate: 'sum' },
];

describe('v9 DataGrid host', () => {
  it('renders headers + cell values (currency formatted via the shared core)', () => {
    render(<DataGrid items={items} columns={columns} />, { wrapper });
    expect(screen.getByText('Name')).toBeTruthy();
    expect(screen.getByText('Revenue')).toBeTruthy();
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Beta')).toBeTruthy();
    expect(screen.getByText('$100.00')).toBeTruthy();
    expect(screen.getByText('$200.00')).toBeTruthy();
  });

  it('renders an aggregate footer for columns with an `aggregate`', () => {
    render(<DataGrid items={items} columns={columns} />, { wrapper });
    expect(screen.getByText('$300.00')).toBeTruthy();
  });

  it('shows a skeleton while loading', () => {
    render(<DataGrid items={[]} columns={columns} isLoading />, { wrapper });
    expect(screen.getByRole('status', { name: 'Loading data' })).toBeTruthy();
  });

  it('renders the pagination footer', () => {
    render(
      <DataGrid items={items} columns={columns} pagination={{ currentPage: 1, pageSize: 25, totalItems: 50 }} onPageChange={vi.fn()} />,
      { wrapper },
    );
    expect(screen.getByText(/Page 1 of 2/)).toBeTruthy();
  });

  it('controlled sort — clicking a sortable header calls onSortChange (no in-memory sort)', () => {
    const onSortChange = vi.fn();
    render(<DataGrid items={items} columns={columns} onSortChange={onSortChange} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'Name' }));
    expect(onSortChange).toHaveBeenCalledWith('name', 'asc');
  });

  it('renders a toolbar command and fires its onClick', () => {
    const onClick = vi.fn();
    render(<DataGrid items={items} columns={columns} toolbar={{ commands: [{ key: 'r', text: 'Refresh', onClick }] }} />, {
      wrapper,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('multi-select — the select-all checkbox reports the selected rows', () => {
    const onSelectionChanged = vi.fn();
    render(<DataGrid items={items} columns={columns} selectionMode="multiple" onSelectionChanged={onSelectionChanged} />, {
      wrapper,
    });
    fireEvent.click(screen.getByLabelText('Select all rows'));
    expect(onSelectionChanged).toHaveBeenCalled();
    const calls = onSelectionChanged.mock.calls;
    const selected = calls[calls.length - 1][0] as Row[];
    expect(selected).toHaveLength(2);
  });

  it('ReadOnlyGrid renders rows with no selection column', () => {
    render(<ReadOnlyGrid items={items} columns={columns} />, { wrapper });
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.queryByLabelText('Select all rows')).toBeNull();
  });
});

describe('v9 DataGrid rowCommands (per-row right-click context menu)', () => {
  const onCommand = vi.fn();
  const rowCommands: V9RowCommand<Row>[] = [
    { key: 'open', text: 'Open', onClick: (r) => onCommand('open', r) },
    // Hidden for Alpha (shown only on Beta) — exercises the `visible` filter.
    { key: 'deactivate', text: 'Deactivate', visible: (r) => r.name === 'Beta', onClick: (r) => onCommand('deactivate', r) },
    // Disabled for Alpha — exercises the per-row `disabled` predicate.
    { key: 'delete', text: 'Delete', disabled: (r) => r.name === 'Alpha', onClick: (r) => onCommand('delete', r) },
  ];

  const rowFor = (text: string): HTMLElement => {
    const el = screen.getByText(text).closest('[role="row"]');
    if (!el) throw new Error(`no row for ${text}`);
    return el as HTMLElement;
  };

  afterEach(() => onCommand.mockClear());

  it('right-clicking a row opens its command menu; clicking an item fires onClick with THAT row', async () => {
    render(<DataGrid items={items} columns={columns} rowCommands={rowCommands} />, { wrapper });
    fireEvent.contextMenu(rowFor('Alpha'));
    const open = await screen.findByRole('menuitem', { name: 'Open' });
    fireEvent.click(open);
    expect(onCommand).toHaveBeenCalledWith('open', items[0]);
  });

  it('drops commands whose visible(row) === false and disables commands per row', async () => {
    render(<DataGrid items={items} columns={columns} rowCommands={rowCommands} />, { wrapper });
    // Alpha: Deactivate hidden (visible → Beta only); Delete present but disabled.
    fireEvent.contextMenu(rowFor('Alpha'));
    await screen.findByRole('menuitem', { name: 'Open' });
    expect(screen.queryByRole('menuitem', { name: 'Deactivate' })).toBeNull();
    expect(screen.getByRole('menuitem', { name: 'Delete' }).getAttribute('aria-disabled')).toBe('true');
  });

  it('shows a command on the row its visible predicate allows (Beta gets Deactivate, Delete enabled)', async () => {
    render(<DataGrid items={items} columns={columns} rowCommands={rowCommands} />, { wrapper });
    fireEvent.contextMenu(rowFor('Beta'));
    const deactivate = await screen.findByRole('menuitem', { name: 'Deactivate' });
    expect(deactivate).toBeTruthy();
    // Beta's Delete is not disabled (predicate only matches Alpha).
    expect(screen.getByRole('menuitem', { name: 'Delete' }).getAttribute('aria-disabled')).not.toBe('true');
  });

  it('ReadOnlyGrid also opens a per-row menu (rowCommands flow through the preset)', async () => {
    render(<ReadOnlyGrid items={items} columns={columns} rowCommands={rowCommands} />, { wrapper });
    fireEvent.contextMenu(rowFor('Beta'));
    expect(await screen.findByRole('menuitem', { name: 'Open' })).toBeTruthy();
  });

  it('no rowCommands → right-click opens no menu (native browser menu left intact)', () => {
    render(<DataGrid items={items} columns={columns} />, { wrapper });
    fireEvent.contextMenu(rowFor('Alpha'));
    expect(screen.queryByRole('menuitem')).toBeNull();
  });

  it('coexists with left-click (onActiveItemChanged) and double-click (onRowNavigate)', () => {
    const onActiveItemChanged = vi.fn();
    const onRowNavigate = vi.fn();
    render(
      <DataGrid
        items={items}
        columns={columns}
        rowCommands={rowCommands}
        onActiveItemChanged={onActiveItemChanged}
        onRowNavigate={onRowNavigate}
      />,
      { wrapper },
    );
    fireEvent.click(rowFor('Alpha'));
    expect(onActiveItemChanged).toHaveBeenCalledWith(items[0]);
    fireEvent.doubleClick(rowFor('Beta'));
    expect(onRowNavigate).toHaveBeenCalledWith(items[1]);
  });
});

/**
 * ★★★★★ `resizableColumnsOptions` MUST REACH FLUENT — and this asserts the CONSEQUENCE, not the prop.
 *
 * Fluent's `autoFitColumns` defaults to TRUE and routes every resize through
 * `adjustColumnWidthsToFitContainer(...)`, so in any container narrower than the columns need —
 * i.e. every Dataverse subgrid — the new width is clamped straight back and dragging does nothing.
 * MEASURED in Chrome on a shipped PCF bundle: 6 columns needing 1024px inside a 445px subgrid cell
 * were completely inert; the same build at 1400px, where they fit, resized fine.
 *
 * ★★★ THE OBSERVABLE THAT SEPARATES THE TWO STATES IS THE HANDLE COUNT, and it comes straight from
 * Fluent's own source: `isLastColumn && autoFitColumns ? null : <TableResizeHandle/>`
 * (`useTableColumnSizing.js`). With autoFit ON the last column has no handle (n-1 handles); with it
 * OFF every column has one (n). So the count is a direct, DOM-level readout of whether the option
 * actually arrived.
 *
 * ★★ A SPY ON THE PROP WOULD BE A WEAKER TEST. It would prove grid-kit passed an object and say
 *    nothing about whether Fluent honoured it — and "forwarded but ignored" is precisely the state
 *    that shipped here for months behind a green plumbing marker.
 */
describe('v9 DataGrid — resizableColumnsOptions forwarding', () => {
  const cols: ColumnDef<Row>[] = [
    { key: 'a', name: 'A', fieldName: 'a', rendererType: 'text', minWidth: 80 },
    { key: 'b', name: 'B', fieldName: 'b', rendererType: 'text', minWidth: 80 },
    { key: 'c', name: 'C', fieldName: 'c', rendererType: 'text', minWidth: 80 },
  ];
  const items: Row[] = [{ id: '1', a: 'a1', b: 'b1', c: 'c1' }];
  const handles = (c: HTMLElement) => c.querySelectorAll('.fui-TableResizeHandle').length;

  it('omitted → Fluent default autoFit ON → the LAST column has no handle', () => {
    const { container } = render(
      <DataGrid items={items} columns={cols} getKey={(r) => r.id} resizableColumns />,
      { wrapper },
    );
    expect(container.querySelectorAll('[role="columnheader"]').length).toBe(cols.length);
    expect(handles(container)).toBe(cols.length - 1);
  });

  it('★ { autoFitColumns: false } → EVERY column gets a handle', () => {
    const { container } = render(
      <DataGrid
        items={items}
        columns={cols}
        getKey={(r) => r.id}
        resizableColumns
        resizableColumnsOptions={{ autoFitColumns: false }}
      />,
      { wrapper },
    );
    expect(handles(container)).toBe(cols.length);
  });
});
