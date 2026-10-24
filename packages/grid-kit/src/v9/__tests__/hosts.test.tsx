// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { ColumnDef } from '../../types';
import { CardGrid } from '../hosts/CardGrid';
import { FocusedViewGrid } from '../hosts/FocusedViewGrid';
import { cardGridStyle as v9CardGridStyle, resolveCardLayout as v9Resolve, CARD_GRID_GAP as V9_GAP } from '../hosts/cardLayout';
// The v8 source of the forked pure helpers — imported ONLY in this test to guard the
// fork against silent drift (it is NOT imported by the v9 bundle; the v9 host forks it
// to avoid the v8 mergeStyles side-effect in src/hosts/cardLayout.tsx).
import { cardGridStyle as v8CardGridStyle, resolveCardLayout as v8Resolve, CARD_GRID_GAP as V8_GAP } from '../../hosts/cardLayout';
import { wrapper } from './testUtils';

afterEach(cleanup);

interface Row extends Record<string, unknown> {
  key: string;
  name: string;
  status: string;
  revenue: number;
}
const items: Row[] = [
  { key: '1', name: 'Contoso', status: 'Active', revenue: 1000 },
  { key: '2', name: 'Fabrikam', status: 'Pending', revenue: 2000 },
];
const columns: ColumnDef<Row>[] = [
  { key: 'name', fieldName: 'name', name: 'Account', rendererType: 'text' },
  { key: 'status', fieldName: 'status', name: 'Status', rendererType: 'text' },
  { key: 'revenue', fieldName: 'revenue', name: 'Revenue', rendererType: 'currency' },
];

describe('v9 cardLayout fork stays in sync with the v8 source (drift guard)', () => {
  it('CARD_GRID_GAP matches', () => {
    expect(V9_GAP).toBe(V8_GAP);
  });
  it('cardGridStyle matches for fixed + responsive tracks', () => {
    expect(v9CardGridStyle(3)).toEqual(v8CardGridStyle(3));
    expect(v9CardGridStyle(3, 260)).toEqual(v8CardGridStyle(3, 260));
    expect(v9CardGridStyle(4, 200)).toEqual(v8CardGridStyle(4, 200));
  });
  it('resolveCardLayout matches (fields + body columns)', () => {
    const card = { cardsPerRow: 2, titleField: 'name', subtitleField: 'status', minCardWidth: 180 };
    const a = v9Resolve(columns, card);
    const b = v8Resolve(columns, card);
    expect([a.cardsPerRow, a.minCardWidth, a.titleField, a.subtitleField, a.imageField]).toEqual([
      b.cardsPerRow,
      b.minCardWidth,
      b.titleField,
      b.subtitleField,
      b.imageField,
    ]);
    expect(a.bodyColumns.map((c) => c.key)).toEqual(b.bodyColumns.map((c) => c.key));
  });
});

describe('v9 CardGrid', () => {
  it('renders a card per row with title + body fields (via the registry)', () => {
    render(<CardGrid items={items} columns={columns} card={{ titleField: 'name' }} />, { wrapper });
    expect(screen.getByText('Contoso')).toBeTruthy();
    expect(screen.getByText('Fabrikam')).toBeTruthy();
    // Body field labels (all columns except the title) render for each card.
    expect(screen.getAllByText('Status').length).toBe(2);
    expect(screen.getAllByText('Revenue').length).toBe(2);
    // Currency renders through the shared registry (formatted).
    expect(screen.getByText('$1,000.00')).toBeTruthy();
    expect(screen.getByText('$2,000.00')).toBeTruthy();
  });

  it('checkbox selection reports the selected rows', () => {
    const onSelectionChanged = vi.fn();
    render(<CardGrid items={items} columns={columns} selectionMode="multiple" onSelectionChanged={onSelectionChanged} />, {
      wrapper,
    });
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
    fireEvent.click(checkboxes[0]);
    const calls = onSelectionChanged.mock.calls;
    const selected = calls[calls.length - 1][0] as Row[];
    expect(selected).toHaveLength(1);
    expect(selected[0].key).toBe('1');
  });

  it('single-select replaces the prior selection', () => {
    const onSelectionChanged = vi.fn();
    render(<CardGrid items={items} columns={columns} selectionMode="single" onSelectionChanged={onSelectionChanged} />, {
      wrapper,
    });
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);
    const calls = onSelectionChanged.mock.calls;
    const selected = calls[calls.length - 1][0] as Row[];
    expect(selected).toHaveLength(1);
    expect(selected[0].key).toBe('2');
  });
});

describe('v9 FocusedViewGrid', () => {
  const focusedView = {
    rows: [
      { id: 'r1', primaryField: { fieldName: 'name', label: 'Name' }, secondaryField: { fieldName: 'status', label: 'Status' } },
    ],
    detailFields: ['status', 'revenue'],
  };

  it('renders a rail + a detail pane (first row active by default)', () => {
    render(<FocusedViewGrid items={items} columns={columns} focusedView={focusedView} />, { wrapper });
    // Rail primary text for both records.
    expect(screen.getAllByText('Contoso').length).toBeGreaterThan(0);
    expect(screen.getByText('Fabrikam')).toBeTruthy();
    // Detail pane of the active (first) record shows its detail-field values.
    expect(screen.getByText('$1,000.00')).toBeTruthy();
  });

  it('clicking a rail item switches the detail pane', () => {
    render(<FocusedViewGrid items={items} columns={columns} focusedView={focusedView} />, { wrapper });
    fireEvent.click(screen.getByText('Fabrikam'));
    expect(screen.getByText('$2,000.00')).toBeTruthy();
  });

  it('the search box filters the rail', () => {
    render(<FocusedViewGrid items={items} columns={columns} focusedView={focusedView} />, { wrapper });
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Contoso' } });
    expect(screen.queryByText('Fabrikam')).toBeNull();
  });

  // The detail pane's child grid takes the host's `look` (and only it — the rail/pane are not a measured surface).
  const nested = {
    mode: 'detail-pane' as const,
    childColumns: [{ key: 'title', fieldName: 'title', name: 'Title', rendererType: 'text' as const }],
    getChildren: () => [{ key: 'c1', title: 'Child One' }],
  };
  const childLooks = (): (string | null)[] =>
    [...document.querySelectorAll('[data-gridkit-look]')].map((e) => e.getAttribute('data-gridkit-look'));
  it('look="ce" → the detail pane child grid is a ce grid', () => {
    render(<FocusedViewGrid items={items} columns={columns} focusedView={focusedView} nested={nested} look="ce" />, { wrapper });
    expect(screen.getByText('Child One')).toBeTruthy();
    expect(childLooks()).toEqual(['ce']);
  });
  it('look="ce" reaches the child in childOnly mode too (the pane shows only the child)', () => {
    render(<FocusedViewGrid items={items} columns={columns} focusedView={{ ...focusedView, childOnly: true }} nested={nested} look="ce" />, { wrapper });
    expect(screen.getByText('Child One')).toBeTruthy();
    expect(screen.queryByText('Related')).toBeNull();
    expect(childLooks()).toEqual(['ce']);
  });
  it('no look → the child grid stays default (unchanged)', () => {
    render(<FocusedViewGrid items={items} columns={columns} focusedView={focusedView} nested={nested} />, { wrapper });
    expect(screen.getByText('Child One')).toBeTruthy();
    expect(childLooks()).toEqual(['default']);
  });
});
