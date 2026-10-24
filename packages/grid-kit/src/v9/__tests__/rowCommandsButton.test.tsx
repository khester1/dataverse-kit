// @vitest-environment jsdom
/**
 * `rowCommandsDisplay` — the trailing "⋯" row-commands column of the v9 flat DataGrid.
 *
 * ★★ The leak tests run with `selectionMode="multiple"`: without a selection mode Fluent's row
 *   never calls `toggleRow`, so "selection is unchanged" would hold vacuously. The positive
 *   control proves the spies DO fire for a plain row click in the same configuration, and every
 *   leak test proves its stimulus landed (the command's onClick ran) before reading the spies.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import type { ColumnDef, NestedConfig } from '../../types';
import type { V9RowCommand } from '../types';
import { DataGrid } from '../hosts/DataGrid';
import { ReadOnlyGrid } from '../hosts/ReadOnlyGrid';
import { NestedGrid } from '../hosts/nested/NestedGrid';
import { ROW_COMMANDS_COLUMN_ID } from '../hosts/rowCommands';
import { wrapper } from './testUtils';

afterEach(cleanup);

interface Row extends Record<string, unknown> {
  key: string;
  name: string;
  revenue: number;
}

const items: Row[] = [
  { key: '1', name: 'Alpha', revenue: 100 },
  { key: '2', name: 'Beta', revenue: 200 },
  { key: '3', name: 'Gamma', revenue: 300 },
];

const columns: ColumnDef<Row>[] = [
  { key: 'name', fieldName: 'name', name: 'Name', rendererType: 'text' },
  { key: 'revenue', fieldName: 'revenue', name: 'Revenue', rendererType: 'currency', aggregate: 'sum' },
];

const MORE = { name: 'More commands' } as const;

function setup(extra: Partial<React.ComponentProps<typeof DataGrid<Row>>> = {}) {
  const onCommand = vi.fn();
  const onSelectionChanged = vi.fn();
  const onActiveItemChanged = vi.fn();
  const onRowNavigate = vi.fn();
  const rowCommands: V9RowCommand<Row>[] = [
    { key: 'open', text: 'Open', onClick: (r) => onCommand('open', r) },
    { key: 'deactivate', text: 'Deactivate', visible: (r) => r.name !== 'Alpha', onClick: (r) => onCommand('deactivate', r) },
    { key: 'delete', text: 'Delete', disabled: (r) => r.name === 'Alpha', onClick: (r) => onCommand('delete', r) },
  ];
  render(
    <DataGrid<Row>
      items={items}
      columns={columns}
      selectionMode="multiple"
      onSelectionChanged={onSelectionChanged}
      onActiveItemChanged={onActiveItemChanged}
      onRowNavigate={onRowNavigate}
      rowCommands={rowCommands}
      rowCommandsDisplay="button"
      {...extra}
    />,
    { wrapper },
  );
  return { onCommand, onSelectionChanged, onActiveItemChanged, onRowNavigate };
}

const rowFor = (text: string): HTMLElement => {
  const el = screen.getByText(text).closest('[role="row"]');
  if (!el) throw new Error(`no row for ${text}`);
  return el as HTMLElement;
};
const moreIn = (rowText: string): HTMLElement => within(rowFor(rowText)).getByRole('button', MORE);
/** Body rows counted independently of the button: every row minus the header and footer. */
const bodyRows = (): HTMLElement[] =>
  screen
    .getAllByRole('row')
    .filter((r) => !r.closest('[data-gridkit-aggregate-footer]') && r.querySelector('[role="columnheader"]') === null);

describe('v9 DataGrid rowCommandsDisplay — positive control', () => {
  it('a plain row click DOES select and activate the row (so the leak tests are not vacuous)', () => {
    const s = setup();
    fireEvent.click(within(rowFor('Beta')).getByText('Beta'));
    expect(s.onSelectionChanged).toHaveBeenCalledTimes(1);
    expect(s.onActiveItemChanged).toHaveBeenCalledWith(items[1]);
  });
});

