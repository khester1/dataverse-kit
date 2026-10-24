// @vitest-environment jsdom
/**
 * v8 `DataGrid` filtering through the REAL grid (not the core helpers): decision 1 (text operators
 * match what the grid shows), `initialFilterModel` (incl. columns arriving after mount), and a
 * condition on a field the grid no longer offers — ignored by the rows AND the "Filters (n)" badge.
 * Fixture rows carry the Dataverse `@OData…FormattedValue` annotation, so raw ≠ shown.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { setIconOptions } from '@fluentui/react';
import { DataGrid } from '../hosts/DataGrid';
import type { ColumnDef } from '../types';
import type { GridFilterModel } from '../core/filter';

setIconOptions({ disableWarnings: true });
afterEach(cleanup);

const FV = '@OData.Community.Display.V1.FormattedValue';
type Row = Record<string, unknown> & { key: string };

const cols = (): ColumnDef<Row>[] => [
  { key: 'name', fieldName: 'name', name: 'Name', rendererType: 'text', minWidth: 100 },
  { key: 'parent', fieldName: '_parentaccountid_value', name: 'Parent', rendererType: 'lookup', minWidth: 100 },
  { key: 'city', fieldName: 'city', name: 'City', rendererType: 'text', minWidth: 100 },
];
const withoutCity = (): ColumnDef<Row>[] => cols().filter((c) => c.key !== 'city');

const items: Row[] = [
  { key: 'r1', name: 'Alpha', _parentaccountid_value: 'a1b2c3d4-0000-0000-0000-000000000001', [`_parentaccountid_value${FV}`]: 'Contoso Ltd', city: 'Oslo' },
  { key: 'r2', name: 'Beta', _parentaccountid_value: 'ffff0000-0000-0000-0000-000000000002', [`_parentaccountid_value${FV}`]: 'Fabrikam', city: 'Bergen' },
  { key: 'r3', name: 'Gamma', _parentaccountid_value: 'eeee0000-0000-0000-0000-000000000003', [`_parentaccountid_value${FV}`]: 'Contoso Ltd', city: 'Bergen' },
];

const names = (): string[] =>
  ['Alpha', 'Beta', 'Gamma'].filter((n) => screen.queryAllByText(n).length > 0);

/** The Filters command label — CommandBar may render it twice (measuring layer), so take distinct. */
const filtersLabel = (): string[] =>
  Array.from(new Set(screen.getAllByText(/^Filters/).map((el) => el.textContent?.trim() ?? '')));

const model = (...conditions: GridFilterModel['conditions']): GridFilterModel => ({ match: 'all', conditions });

