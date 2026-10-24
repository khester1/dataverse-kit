// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { ColumnDef, GroupConfig } from '../../types';
import { GroupedGrid } from '../hosts/GroupedGrid';
import { bucketGroups } from '../hosts/buildGroups';
// v8 source of the bucketing logic — imported ONLY here to drift-guard the v9 fork
// (not imported by the v9 bundle; the v9 host forks it to avoid the Fluent-v8 IGroup type).
import { buildGroups } from '../../hosts/buildGroups';
import { wrapper } from './testUtils';

afterEach(cleanup);

interface Row extends Record<string, unknown> {
  key: string;
  name: string;
  status: string;
  revenue: number;
}
const items: Row[] = [
  { key: '1', name: 'Alpha', status: 'Active', revenue: 100 },
  { key: '2', name: 'Beta', status: 'Active', revenue: 200 },
  { key: '3', name: 'Gamma', status: 'Closed', revenue: 300 },
];
const columns: ColumnDef<Row>[] = [
  { key: 'name', fieldName: 'name', name: 'Name', rendererType: 'text' },
  { key: 'revenue', fieldName: 'revenue', name: 'Revenue', rendererType: 'currency', aggregate: 'sum' },
];
const group: GroupConfig<Row> = { groupBy: 'status' };

describe('v9 bucketGroups fork stays in sync with the v8 buildGroups (drift guard)', () => {
  it('same bucket keys, counts, and labels', () => {
    const v9 = bucketGroups(items, group);
    const v8 = buildGroups(items, group).groups;
    expect(v9.map((g) => g.key)).toEqual(v8.map((g) => g.key));
    expect(v9.map((g) => g.count)).toEqual(v8.map((g) => g.count));
    // buildGroups bakes "(count)" into `name`; bucketGroups into `label` — same string.
    expect(v9.map((g) => g.label)).toEqual(v8.map((g) => g.name));
  });
  it('honors showCount:false + (Blank) for null groupBy values', () => {
    const rows = [{ key: '1', status: null }, { key: '2', status: 'X' }] as unknown as Row[];
    const g9 = bucketGroups(rows, { groupBy: 'status', showCount: false });
    const g8 = buildGroups(rows, { groupBy: 'status', showCount: false }).groups;
    expect(g9.map((g) => g.label)).toEqual(g8.map((g) => g.name));
    expect(g9[0].key).toBe('(Blank)');
  });
});

describe('v9 GroupedGrid', () => {
  it('renders an Accordion of groups (label + count) with each group’s rows', () => {
    render(<GroupedGrid items={items} columns={columns} group={group} />, { wrapper });
    expect(screen.getByText('Active (2)')).toBeTruthy();
    expect(screen.getByText('Closed (1)')).toBeTruthy();
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Gamma')).toBeTruthy();
  });

  it('renders an overall aggregate footer across all groups', () => {
    render(<GroupedGrid items={items} columns={columns} group={group} />, { wrapper });
    expect(screen.getByText('$600.00')).toBeTruthy();
    // Gamma's row is $300.00, but WITHOUT showGroupAggregates there are no per-group
    // subtotals — so $300.00 appears exactly once (the body cell). (The footer sum
    // no longer carries a "Σ" prefix, so it's distinguished by count, not label.)
    expect(screen.getAllByText('$300.00')).toHaveLength(1);
  });

  it('showGroupAggregates renders per-group subtotals', () => {
    render(<GroupedGrid items={items} columns={columns} group={{ groupBy: 'status', showGroupAggregates: true }} />, {
      wrapper,
    });
    // Active sum = 300 and Closed sum = 300 (two per-group subtotals), plus Gamma's
    // $300.00 body row = 3 occurrences; overall = 600 (unique to the footer).
    expect(screen.getAllByText('$300.00')).toHaveLength(3);
    expect(screen.getByText('$600.00')).toBeTruthy();
  });

  it('aggregates selection across groups', () => {
    const onSelectionChanged = vi.fn();
    render(
      <GroupedGrid items={items} columns={columns} group={group} selectionMode="multiple" onSelectionChanged={onSelectionChanged} />,
      { wrapper },
    );
    // One "Select all rows" per group DataGrid — the first is the Active group.
    const selectAlls = screen.getAllByLabelText('Select all rows');
    expect(selectAlls.length).toBe(2);
    fireEvent.click(selectAlls[0]);
    const calls = onSelectionChanged.mock.calls;
    const selected = calls[calls.length - 1][0] as Row[];
    expect(selected).toHaveLength(2); // Active group has Alpha + Beta
  });
});
