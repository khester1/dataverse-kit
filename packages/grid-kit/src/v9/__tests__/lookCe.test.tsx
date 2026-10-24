// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import type { ColumnDef } from '../../types';
import { DataGrid } from '../hosts/DataGrid';
import { wrapper } from './testUtils';

// jsdom does no layout: the measured GEOMETRY of look="ce" is gated in a real browser against the
// org capture (ce-parity "the grid's internals … match the stock subgrid"). These pin STRUCTURE.
afterEach(cleanup);

type Row = { key: string; name: string } & Record<string, unknown>;
const items: Row[] = [{ key: '1', name: 'Alpha' }, { key: '2', name: 'Beta' }];
const columns: ColumnDef<Row>[] = [{ key: 'name', fieldName: 'name', name: 'Name', rendererType: 'text' }];
const toolbar = { layout: 'dynamics' as const, commands: [{ key: 'new', text: 'New' }], showSearch: true, searchPlaceholder: 'Filter by keyword' };

describe('v9 DataGrid look="ce"', () => {
  it('shows "Rows: N" (items.length, or totalRowCount) as ONE text node', () => {
    const { rerender } = render(<DataGrid look="ce" items={items} columns={columns} />, { wrapper });
    const footer = document.querySelector('[data-gridkit-row-count]')!;
    expect(footer.textContent).toBe('Rows: 2');
    expect(footer.childNodes).toHaveLength(1);
    rerender(<DataGrid look="ce" items={items} columns={columns} totalRowCount={53} />);
    expect(document.querySelector('[data-gridkit-row-count]')!.textContent).toBe('Rows: 53');
  });

  it('hides "Rows: N" while loading (the count would read 0 under the skeleton)', () => {
    render(<DataGrid look="ce" items={[]} columns={columns} isLoading />, { wrapper });
    expect(document.querySelector('[data-gridkit-row-count]')).toBeNull();
  });

  it('renders no ce toolbar at all when there is nothing to show', () => {
    render(<DataGrid look="ce" items={items} columns={columns} toolbar={{ layout: 'dynamics' }} />, { wrapper });
    expect(document.querySelector('[data-gridkit-toolbar="ce"]')).toBeNull();
  });

  it('icon-only commands get the ⋮ box (44×42, padding 0), labelled ones the measured padding', () => {
    // jsdom resolves griffel's LITERAL sizes (not its colour vars), so the box itself is checkable.
    render(
      <DataGrid
        look="ce"
        items={items}
        columns={columns}
        toolbar={{ layout: 'dynamics', commands: [{ key: 'a', text: 'Labelled' }, { key: 'b', text: 'Icon', icon: <span>i</span>, iconOnly: true }] }}
      />,
      { wrapper },
    );
    const labelled = screen.getByRole('button', { name: 'Labelled' });
    const iconOnly = screen.getByRole('button', { name: 'Icon' });
    expect(getComputedStyle(labelled).paddingLeft).toBe('13px');
    expect(getComputedStyle(iconOnly).width).toBe('44px');
    expect(getComputedStyle(iconOnly).paddingLeft).toBe('0px');
    expect(getComputedStyle(iconOnly).minHeight).toBe('42px');
  });

  it('a pagination footer replaces "Rows: N"', () => {
    render(
      <DataGrid look="ce" items={items} columns={columns} pagination={{ currentPage: 1, pageSize: 2, totalItems: 10 }} onPageChange={() => {}} />,
      { wrapper },
    );
    expect(document.querySelector('[data-gridkit-row-count]')).toBeNull();
  });

  it('puts quick find on its own row UNDER the commands', () => {
    render(<DataGrid look="ce" items={items} columns={columns} toolbar={toolbar} />, { wrapper });
    const bar = document.querySelector('[data-gridkit-toolbar="ce"]')!;
    const [commandsRow, searchRow] = Array.from(bar.children);
    expect(commandsRow.querySelector('[role="toolbar"]')).not.toBeNull();
    expect(commandsRow.querySelector('input')).toBeNull();
    expect(searchRow.querySelector('input')).not.toBeNull();
    expect(screen.getByPlaceholderText('Filter by keyword')).toBeTruthy();
  });

  it('the default look is unchanged: no ce toolbar, no row-count footer, search beside the commands', () => {
    render(<DataGrid items={items} columns={columns} toolbar={toolbar} />, { wrapper });
    expect(document.querySelector('[data-gridkit-toolbar="ce"]')).toBeNull();
    // Same flex row: the search input and the toolbar share a parent.
    const input = screen.getByPlaceholderText('Filter by keyword');
    expect(input.closest('div')!.parentElement!.parentElement!.querySelector('[role="toolbar"]')).not.toBeNull();
    expect(document.querySelector('[data-gridkit-row-count]')).toBeNull();
    expect(document.querySelector('[data-gridkit-look="default"]')).not.toBeNull();
  });

  // The stock subgrid leaves an empty cell BLANK; the default look keeps the '-' placeholder.
  // A filled row sits beside the empty one so a grid that rendered no cells cannot pass.
  describe('empty cells', () => {
    type R = Record<string, unknown> & { key: string };
    const types = ['text', 'number', 'currency', 'date', 'lookup', 'optionset', 'coloredCell'] as const;
    const cols: ColumnDef<R>[] = types.map((t) => ({ key: t, fieldName: t, name: t, rendererType: t }));
    const filled: R = { key: 'f', ...Object.fromEntries(types.map((t) => [t, t === 'number' || t === 'currency' || t === 'optionset' ? 7 : 'x'])) };
    const blank: R = { key: 'b', ...Object.fromEntries(types.map((t) => [t, null])) };
    const cellTexts = (rowIndex: number) =>
      Array.from(screen.getAllByRole('row')[rowIndex].querySelectorAll('[role="gridcell"]')).map((c) => c.textContent);

    it('look="ce": every empty cell is blank', () => {
      render(<DataGrid look="ce" items={[filled, blank]} columns={cols} />, { wrapper });
      expect(cellTexts(1)).toHaveLength(types.length);
      expect(cellTexts(1).every((t) => t !== '')).toBe(true);
      expect(cellTexts(2)).toEqual(types.map(() => ''));
    });

    it("the default look keeps '-'", () => {
      render(<DataGrid items={[filled, blank]} columns={cols} />, { wrapper });
      expect(cellTexts(1)).toHaveLength(types.length);
      expect(cellTexts(1).every((t) => t !== '' && t !== '-')).toBe(true);
      expect(cellTexts(2)).toEqual(types.map(() => '-'));
    });

    it('look="ce": a real value of "-" is a value, not an empty cell', () => {
      const dash: R = { key: 'd', text: '-', lookup: '-', coloredCell: '-' };
      const dashCols = cols.filter((c) => ['text', 'lookup', 'coloredCell'].includes(c.key));
      render(<DataGrid look="ce" items={[dash]} columns={dashCols} />, { wrapper });
      expect(cellTexts(1)).toEqual(['-', '-', '-']);
    });
  });
});