describe('v9 DataGrid rowCommandsDisplay — which surfaces render', () => {
  it("default ('context'): no ⋯ button and no ⋯ column", () => {
    setup({ rowCommandsDisplay: undefined });
    expect(screen.queryAllByRole('button', MORE)).toHaveLength(0);
    expect(screen.queryByRole('columnheader', { name: 'Row commands' })).toBeNull();
  });

  it("'button': exactly one ⋯ per body row, none in the header or footer", () => {
    setup();
    const rows = bodyRows();
    expect(rows).toHaveLength(3);
    for (const r of rows) expect(within(r).getAllByRole('button', MORE)).toHaveLength(1);
    expect(screen.getAllByRole('button', MORE)).toHaveLength(3);
    const footer = document.querySelector('[data-gridkit-aggregate-footer]') as HTMLElement;
    expect(footer).not.toBeNull();
    expect(within(footer).queryAllByRole('button', MORE)).toHaveLength(0);
    expect(screen.getByRole('columnheader', { name: 'Row commands' }).querySelector('button')).toBeNull();
  });

  it("'button' installs no right-click menu; 'both' installs both", async () => {
    setup();
    fireEvent.contextMenu(rowFor('Beta'));
    expect(screen.queryByRole('menuitem')).toBeNull();
    cleanup();
    setup({ rowCommandsDisplay: 'both' });
    expect(screen.getAllByRole('button', MORE)).toHaveLength(3);
    fireEvent.contextMenu(rowFor('Beta'));
    expect(await screen.findByRole('menuitem', { name: 'Open' })).toBeTruthy();
  });

  it("NestedGrid's DataGrid-backed modes honour it; inline mode does not", () => {
    const cmds = [{ key: 'open', text: 'Open', onClick: () => undefined }];
    const base = { childColumns: columns, getChildren: (): Row[] => [] };
    for (const mode of ['side-panel', 'hover-callout'] as const) {
      const nested: NestedConfig<Row, Row> = { ...base, mode };
      render(
        <NestedGrid<Row, Row> items={items} columns={columns} nested={nested} rowCommands={cmds} rowCommandsDisplay="button" />,
        { wrapper },
      );
      expect(screen.getAllByRole('button', MORE)).toHaveLength(3);
      cleanup();
    }
    const inline: NestedConfig<Row, Row> = { ...base, mode: 'inline' };
    render(
      <NestedGrid<Row, Row> items={items} columns={columns} nested={inline} rowCommands={cmds} rowCommandsDisplay="button" />,
      { wrapper },
    );
    expect(screen.getByText('Gamma')).toBeTruthy();
    expect(screen.queryAllByRole('button', MORE)).toHaveLength(0);
  });

  it('ReadOnlyGrid renders the ⋯ button too', () => {
    render(
      <ReadOnlyGrid<Row>
        items={items}
        columns={columns}
        rowCommands={[{ key: 'open', text: 'Open', onClick: () => undefined }]}
        rowCommandsDisplay="button"
      />,
      { wrapper },
    );
    expect(screen.getAllByRole('button', MORE)).toHaveLength(3);
  });
});

describe('v9 DataGrid rowCommandsDisplay — the menu', () => {
  it('clicking a ⋯ item fires onClick with THAT row (not the first)', async () => {
    const s = setup();
    fireEvent.click(moreIn('Beta'));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Open' }));
    expect(s.onCommand).toHaveBeenCalledTimes(1);
    expect(s.onCommand).toHaveBeenCalledWith('open', items[1]);
  });

  it('applies visible and disabled per row', async () => {
    setup();
    fireEvent.click(moreIn('Alpha'));
    await screen.findByRole('menuitem', { name: 'Open' });
    expect(screen.queryByRole('menuitem', { name: 'Deactivate' })).toBeNull();
    expect(screen.getByRole('menuitem', { name: 'Delete' }).getAttribute('aria-disabled')).toBe('true');
  });

  it('a row whose every command is hidden gets no ⋯ — while its neighbours do', () => {
    render(
      <DataGrid<Row>
        items={items}
        columns={columns}
        rowCommands={[{ key: 'open', text: 'Open', visible: (r) => r.name !== 'Gamma', onClick: () => undefined }]}
        rowCommandsDisplay="button"
      />,
      { wrapper },
    );
    expect(within(rowFor('Gamma')).queryAllByRole('button', MORE)).toHaveLength(0);
    expect(within(rowFor('Alpha')).getAllByRole('button', MORE)).toHaveLength(1);
    expect(within(rowFor('Beta')).getAllByRole('button', MORE)).toHaveLength(1);
  });

  it('ArrowDown on the ⋯ button does not open the menu (arrows belong to the grid)', () => {
    setup();
    fireEvent.keyDown(moreIn('Beta'), { key: 'ArrowDown' });
    expect(screen.queryByRole('menu')).toBeNull();
  });
});

