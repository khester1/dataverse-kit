import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { initializeIcons } from '@fluentui/react';
import { ReadOnlyGrid } from './ReadOnlyGrid';
import { CardGrid } from './CardGrid';
import { GroupedGrid } from './GroupedGrid';
import { DataGrid } from './DataGrid';
import { demoColumns, demoRows } from '../_storybook/sample';
import type { DemoRow } from '../_storybook/sample';
import type { ColumnDef } from '../types';

initializeIcons();

// Adds an editable optionset (Dropdown) column so click-to-edit exercises the
// Fluent portal path — picking an option must NOT close the editor early.
const clickEditColumns: ColumnDef<DemoRow>[] = [
  { key: 'name', fieldName: 'name', name: 'Account', rendererType: 'text', editorType: 'text', minWidth: 150 },
  {
    key: 'status',
    fieldName: 'status',
    name: 'Status',
    rendererType: 'optionset',
    editorType: 'dropdown',
    minWidth: 140,
    rendererConfig: {
      options: [
        { value: 'Active', label: 'Active' },
        { value: 'Pending', label: 'Pending' },
        { value: 'Inactive', label: 'Inactive' },
      ],
    },
  },
  { key: 'revenue', fieldName: 'revenue', name: 'Revenue', rendererType: 'currency', editorType: 'number', minWidth: 120, rendererConfig: { currencyCode: 'USD' } },
];

const meta: Meta = {
  title: 'Grid Kit/Grid Types',
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
};
export default meta;

/** Read-only: no selection, no editing, no command bar. */
export const ReadOnly: StoryObj = {
  render: () => <ReadOnlyGrid<DemoRow> items={demoRows} columns={demoColumns} getKey={(r) => r.key} />,
};

/**
 * Read-only with a forwarded toolbar — `commands` (New / Refresh / Export) now
 * pass through to the single host `<GridToolbar>` alongside the injected
 * Filter / Columns, instead of being stripped. This is what lets a read-only
 * subgrid consolidate into ONE bar. Rendered inside a deliberately NARROW,
 * `flexShrink: 0` container — the layout the export-engine custom bar avoided
 * Fluent `<CommandBar>` for — so the story doubles as a visual check that the
 * host CommandBar does NOT aggressively collapse the commands into an overflow.
 */
export const ReadOnlyWithToolbar: StoryObj = {
  render: () => (
    <div style={{ width: 520, flexShrink: 0, border: '1px solid #edebe9', padding: 8 }}>
      <ReadOnlyGrid<DemoRow>
        items={demoRows}
        columns={demoColumns}
        getKey={(r) => r.key}
        filterBuilder
        columnChooser
        toolbar={{
          showSearch: true,
          commands: [
            { key: 'new', text: 'New', iconName: 'Add', onClick: () => alert('new') },
            { key: 'refresh', text: 'Refresh', iconName: 'Refresh', onClick: () => alert('refresh') },
            { key: 'export', text: 'Export', iconName: 'Download', onClick: () => alert('export') },
          ],
        }}
      />
    </div>
  ),
};

/** Card list: each row a card; values render through the same cell registry. */
export const CardList: StoryObj = {
  render: () => (
    <CardGrid<DemoRow>
      items={demoRows}
      columns={demoColumns}
      getKey={(r) => r.key}
      selectionMode="multiple"
      card={{ cardsPerRow: 2, titleField: 'name', subtitleField: 'owner' }}
    />
  ),
};

/**
 * Responsive cards: setting `minCardWidth` makes the card grid REFLOW to the
 * container width — resize the Storybook canvas / window and watch the column count
 * drop (down to a single full-width column on mobile) while never exceeding
 * `cardsPerRow` on wide screens. Opt-in; without `minCardWidth` the grid keeps the
 * fixed `cardsPerRow` layout (see `CardList` above).
 */
export const CardListResponsive: StoryObj = {
  render: () => (
    <CardGrid<DemoRow>
      items={demoRows}
      columns={demoColumns}
      getKey={(r) => r.key}
      card={{ cardsPerRow: 4, minCardWidth: 240, titleField: 'name', subtitleField: 'owner' }}
    />
  ),
};

/** Grouped: rows bucketed by a field, collapsible headers with counts. */
export const Grouped: StoryObj = {
  render: () => (
    <GroupedGrid<DemoRow>
      items={demoRows}
      columns={demoColumns.filter((c) => c.fieldName !== 'status')}
      getKey={(r) => r.key}
      group={{ groupBy: 'status' }}
    />
  ),
};

/**
 * Grouped + multi-select: tick row checkboxes (or a group header to select every row in that
 * group); the live count below reflects the Selection wired through `onSelectionChanged`. This is
 * what powers a grouped grid's selection-gated toolbar commands (delete/activate of checked rows).
 */
// Stateful render extracted to a named component so the `useState` hook lives in a real React
// component (rules-of-hooks: a Story's `render` arrow is neither a component nor a hook).
function GroupedWithSelectionDemo(): JSX.Element {
  const [selected, setSelected] = React.useState<DemoRow[]>([]);
  return (
    <div>
      <div style={{ marginBottom: 8, fontSize: 13, color: '#605e5c' }}>
        Selected: {selected.length}
        {selected.length ? ` — ${selected.map((r) => r.name).join(', ')}` : ''}
      </div>
      <GroupedGrid<DemoRow>
        items={demoRows}
        columns={demoColumns.filter((c) => c.fieldName !== 'status')}
        getKey={(r) => r.key}
        group={{ groupBy: 'status' }}
        selectionMode="multiple"
        onSelectionChanged={(rows) => setSelected(rows)}
      />
    </div>
  );
}
export const GroupedWithSelection: StoryObj = {
  render: () => <GroupedWithSelectionDemo />,
};

/**
 * Per-cell click-to-edit (default): click a cell to edit just that one. Includes
 * an editable Status dropdown — picking an option (which renders in a Fluent
 * portal) must commit without closing the editor early. State is lifted so the
 * committed value PERSISTS (the read cell re-reads the updated row).
 */
function ClickToEditDemo(): JSX.Element {
  const [rows, setRows] = React.useState(demoRows);
  return (
    <DataGrid<DemoRow>
      items={rows}
      columns={clickEditColumns}
      editable
      getKey={(r) => r.key}
      onValueChange={(rowKey, fieldName, value) =>
        setRows((prev) => prev.map((r) => (r.key === rowKey ? { ...r, [fieldName]: value } : r)))
      }
    />
  );
}
export const ClickToEdit: StoryObj = { render: () => <ClickToEditDemo /> };

/** Always-editable (editTrigger 'always'): every editable cell shows its editor. State is lifted so edits persist. */
function AlwaysEditableDemo(): JSX.Element {
  const [rows, setRows] = React.useState(demoRows);
  return (
    <DataGrid<DemoRow>
      items={rows}
      columns={demoColumns}
      editable
      editTrigger="always"
      getKey={(r) => r.key}
      onValueChange={(rowKey, fieldName, value) =>
        setRows((prev) => prev.map((r) => (r.key === rowKey ? { ...r, [fieldName]: value } : r)))
      }
    />
  );
}
export const AlwaysEditable: StoryObj = { render: () => <AlwaysEditableDemo /> };
