import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { initializeIcons } from '@fluentui/react';
import { DataGrid } from './DataGrid';
import { demoColumns, demoRows } from '../_storybook/sample';
import type { DemoRow } from '../_storybook/sample';

initializeIcons();

const meta: Meta<typeof DataGrid> = {
  title: 'Grid Kit/DataGrid',
  component: DataGrid as never,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

export const Flat: Story = {
  render: () => <DataGrid<DemoRow> items={demoRows} columns={demoColumns} getKey={(r) => r.key} />,
};

const EditableDemo: React.FC = () => {
  const [rows, setRows] = useState(demoRows);
  return (
    <DataGrid<DemoRow>
      items={rows}
      columns={demoColumns}
      editable
      getKey={(r) => r.key}
      onValueChange={(rowKey, fieldName, value) =>
        setRows((prev) => prev.map((r) => (r.key === rowKey ? { ...r, [fieldName]: value } : r)))
      }
    />
  );
};

export const Editable: Story = { render: () => <EditableDemo /> };

export const WithSelection: Story = {
  render: () => <DataGrid<DemoRow> items={demoRows} columns={demoColumns} selectionMode="multiple" getKey={(r) => r.key} />,
};

export const WithToolbar: Story = {
  render: () => (
    <DataGrid<DemoRow>
      items={demoRows}
      columns={demoColumns}
      getKey={(r) => r.key}
      toolbar={{
        showSearch: true,
        searchPlaceholder: 'Search accounts',
        commands: [
          { key: 'new', text: 'New', iconName: 'Add', onClick: () => alert('New') },
          { key: 'refresh', text: 'Refresh', iconName: 'Refresh', onClick: () => alert('Refresh') },
          { key: 'delete', text: 'Delete', iconName: 'Delete', disabled: true },
        ],
      }}
    />
  ),
};

const PaginationDemo: React.FC = () => {
  const [page, setPage] = useState(1);
  const pageSize = 2;
  const start = (page - 1) * pageSize;
  return (
    <DataGrid<DemoRow>
      items={demoRows.slice(start, start + pageSize)}
      columns={demoColumns}
      getKey={(r) => r.key}
      pagination={{ currentPage: page, pageSize, totalItems: demoRows.length }}
      onPageChange={setPage}
    />
  );
};

export const WithPagination: Story = { render: () => <PaginationDemo /> };

export const Loading: Story = {
  render: () => <DataGrid<DemoRow> items={[]} columns={demoColumns} isLoading getKey={(r) => r.key} />,
};

export const Compact: Story = {
  render: () => <DataGrid<DemoRow> items={demoRows} columns={demoColumns} compact getKey={(r) => r.key} />,
};

/**
 * Responsive column shedding (Tier-2 C): columns declare a `responsivePriority`, so inside a
 * narrow (~340px) container the grid drops the lowest-priority columns (below the md/768
 * cutoff) and keeps the highest. Aggregate + `__`-prefixed control columns are never shed.
 * Resize the canvas wider to watch columns return. With NO `responsivePriority` set, nothing
 * sheds (every existing grid is unchanged).
 */
export const ResponsiveColumns: Story = {
  render: () => {
    const prioritized = demoColumns.map((c, i) => ({ ...c, responsivePriority: 100 - i * 15 }));
    return (
      <div style={{ width: 340, border: '1px dashed #c8c6c4', padding: 8 }}>
        <DataGrid<DemoRow> items={demoRows} columns={prioritized} getKey={(r) => r.key} />
      </div>
    );
  },
};