describe('v9 DataGrid rowCommandsDisplay — the ⋯ never selects, activates or navigates the row', () => {
  const quiet = (s: ReturnType<typeof setup>): void => {
    expect(s.onSelectionChanged).not.toHaveBeenCalled();
    expect(s.onActiveItemChanged).not.toHaveBeenCalled();
    expect(s.onRowNavigate).not.toHaveBeenCalled();
  };

  it('(a) clicking ⋯', async () => {
    const s = setup();
    fireEvent.click(moreIn('Beta'));
    expect(await screen.findByRole('menuitem', { name: 'Open' })).toBeTruthy();
    quiet(s);
  });

  it('(b) clicking a menu item (a PORTAL — React bubbles it up the component tree)', async () => {
    const s = setup();
    fireEvent.click(moreIn('Beta'));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Open' }));
    expect(s.onCommand).toHaveBeenCalledTimes(1);
    quiet(s);
  });

  it('(c) Space and Enter on a menu item', async () => {
    const s = setup();
    fireEvent.click(moreIn('Beta'));
    const open = await screen.findByRole('menuitem', { name: 'Open' });
    fireEvent.keyDown(open, { key: ' ' });
    fireEvent.keyUp(open, { key: ' ' });
    expect(s.onCommand).toHaveBeenCalledTimes(1);
    fireEvent.click(moreIn('Gamma'));
    fireEvent.keyDown(await screen.findByRole('menuitem', { name: 'Open' }), { key: 'Enter' });
    expect(s.onCommand).toHaveBeenCalledTimes(2);
    expect(s.onCommand).toHaveBeenLastCalledWith('open', items[2]);
    quiet(s);
  });

  it('(d) double-clicking ⋯', () => {
    const s = setup();
    fireEvent.doubleClick(moreIn('Beta'));
    quiet(s);
  });

  it("('both') right-clicking inside the open ⋯ menu does not open the row menu as well", async () => {
    setup({ rowCommandsDisplay: 'both' });
    fireEvent.click(moreIn('Beta'));
    // fireEvent returns false when the event was default-prevented: the browser menu is suppressed.
    expect(fireEvent.contextMenu(await screen.findByRole('menuitem', { name: 'Open' }))).toBe(false);
    expect(screen.getAllByRole('menu')).toHaveLength(1);
  });

  it("('both') right-clicking the ⋯ button itself opens the row's right-click menu", async () => {
    const s = setup({ rowCommandsDisplay: 'both' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(fireEvent.contextMenu(moreIn('Beta'))).toBe(false);
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Open' }));
    expect(s.onCommand).toHaveBeenCalledWith('open', items[1]);
    quiet(s);
  });
});

describe('v9 DataGrid rowCommandsDisplay — sizing and footer', () => {
  const header = (): HTMLElement => screen.getByRole('columnheader', { name: 'Row commands' });

  it('non-resizable: the ⋯ header, body and footer cells are fixed at 28px content (44 rendered)', () => {
    setup();
    const cells = [
      header(),
      moreIn('Beta').closest('[role="gridcell"],[role="cell"]') as HTMLElement,
      document.querySelector('[data-gridkit-aggregate-footer] [role="row"]')!.lastElementChild as HTMLElement,
    ];
    for (const c of cells) {
      expect(c.style.flex).toBe('0 0 28px');
      expect(c.style.minWidth).toBe('28px');
    }
  });

  it('non-resizable + columnFill proportional: the ⋯ cells are still fixed', () => {
    setup({ columnFill: 'proportional' });
    expect(header().style.flex).toBe('0 0 28px');
  });

  it('resizable: the ⋯ column is sized 28px through the column sizing, with no resize handle', () => {
    setup({ resizableColumns: true, resizableColumnsOptions: { autoFitColumns: false } });
    expect(header().style.width).toBe('28px');
    expect(header().style.flex).not.toBe('0 0 28px');
    // The data columns keep their handles; the ⋯ column has none.
    expect(header().querySelector('[role="separator"]')).toBeNull();
    expect(screen.getByRole('columnheader', { name: /Name/ }).querySelector('[role="separator"]')).not.toBeNull();
  });

  it('the footer row has a trailing cell under the ⋯ column (cell counts match a body row)', () => {
    setup();
    const footerRow = document.querySelector('[data-gridkit-aggregate-footer] [role="row"]') as HTMLElement;
    const body = bodyRows()[0];
    expect(footerRow.children.length).toBe(body.children.length);
  });

  it('exports the column id', () => {
    expect(ROW_COMMANDS_COLUMN_ID).toBe('__gridkit_rowCommands');
  });
});
