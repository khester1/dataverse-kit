// @vitest-environment jsdom
/**
 * Regression anchors for the v9 grid hosts' CURRENT markup, written before the grouped/nested
 * `look="ce"` work refactors DataGrid's body render (an internal `DataGridInner` + row extensions).
 * That refactor must leave every one of these byte-identical: a snapshot diff here means STOP, not
 * `-u` — the default looks, and the existing DataGrid `look="ce"`, are not supposed to change.
 *
 * A DOM snapshot cannot see React keys, so a remount (rows losing focus/edit state) would pass it;
 * the node-identity tests below cover that half.
 *
 * What these anchors CANNOT see: event wiring (context-menu, selection, sort, paging handlers —
 * covered by dataGrid.test / rowCommandsButton.test, not by this file), and any layout-driven
 * branch: testUtils' ResizeObserver is a no-op, so only the "nothing overflows, no column shed"
 * path renders here (no ce `⋮` overflow, no responsive shedding).
 *
 * Ids: Fluent wraps React's `useId`, whose counter is global (base 32: `checkbox-ru`) — a raw id
 * would make each snapshot depend on how many ids earlier tests consumed. Every id-valued attribute
 * is mapped to a first-seen ordinal (ID1, ID2…) with references mapped through the same table, so
 * the id↔reference wiring stays checkable while the counter does not. Class lists are untouched:
 * Griffel class names are content hashes, not counters.
 */
import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import type { ColumnDef, GroupConfig, NestedConfig } from '../../types';
import type { V9RowCommand, V9GridToolbarConfig } from '../types';
import { DataGrid } from '../hosts/DataGrid';
import { GroupedGrid } from '../hosts/GroupedGrid';
import { NestedGrid } from '../hosts/nested/NestedGrid';
import { wrapper } from './testUtils';

afterEach(cleanup);

const ID_ATTRS = ['id', 'for', 'headers', 'aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns', 'aria-activedescendant', 'aria-details', 'aria-errormessage', 'aria-flowto'];

/** The grid subtree — inside the FluentProvider (whose theme class would churn on a token change) —
 *  with every id-valued attribute replaced by a first-seen ordinal (see the file header). */
function gridHtml(container: HTMLElement): string {
  const provider = container.querySelector('.fui-FluentProvider');
  expect(provider).not.toBeNull();
  const clone = provider!.cloneNode(true) as HTMLElement;
  const ordinals = new Map<string, string>();
  const ord = (token: string): string => {
    if (!ordinals.has(token)) ordinals.set(token, `ID${ordinals.size + 1}`);
    return ordinals.get(token)!;
  };
  for (const el of Array.from(clone.querySelectorAll('*'))) {
    for (const attr of ID_ATTRS) {
      const v = el.getAttribute(attr);
      if (v !== null) el.setAttribute(attr, v.split(/\s+/).filter(Boolean).map(ord).join(' '));
    }
  }
  return clone.innerHTML;
}

interface Row extends Record<string, unknown> {
  key: string;
  name: string;
  status: string | null;
  revenue: number | null;
}
const items: Row[] = [
  { key: '1', name: 'Alpha', status: 'Active', revenue: 100 },
  { key: '2', name: 'Beta', status: 'Closed', revenue: null },
  { key: '3', name: 'Gamma', status: 'Active', revenue: 300 },
];
const columns: ColumnDef<Row>[] = [
  { key: 'name', fieldName: 'name', name: 'Name', rendererType: 'text' },
  { key: 'status', fieldName: 'status', name: 'Status', rendererType: 'text' },
  { key: 'revenue', fieldName: 'revenue', name: 'Revenue', rendererType: 'currency', aggregate: 'sum' },
];
const rowCommands: V9RowCommand<Row>[] = [{ key: 'open', text: 'Open', onClick: () => {} }];
const pagination = { currentPage: 1, pageSize: 3, totalItems: 9 };
const defaultToolbar: V9GridToolbarConfig = { showSearch: true, searchPlaceholder: 'Search', commands: [{ key: 'new', text: 'New' }] };
const ceToolbar: V9GridToolbarConfig = { ...defaultToolbar, layout: 'dynamics', title: 'Accounts' };

