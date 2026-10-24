// @vitest-environment jsdom
/**
 * GroupedGrid (default look) with CONSUMER-SUPPLIED per-group subtotals (`groupAggregateResults` +
 * `groupAggregateFormatted`), the rebuilt grand-total footer, and parity forwarding to every group grid.
 *
 * ★ The fixture's per-group values are deliberately NOT what the rows sum to (Active rows sum to 300,
 *   the supplied subtotal is 999), so a footer computed from rows and one taken from the props can
 *   never print the same string.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import type { ColumnDef, GroupConfig } from '../../types';
import type { V9GroupedGridProps, V9RowCommand } from '../types';
import { GroupedGrid } from '../hosts/GroupedGrid';
import { BLANK_GROUP_KEY, bucketGroups } from '../hosts/buildGroups';
import { BLANK_GROUP_KEY as BARREL_BLANK } from '..';
import { wrapper } from './testUtils';

afterEach(cleanup);

interface Row extends Record<string, unknown> {
  key: string;
  name: string;
  status: string | null;
  revenue: number;
}
const items: Row[] = [
  { key: '1', name: 'Alpha', status: 'Active', revenue: 100 },
  { key: '2', name: 'Beta', status: 'Active', revenue: 200 },
  { key: '3', name: 'Gamma', status: 'Closed', revenue: 300 },
  { key: '4', name: 'Delta', status: null, revenue: 50 },
];
const columns: ColumnDef<Row>[] = [
  { key: 'name', fieldName: 'name', name: 'Name', rendererType: 'text' },
  { key: 'revenue', fieldName: 'revenue', name: 'Revenue', rendererType: 'currency', aggregate: 'sum' },
];
const group: GroupConfig<Row> = { groupBy: 'status' };

const section = (container: HTMLElement, key: string): HTMLElement => {
  // (jsdom has no CSS.escape; match the attribute exactly instead.)
  const el = [...container.querySelectorAll<HTMLElement>('[data-gridkit-group-key]')].find((e) => e.getAttribute('data-gridkit-group-key') === key);
  if (!el) throw new Error(`no group section for key ${key}`);
  return el;
};
const footerText = (el: HTMLElement): string =>
  [...el.querySelectorAll('[data-gridkit-aggregate-footer] [role="gridcell"]')].map((c) => c.textContent ?? '').join('|');

describe('BLANK_GROUP_KEY', () => {
  it('is the key bucketGroups gives a null value, and the barrel exports it', () => {
    expect(BLANK_GROUP_KEY).toBe('(Blank)');
    expect(BARREL_BLANK).toBe(BLANK_GROUP_KEY);
    const g = bucketGroups(items, group);
    expect(g.map((x) => x.key)).toContain(BLANK_GROUP_KEY);
  });
});

describe('GroupedGrid groupAggregateResults (authoritative)', () => {
  it('renders the supplied per-group values, never values computed from the rows', () => {
    const { container } = render(
      <GroupedGrid
        items={items}
        columns={columns}
        group={group}
        groupAggregateResults={{ Active: { revenue: { sum: 999 } }, Closed: { revenue: { sum: 7 } }, [BLANK_GROUP_KEY]: { revenue: { sum: 1 } } }}
      />,
      { wrapper },
    );
    expect(footerText(section(container, 'Active'))).toContain('$999.00');
    expect(footerText(section(container, 'Active'))).not.toContain('$300.00');
    expect(footerText(section(container, 'Closed'))).toContain('$7.00');
    expect(footerText(section(container, BLANK_GROUP_KEY))).toContain('$1.00');
  });

  it('a group (or pair) absent from the map is BLANK, not computed', () => {
    const { container } = render(
      <GroupedGrid items={items} columns={columns} group={group} groupAggregateResults={{ Active: { revenue: { sum: 999 } } }} />,
      { wrapper },
    );
    // Positive control: the supplied group renders.
    expect(footerText(section(container, 'Active'))).toContain('$999.00');
    // Closed is absent: its footer row exists (the column declares a sum) and is blank.
    const closed = section(container, 'Closed');
    expect(closed.querySelectorAll('[data-gridkit-aggregate-footer] [data-aggregate-fn="sum"]')).toHaveLength(1);
    expect(footerText(closed).replace(/\|/g, '')).toBe('');
  });

  it('renders subtotals without showGroupAggregates when results are supplied', () => {
    const { container } = render(
      <GroupedGrid items={items} columns={columns} group={{ ...group, showGroupAggregates: false }} groupAggregateResults={{ Active: { revenue: { sum: 999 } } }} />,
      { wrapper },
    );
    expect(footerText(section(container, 'Active'))).toContain('$999.00');
  });

  it('groupAggregateFormatted supplies the display string per group; an absent entry is blank', () => {
    // The column's own aggregateFormat prints a GRAND-total-like constant: it must never reach a group footer.
    const cols = columns.map((c) => (c.aggregate ? { ...c, aggregateFormat: () => 'GRAND' } : c));
    const { container } = render(
      <GroupedGrid
        items={items}
        columns={cols}
        group={group}
        aggregateResults={{ revenue: { sum: 650 } }}
        groupAggregateResults={{ Active: { revenue: { sum: 999 } }, Closed: { revenue: { sum: 7 } } }}
        groupAggregateFormatted={{ Active: { revenue: { sum: '999,00 €' } } }}
      />,
      { wrapper },
    );
    expect(footerText(section(container, 'Active'))).toContain('999,00 €');
    expect(footerText(section(container, 'Closed'))).not.toContain('GRAND');
    expect(footerText(section(container, 'Closed')).replace(/\|/g, '')).toBe('');
    // The grand footer keeps the column's aggregateFormat.
    const grand = container.querySelector<HTMLElement>('[data-gridkit-grand-total]')!;
    expect(footerText(grand)).toContain('GRAND');
  });
});

describe('GroupedGrid authoritative results — review follow-ups', () => {
  it('results only: the column aggregateFormat never formats an ABSENT group (null stays blank)', () => {
    const cols = columns.map((c) => (c.aggregate ? { ...c, aggregateFormat: (v: number | null) => `USD ${v ?? 0}` } : c));
    const { container } = render(
      <GroupedGrid items={items} columns={cols} group={group} groupAggregateResults={{ Active: { revenue: { sum: 999 } } }} />,
      { wrapper },
    );
    // Positive control: a supplied value still goes through the column's format.
    expect(footerText(section(container, 'Active'))).toContain('USD 999');
    expect(footerText(section(container, 'Closed')).replace(/\|/g, '')).toBe('');
  });

  it('two columns on ONE field with different functions: both are blank when absent', () => {
    const cols: ColumnDef<Row>[] = [
      { key: 'name', fieldName: 'name', name: 'Name', rendererType: 'text' },
      { key: 'rsum', fieldName: 'revenue', name: 'Revenue', rendererType: 'currency', aggregate: 'sum' },
      { key: 'ravg', fieldName: 'revenue', name: 'Avg revenue', rendererType: 'currency', aggregate: 'avg' },
    ];
    const { container } = render(<GroupedGrid items={items} columns={cols} group={group} groupAggregateResults={{}} />, { wrapper });
    // Closed's only row is $300.00: a computed sum or avg would print it in the footer.
    expect(footerText(section(container, 'Closed'))).not.toContain('300');
    expect(footerText(section(container, 'Closed')).replace(/\|/g, '').replace(/avg/g, '').trim()).toBe('');
  });

  it('look="ce" warns once that per-group subtotal props are ignored', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<GroupedGrid look="ce" items={items} columns={columns} group={group} groupAggregateResults={{ Active: { revenue: { sum: 1 } } }} />, { wrapper });
    expect(warn.mock.calls.some((c) => String(c[0]).includes('groupAggregateResults'))).toBe(true);
    warn.mockRestore();
  });
});

describe('GroupedGrid grand-total footer (rebuilt)', () => {
  it('is exactly one headerless, row-less grid, after the groups', () => {
    const { container } = render(<GroupedGrid items={items} columns={columns} group={group} aggregateResults={{ revenue: { sum: 650 } }} />, { wrapper });
    const grands = container.querySelectorAll<HTMLElement>('[data-gridkit-grand-total]');
    expect(grands).toHaveLength(1);
    const grand = grands[0];
    expect(grand.querySelectorAll('[role="columnheader"]')).toHaveLength(0);
    // Only footer rows: every row sits in the aggregate footer.
    const rows = [...grand.querySelectorAll('[role="row"]')];
    expect(rows.length).toBe(1);
    expect(rows.every((r) => r.closest('[data-gridkit-aggregate-footer]'))).toBe(true);
    expect(footerText(grand)).toContain('$650.00');
    // It comes after the last group in document order.
    const lastGroup = [...container.querySelectorAll('[data-gridkit-group-key]')].pop()!;
    expect(lastGroup.compareDocumentPosition(grand) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('has the same cell count per row as a group grid (select cell + ⋯ column included)', () => {
    const rowCommands: V9RowCommand<Row>[] = [{ key: 'open', text: 'Open', onClick: () => undefined }];
    const { container } = render(
      <GroupedGrid
        items={items}
        columns={columns}
        group={{ ...group, showGroupAggregates: true }}
        selectionMode="multiple"
        rowCommands={rowCommands}
        rowCommandsDisplay="button"
      />,
      { wrapper },
    );
    const groupFooterRow = section(container, 'Active').querySelector('[data-gridkit-aggregate-footer] [role="row"]')!;
    const grandRow = container.querySelector('[data-gridkit-grand-total] [data-gridkit-aggregate-footer] [role="row"]')!;
    // 1 select + 2 data + 1 "⋯".
    expect(groupFooterRow.children.length).toBe(4);
    expect(grandRow.children.length).toBe(groupFooterRow.children.length);
  });

  it('sits INSIDE the scroll container and sticks to its bottom when the grid has a height', () => {
    const { container } = render(<GroupedGrid items={items} columns={columns} group={group} height={300} />, { wrapper });
    const grand = container.querySelector<HTMLElement>('[data-gridkit-grand-total]')!;
    const scroller = container.querySelector<HTMLElement>('[data-gridkit-group-scroller]')!;
    expect(scroller.style.overflow).toBe('auto');
    expect(scroller.contains(grand)).toBe(true);
    expect(grand.style.position).toBe('sticky');
    expect(grand.style.bottom).toBe('0px');
  });

  // (The AccordionPanel inset is a var() margin, which jsdom drops from the CSSOM: the Chrome ce-parity
  //  gate measures it instead — every column edge equal across group grids and the grand total.)

  it('stays visible while loading (a reload must not drop the server total)', () => {
    const { container } = render(<GroupedGrid items={items} columns={columns} group={group} aggregateResults={{ revenue: { sum: 650 } }} isLoading />, { wrapper });
    const grand = container.querySelector<HTMLElement>('[data-gridkit-grand-total]');
    expect(grand).toBeTruthy();
    expect(footerText(grand!)).toContain('$650.00');
  });

  // (The painted padding inset is a var(), which jsdom drops: gated in Chrome, grouped-subtotals.spec.mjs.)

  it('renders no grand total when no column declares an aggregate', () => {
    const plain = columns.map((c) => ({ ...c, aggregate: undefined }));
    const { container } = render(<GroupedGrid items={items} columns={plain} group={group} />, { wrapper });
    expect(container.querySelector('[data-gridkit-grand-total]')).toBeNull();
  });
});

describe('GroupedGrid parity forwarding to every group grid', () => {
  it('sort: every group header shows the sort, and a header click calls onSortChange', () => {
    const onSortChange = vi.fn();
    const { container } = render(
      <GroupedGrid
        items={items}
        columns={columns.map((c) => ({ ...c, isSortable: true }))}
        group={group}
        sort={{ fieldName: 'name', direction: 'desc' }}
        onSortChange={onSortChange}
      />,
      { wrapper },
    );
    const sorted = container.querySelectorAll('[role="columnheader"] [aria-sort="descending"]');
    expect(sorted).toHaveLength(3); // one per group
    fireEvent.click(within(section(container, 'Closed')).getByRole('button', { name: 'Name' }));
    expect(onSortChange).toHaveBeenCalledWith('name', 'asc');
  });

  it('rowCommands render a "⋯" in every group', () => {
    const onClick = vi.fn();
    const { container } = render(
      <GroupedGrid items={items} columns={columns} group={group} rowCommands={[{ key: 'open', text: 'Open', onClick }]} rowCommandsDisplay="button" />,
      { wrapper },
    );
    for (const k of ['Active', 'Closed', BLANK_GROUP_KEY]) {
      expect(within(section(container, k)).getAllByRole('button', { name: 'More commands' }).length).toBeGreaterThan(0);
    }
  });

  it('onActiveItemChanged and onRowNavigate fire from a group row', () => {
    const onActiveItemChanged = vi.fn();
    const onRowNavigate = vi.fn();
    render(<GroupedGrid items={items} columns={columns} group={group} onActiveItemChanged={onActiveItemChanged} onRowNavigate={onRowNavigate} />, { wrapper });
    const row = screen.getByText('Gamma').closest('[role="row"]')!;
    fireEvent.click(row);
    fireEvent.doubleClick(row);
    expect(onActiveItemChanged).toHaveBeenCalledWith(items[2]);
    expect(onRowNavigate).toHaveBeenCalledWith(items[2]);
  });

  it('a group grid is named by its LABEL, and its section carries the raw key', () => {
    const { container } = render(
      <GroupedGrid items={items} columns={columns} group={{ ...group, getGroupLabel: (v) => `Status: ${String(v ?? 'none')}`, showCount: false }} />,
      { wrapper },
    );
    expect(within(section(container, 'Active')).getByRole('grid', { name: 'Status: Active' })).toBeTruthy();
  });
});

describe('GroupedGrid selection (host-owned across groups)', () => {
  const selectRow = (name: string): void => {
    const row = screen.getByText(name).closest('[role="row"]')!;
    fireEvent.click(within(row as HTMLElement).getByRole('checkbox'));
  };
  const lastSel = (fn: ReturnType<typeof vi.fn>): string[] => (fn.mock.calls.at(-1)?.[0] as Row[]).map((r) => r.name);

  it('emits the union across groups', () => {
    const onSelectionChanged = vi.fn();
    render(<GroupedGrid items={items} columns={columns} group={group} selectionMode="multiple" onSelectionChanged={onSelectionChanged} />, { wrapper });
    selectRow('Alpha');
    selectRow('Gamma');
    expect(lastSel(onSelectionChanged).sort()).toEqual(['Alpha', 'Gamma']);
  });

  it('prunes a selected row that leaves `items`, and emits the pruned set', () => {
    const onSelectionChanged = vi.fn();
    const props: V9GroupedGridProps<Row> = { items, columns, group, selectionMode: 'multiple', onSelectionChanged };
    const { rerender } = render(<GroupedGrid {...props} />, { wrapper });
    selectRow('Alpha');
    selectRow('Gamma');
    expect(lastSel(onSelectionChanged).sort()).toEqual(['Alpha', 'Gamma']);
    rerender(<GroupedGrid {...props} items={items.filter((r) => r.name !== 'Gamma')} />);
    expect(lastSel(onSelectionChanged)).toEqual(['Alpha']);
  });

  it('survives a reload (isLoading true → false) — the boxes and the emitted set agree', () => {
    const onSelectionChanged = vi.fn();
    const props: V9GroupedGridProps<Row> = { items, columns, group, selectionMode: 'multiple', onSelectionChanged };
    const { rerender } = render(<GroupedGrid {...props} />, { wrapper });
    selectRow('Alpha');
    rerender(<GroupedGrid {...props} isLoading />);
    rerender(<GroupedGrid {...props} isLoading={false} />);
    const box = within(screen.getByText('Alpha').closest('[role="row"]') as HTMLElement).getByRole('checkbox') as HTMLInputElement;
    expect(box.checked).toBe(true);
    expect(lastSel(onSelectionChanged)).toEqual(['Alpha']);
  });

  it('single selection is ONE row across all groups', () => {
    const onSelectionChanged = vi.fn();
    render(<GroupedGrid items={items} columns={columns} group={group} selectionMode="single" onSelectionChanged={onSelectionChanged} />, { wrapper });
    fireEvent.click(screen.getByText('Alpha').closest('[role="row"]')!);
    fireEvent.click(screen.getByText('Gamma').closest('[role="row"]')!);
    expect(lastSel(onSelectionChanged)).toEqual(['Gamma']);
  });
});

describe('GroupedGrid expansion survives a reload', () => {
  it('a collapsed group stays collapsed after isLoading true → false', () => {
    const props: V9GroupedGridProps<Row> = { items, columns, group };
    const { container, rerender } = render(<GroupedGrid {...props} />, { wrapper });
    const header = within(section(container, 'Active')).getAllByRole('button')[0];
    expect(header.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(header);
    expect(within(section(container, 'Active')).getAllByRole('button')[0].getAttribute('aria-expanded')).toBe('false');
    rerender(<GroupedGrid {...props} isLoading />);
    rerender(<GroupedGrid {...props} isLoading={false} />);
    expect(within(section(container, 'Active')).getAllByRole('button')[0].getAttribute('aria-expanded')).toBe('false');
    // Positive control: an untouched group is still open.
    expect(within(section(container, 'Closed')).getAllByRole('button')[0].getAttribute('aria-expanded')).toBe('true');
  });
});