describe('v8 DataGrid filtering', () => {
  it('instrument: with no filter every row renders', () => {
    render(<DataGrid items={items} columns={cols()} filterBuilder />);
    expect(names()).toEqual(['Alpha', 'Beta', 'Gamma']);
    expect(filtersLabel()).toEqual(['Filters']);
  });

  it('decision 1: a lookup "contains" matches the NAME the grid shows, not only the GUID', () => {
    render(
      <DataGrid
        items={items}
        columns={cols()}
        filterBuilder
        initialFilterModel={model({ fieldName: '_parentaccountid_value', operator: 'like', value: 'contoso' })}
      />
    );
    expect(names()).toEqual(['Alpha', 'Gamma']);
    expect(filtersLabel()).toEqual(['Filters (1)']);
  });

  it('initialFilterModel waits for columns that arrive after mount, and does not fire onFilterChange', () => {
    const onFilterChange = vi.fn();
    const seed = model({ fieldName: 'city', operator: 'eq', value: 'Bergen' });
    const { rerender } = render(
      <DataGrid items={items} columns={[]} filterBuilder initialFilterModel={seed} onFilterChange={onFilterChange} />
    );
    rerender(<DataGrid items={items} columns={cols()} filterBuilder initialFilterModel={seed} onFilterChange={onFilterChange} />);
    expect(names()).toEqual(['Beta', 'Gamma']);
    expect(filtersLabel()).toEqual(['Filters (1)']);
    expect(onFilterChange).not.toHaveBeenCalled();
  });

  it('a seeded condition on a field the grid does not offer is dropped (rows and badge)', () => {
    render(
      <DataGrid
        items={items}
        columns={cols()}
        filterBuilder
        initialFilterModel={model(
          { fieldName: 'city', operator: 'eq', value: 'Bergen' },
          { fieldName: 'ghost', operator: 'eq', value: 'x' }
        )}
      />
    );
    expect(names()).toEqual(['Beta', 'Gamma']);
    expect(filtersLabel()).toEqual(['Filters (1)']);
  });

  it('a field REMOVED after the filter applied is ignored — it does not empty the grid or count', () => {
    const seed = model({ fieldName: 'city', operator: 'eq', value: 'Oslo' });
    const { rerender } = render(<DataGrid items={items} columns={cols()} filterBuilder initialFilterModel={seed} />);
    expect(names(), 'instrument: the city filter applied first').toEqual(['Alpha']);
    rerender(<DataGrid items={items} columns={withoutCity()} filterBuilder initialFilterModel={seed} />);
    expect(names()).toEqual(['Alpha', 'Beta', 'Gamma']);
    expect(filtersLabel()).toEqual(['Filters']);
  });

  it('the panel never shows a removed field\'s condition, so its next Apply drops it for good', () => {
    const onFilterChange = vi.fn();
    const seed = model({ fieldName: 'city', operator: 'eq', value: 'Oslo' });
    const props = { items, filterBuilder: true, initialFilterModel: seed, onFilterChange };
    const { rerender } = render(<DataGrid {...props} columns={withoutCity()} />);
    const cmd = screen.getAllByText(/^Filters/).map((el) => el.closest('button')).find(Boolean);
    if (!cmd) throw new Error('instrument: no Filters command button');
    fireEvent.click(cmd);
    const panel = screen.getByRole('dialog');
    expect(within(panel).getByText('Edit filters'), 'instrument: the filter panel opened').toBeTruthy();
    fireEvent.click(within(panel).getByRole('button', { name: 'Apply' }));
    expect(onFilterChange).toHaveBeenCalledTimes(1);
    expect(onFilterChange).toHaveBeenLastCalledWith({ match: 'all', conditions: [] });
    // The column comes back: the dropped condition must NOT revive.
    rerender(<DataGrid {...props} columns={cols()} />);
    expect(names()).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('the aggregate footer over `aggregateItems` uses the same rule (display-text match, off-page rows too)', () => {
    // Distinct revenues, so the sum names exactly which rows were included: r1 + r3 + r4 = 4103.
    const revenue = [100, 20, 3];
    const page = items.map((r, i) => ({ ...r, revenue: revenue[i] }));
    const all = [...page, { ...items[0], key: 'r4', name: 'Delta', revenue: 4000 }];
    const withRevenue: ColumnDef<Row>[] = [
      ...cols(),
      {
        key: 'revenue', fieldName: 'revenue', name: 'Revenue', rendererType: 'number', minWidth: 100,
        aggregate: 'sum', aggregateFormat: (v) => `SUM=${v}`,
      },
    ];
    render(
      <DataGrid
        items={page}
        aggregateItems={all}
        columns={withRevenue}
        filterBuilder
        initialFilterModel={model({ fieldName: '_parentaccountid_value', operator: 'like', value: 'contoso' })}
      />
    );
    expect(screen.queryAllByText(/^SUM=/).map((e) => e.textContent)).toEqual(['SUM=4103']);
  });

  it('control: WITHOUT an Apply, a re-added field\'s condition applies again (it was ignored, not deleted)', () => {
    const seed = model({ fieldName: 'city', operator: 'eq', value: 'Oslo' });
    const { rerender } = render(<DataGrid items={items} filterBuilder initialFilterModel={seed} columns={withoutCity()} />);
    expect(names()).toEqual(['Alpha', 'Beta', 'Gamma']);
    rerender(<DataGrid items={items} filterBuilder initialFilterModel={seed} columns={cols()} />);
    expect(names()).toEqual(['Alpha']);
  });
});
