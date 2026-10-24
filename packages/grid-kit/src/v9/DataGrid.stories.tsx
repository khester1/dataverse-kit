import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FluentProvider } from '@fluentui/react-components';
import { ArrowClockwiseRegular, OpenRegular, DeleteRegular } from '@fluentui/react-icons';
import { DataGrid } from './hosts/DataGrid';
import { ReadOnlyGrid } from './hosts/ReadOnlyGrid';
import { dynamicsV9Theme } from './theme';
import type { GridSortState } from '../types';
import { demoColumns, demoRows } from '../_storybook/sample';
import type { DemoRow } from '../_storybook/sample';

// The v9 grid renders inside a FluentProvider (v9's theme/renderer context) — the
// Dynamics-blue v9 theme, so brand accents match the v8 skin.
const meta: Meta<typeof DataGrid> = {
  title: 'Grid Kit v9/DataGrid',
  component: DataGrid as never,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <FluentProvider theme={dynamicsV9Theme}>
        <Story />
      </FluentProvider>
    ),
  ],
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

/** The flat read grid with all read cell types (text/link/coloredCell/currency/progress/rating/date/toggle). */
export const Flat: Story = {
  render: () => <DataGrid<DemoRow> items={demoRows} columns={demoColumns} getKey={(r) => r.key} aria-label="Accounts" />,
};

/** Multi-select — the select-all + per-row checkboxes report the selection. */
export const WithSelection: Story = {
  render: () => {
    const Demo: React.FC = () => {
      const [selected, setSelected] = useState<DemoRow[]>([]);
      return (
        <>
          <DataGrid<DemoRow>
            items={demoRows}
            columns={demoColumns}
            getKey={(r) => r.key}
            selectionMode="multiple"
            onSelectionChanged={setSelected}
          />
          <p style={{ fontSize: 12, color: '#605e5c' }}>Selected: {selected.map((r) => r.name).join(', ') || '(none)'}</p>
        </>
      );
    };
    return <Demo />;
  },
};

/** Controlled sort — clicking a sortable header calls onSortChange (the grid does not sort in-memory). */
export const Sortable: Story = {
  render: () => {
    const Demo: React.FC = () => {
      const [sort, setSort] = useState<GridSortState>({ fieldName: 'name', direction: 'asc' });
      const sorted = [...demoRows].sort((a, b) => {
        const av = a[sort.fieldName];
        const bv = b[sort.fieldName];
        const cmp = av! < bv! ? -1 : av! > bv! ? 1 : 0;
        return sort.direction === 'asc' ? cmp : -cmp;
      });
      return (
        <DataGrid<DemoRow>
          items={sorted}
          columns={demoColumns}
          getKey={(r) => r.key}
          sort={sort}
          onSortChange={(fieldName, direction) => setSort({ fieldName, direction })}
        />
      );
    };
    return <Demo />;
  },
};

/** Loading — a skeleton placeholder body. */
export const Loading: Story = {
  render: () => <DataGrid<DemoRow> items={[]} columns={demoColumns} isLoading />,
};

/** A cross-page aggregate footer (Revenue sum) + a presentational pager. */
export const WithAggregateAndPaging: Story = {
  render: () => (
    <DataGrid<DemoRow>
      items={demoRows}
      columns={demoColumns.map((c) => (c.key === 'revenue' ? { ...c, aggregate: 'sum' } : c))}
      getKey={(r) => r.key}
      pagination={{ currentPage: 1, pageSize: 4, totalItems: 24 }}
      onPageChange={() => undefined}
    />
  ),
};

/** A lean toolbar — a search box + a Refresh command. */
export const WithToolbar: Story = {
  render: () => (
    <DataGrid<DemoRow>
      items={demoRows}
      columns={demoColumns}
      getKey={(r) => r.key}
      toolbar={{
        showSearch: true,
        searchPlaceholder: 'Search accounts',
        onSearch: () => undefined,
        commands: [{ key: 'refresh', text: 'Refresh', icon: <ArrowClockwiseRegular />, onClick: () => undefined }],
      }}
    />
  ),
};

/** Turnkey export (`exportConfig`): one button per format in the default toolbar, an `Export ▾`
 *  menu in `layout: 'dynamics'`. Select rows to export only those. CSV carries what the grid shows. */
