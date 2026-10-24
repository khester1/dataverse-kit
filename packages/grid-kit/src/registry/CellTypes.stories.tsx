import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { initializeIcons } from '@fluentui/react';
import { DataGrid } from '../hosts';
import { demoColumns, demoRows } from '../_storybook/sample';
import type { ColumnDef } from '../types';
import type { DemoRow } from '../_storybook/sample';

initializeIcons();

const meta: Meta = {
  title: 'Grid Kit/Cell Types',
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
};
export default meta;

/**
 * Kitchen-sink: every registered cell type in one grid, with multi-select and a
 * working, selection-aware toolbar (Delete enables + shows a count when rows are
 * checked). Column chooser + filter builder are on so the injected Columns/Filters
 * toolbar commands are functional too.
 */
function AllCellTypesDemo(): JSX.Element {
  const [selected, setSelected] = React.useState<DemoRow[]>([]);
  return (
    <DataGrid<DemoRow>
      items={demoRows}
      columns={demoColumns}
      getKey={(r) => r.key}
      selectionMode="multiple"
      onSelectionChanged={setSelected}
      columnChooser
      filterBuilder
      toolbar={{
        showSearch: true,
        searchPlaceholder: 'Search accounts',
        commands: [
          { key: 'new', text: 'New', iconName: 'Add', onClick: () => alert('New') },
          { key: 'refresh', text: 'Refresh', iconName: 'Refresh', onClick: () => alert('Refresh') },
          {
            key: 'delete',
            text: selected.length ? `Delete (${selected.length})` : 'Delete',
            iconName: 'Delete',
            disabled: selected.length === 0,
            onClick: () => alert(`Delete: ${selected.map((r) => r.name).join(', ')}`),
          },
        ],
      }}
    />
  );
}
export const AllCellTypes: StoryObj = { render: () => <AllCellTypesDemo /> };

function oneColumn(col: ColumnDef<DemoRow>): StoryObj {
  return {
    render: () => (
      <DataGrid<DemoRow>
        items={demoRows}
        columns={[{ key: 'name', fieldName: 'name', name: 'Account', rendererType: 'text', minWidth: 160 }, col]}
        getKey={(r) => r.key}
      />
    ),
  };
}

export const Currency = oneColumn(demoColumns.find((c) => c.rendererType === 'currency')!);
export const Progress = oneColumn(demoColumns.find((c) => c.rendererType === 'progress')!);
export const Rating = oneColumn(demoColumns.find((c) => c.rendererType === 'rating')!);
export const StatusBadge = oneColumn(demoColumns.find((c) => c.rendererType === 'coloredCell')!);
export const ToggleCol = oneColumn(demoColumns.find((c) => c.rendererType === 'toggle')!);

/** Composite cell: icon + name + status badge in one cell. */
export const Composite: StoryObj = {
  render: () => (
    <DataGrid<DemoRow>
      items={demoRows}
      getKey={(r) => r.key}
      columns={[
        {
          key: 'profile',
          fieldName: 'name',
          name: 'Profile',
          rendererType: 'composite',
          minWidth: 280,
          rendererConfig: {
            layout: 'horizontal',
            gap: 8,
            slots: [
              { id: 's1', type: 'icon', staticValue: 'Contact' },
              { id: 's2', type: 'text', fieldBinding: 'name', defaultStyle: { fontWeight: '600' } },
              { id: 's3', type: 'spacer' },
              {
                id: 's4',
                type: 'badge',
                fieldBinding: 'status',
                defaultStyle: { backgroundColor: '#edebe9', color: '#323130' },
                conditionalStyles: [
                  { field: 'status', operator: 'eq', value: 'Active', style: { backgroundColor: '#dff6dd', color: '#107c10' } },
                  { field: 'status', operator: 'eq', value: 'Inactive', style: { backgroundColor: '#fde7e9', color: '#a4262c' } },
                ],
              },
            ],
          },
        },
      ]}
    />
  ),
};