describe('v9 baseline markup (must not change under the grouped/nested ce work)', () => {
  it('DataGrid default: selection + aggregates + row commands + toolbar + pagination', () => {
    const { container } = render(
      <DataGrid<Row>
        items={items}
        columns={columns}
        selectionMode="multiple"
        rowCommands={rowCommands}
        rowCommandsDisplay="both"
        toolbar={defaultToolbar}
        pagination={pagination}
        onPageChange={() => {}}
        aria-label="Accounts"
      />,
      { wrapper },
    );
    expect(container.querySelectorAll('[role="row"]').length).toBeGreaterThan(3);
    expect(gridHtml(container)).toMatchSnapshot();
  });

  it('DataGrid look="ce": the same set', () => {
    const { container } = render(
      <DataGrid<Row>
        look="ce"
        items={items}
        columns={columns}
        selectionMode="multiple"
        rowCommands={rowCommands}
        rowCommandsDisplay="both"
        toolbar={ceToolbar}
        pagination={pagination}
        onPageChange={() => {}}
        aria-label="Accounts"
      />,
      { wrapper },
    );
    expect(container.querySelector('[data-gridkit-look="ce"]')).not.toBeNull();
    expect(gridHtml(container)).toMatchSnapshot();
  });

  it('DataGrid look="ce" without pagination: "Rows: N" footer + blank empty cells', () => {
    const { container } = render(
      <DataGrid<Row> look="ce" items={items} columns={columns} selectionMode="multiple" totalRowCount={53} aria-label="Accounts" />,
      { wrapper },
    );
    expect(container.querySelector('[data-gridkit-row-count]')?.textContent).toBe('Rows: 53');
    expect(gridHtml(container)).toMatchSnapshot();
  });

  it('GroupedGrid default: selection + aggregates (Accordion of per-group grids)', () => {
    const group: GroupConfig<Row> = { groupBy: 'status' };
    const { container } = render(
      <GroupedGrid<Row> items={items} columns={columns} group={group} selectionMode="multiple" />,
      { wrapper },
    );
    // Two group grids + the grand total (a headerless grid since 0.31).
    expect(container.querySelectorAll('[data-gridkit-group-key] [role="grid"]').length).toBe(2);
    expect(container.querySelectorAll('[data-gridkit-grand-total] [role="grid"]').length).toBe(1);
    expect(gridHtml(container)).toMatchSnapshot();
  });

  it('NestedGrid inline default: collapsed, then row 0 expanded', () => {
    interface Child extends Record<string, unknown> {
      key: string;
      title: string | null;
    }
    const nested: NestedConfig<Row, Child> = {
      mode: 'inline',
      childColumns: [{ key: 'title', fieldName: 'title', name: 'Title', rendererType: 'text' }],
      getChildren: (p) => [
        { key: `${p.key}-a`, title: `Child of ${p.name}` },
        { key: `${p.key}-b`, title: null },
      ],
    };
    const { container, getAllByRole } = render(<NestedGrid<Row> items={items} columns={columns} nested={nested} />, { wrapper });
    expect(gridHtml(container)).toMatchSnapshot('collapsed');
    const expand = getAllByRole('button', { name: 'Expand' });
    expect(expand).toHaveLength(items.length);
    fireEvent.click(expand[0]);
    expect(container.textContent).toContain('Child of Alpha');
    expect(gridHtml(container)).toMatchSnapshot('row 0 expanded');
  });

  /** The body row whose text contains `name`. */
  const rowNamed = (container: HTMLElement, name: string): Element => {
    const rows = Array.from(container.querySelectorAll('.fui-DataGridBody [role="row"]')).filter((r) => r.textContent?.includes(name));
    expect(rows).toHaveLength(1);
    return rows[0];
  };

  it('DataGrid keeps each row DOM node across a REORDERED rerender with new objects (keys, not positions)', () => {
    const { container, rerender } = render(<DataGrid<Row> items={items} columns={columns} />, { wrapper });
    const alpha = rowNamed(container, 'Alpha');
    rerender(<DataGrid<Row> items={[...items].reverse().map((r) => ({ ...r }))} columns={columns} />);
    expect(rowNamed(container, 'Alpha')).toBe(alpha);
  });

  it('…and with row commands (the keyed context-menu wrapper path)', () => {
    const props = { columns, rowCommands, rowCommandsDisplay: 'both' as const };
    const { container, rerender } = render(<DataGrid<Row> items={items} {...props} />, { wrapper });
    const alpha = rowNamed(container, 'Alpha');
    rerender(<DataGrid<Row> items={[...items].reverse().map((r) => ({ ...r }))} {...props} />);
    expect(rowNamed(container, 'Alpha')).toBe(alpha);
  });

  it('inline NestedGrid keeps the expanded parent row and its child grid across a rerender', () => {
    interface Child extends Record<string, unknown> {
      key: string;
      title: string;
    }
    const nested: NestedConfig<Row, Child> = {
      mode: 'inline',
      childColumns: [{ key: 'title', fieldName: 'title', name: 'Title', rendererType: 'text' }],
      getChildren: (p) => [{ key: `${p.key}-a`, title: `Child of ${p.name}` }],
    };
    const { container, getAllByRole, rerender } = render(<NestedGrid<Row> items={items} columns={columns} nested={nested} />, { wrapper });
    fireEvent.click(getAllByRole('button', { name: 'Expand' })[0]);
    const grids = (): Element[] => Array.from(container.querySelectorAll('[role="grid"]'));
    /** The one parent row holding the open row's "Collapse" button. */
    const parentRow = (): Element => {
      const rows = Array.from(container.querySelectorAll('[role="row"]')).filter((r) => r.querySelector('button[aria-label="Collapse"]') !== null);
      expect(rows).toHaveLength(1);
      return rows[0];
    };
    expect(grids().length).toBeGreaterThan(0);
    const childGrid = grids()[grids().length - 1];
    expect(childGrid.textContent).toContain('Child of Alpha');
    const parent = parentRow();
    rerender(<NestedGrid<Row> items={items.map((r) => ({ ...r }))} columns={columns} nested={nested} />);
    expect(parentRow()).toBe(parent);
    expect(grids()[grids().length - 1]).toBe(childGrid);
  });
});