export const WithExport: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 24 }}>
      <DataGrid<DemoRow>
        items={demoRows}
        columns={demoColumns}
        getKey={(r) => r.key}
        selectionMode="multiple"
        exportConfig={{ enabled: true, filename: 'accounts' }}
        aria-label="Accounts (default toolbar)"
      />
      <DataGrid<DemoRow>
        items={demoRows}
        columns={demoColumns}
        getKey={(r) => r.key}
        selectionMode="multiple"
        toolbar={{ layout: 'dynamics', title: 'Accounts', commands: [] }}
        exportConfig={{ enabled: true, filename: 'accounts' }}
        aria-label="Accounts (dynamics toolbar)"
      />
    </div>
  ),
};

/** Inline editing — click a cell (name / revenue / rating) to edit; changes commit to state. */
export const Editable: Story = {
  render: () => {
    const Demo: React.FC = () => {
      const [rows, setRows] = useState(demoRows);
      return (
        <DataGrid<DemoRow>
          items={rows}
          columns={demoColumns}
          getKey={(r) => r.key}
          editable
          onValueChange={(rowKey, fieldName, value) =>
            setRows((prev) => prev.map((r) => (r.key === rowKey ? { ...r, [fieldName]: value } : r)))
          }
        />
      );
    };
    return <Demo />;
  },
};

/** editTrigger="always" — every editable cell shows its editor at once (Excel-like). */
export const EditableAlways: Story = {
  render: () => {
    const Demo: React.FC = () => {
      const [rows, setRows] = useState(demoRows);
      return (
        <DataGrid<DemoRow>
          items={rows}
          columns={demoColumns}
          getKey={(r) => r.key}
          editable
          editTrigger="always"
          onValueChange={(rowKey, fieldName, value) =>
            setRows((prev) => prev.map((r) => (r.key === rowKey ? { ...r, [fieldName]: value } : r)))
          }
        />
      );
    };
    return <Demo />;
  },
};

/** The read-only preset — no selection column. */
export const ReadOnly: Story = {
  render: () => <ReadOnlyGrid<DemoRow> items={demoRows} columns={demoColumns} getKey={(r) => r.key} />,
};

/**
 * Row commands as a visible "⋯" button (`rowCommandsDisplay="both"`: the button AND right-click).
 * Using the button or its menu never selects or activates the row — the selection readout stays
 * put. Delete is hidden on the first row (`visible`) and disabled on the second (`disabled`).
 */
export const RowCommandsButton: Story = {
  render: () => {
    const Demo: React.FC = () => {
      const [selected, setSelected] = useState<DemoRow[]>([]);
      const [last, setLast] = useState('(none)');
      return (
        <>
          <DataGrid<DemoRow>
            items={demoRows}
            columns={demoColumns}
            getKey={(r) => r.key}
            selectionMode="multiple"
            onSelectionChanged={setSelected}
            rowCommandsDisplay="both"
            rowCommands={[
              { key: 'open', text: 'Open', icon: <OpenRegular />, onClick: (r) => setLast(`Open ${r.name}`) },
              {
                key: 'delete',
                text: 'Delete',
                icon: <DeleteRegular />,
                visible: (r) => r.key !== demoRows[0].key,
                disabled: (r) => r.key === demoRows[1].key,
                onClick: (r) => setLast(`Delete ${r.name}`),
              },
            ]}
          />
          <p style={{ fontSize: 12, color: '#605e5c' }}>
            Last command: {last} · Selected: {selected.map((r) => r.name).join(', ') || '(none)'}
          </p>
        </>
      );
    };
    return <Demo />;
  },
};

/** The "⋯" column in a NON-resizable grid stays a fixed 44px; the data columns share the rest. */
export const RowCommandsButtonFixedWidth: Story = {
  render: () => (
    <div style={{ width: 560 }}>
      <ReadOnlyGrid<DemoRow>
        items={demoRows}
        columns={demoColumns.slice(0, 3)}
        getKey={(r) => r.key}
        rowCommandsDisplay="button"
        rowCommands={[{ key: 'open', text: 'Open', icon: <OpenRegular />, onClick: () => undefined }]}
      />
    </div>
  ),
};
