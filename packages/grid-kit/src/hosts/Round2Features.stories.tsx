import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DataGrid } from './DataGrid';
import { GroupedGrid } from './GroupedGrid';
import { NestedGrid } from './nested/NestedGrid';
import { demoColumns, demoRows } from '../_storybook/sample';
import type { DemoRow } from '../_storybook/sample';
import type { ColumnDef } from '../types';
import type { NavTarget } from '../navigation/navigateTo';

// Icons are initialized once in .storybook/preview.tsx (with disableWarnings).

const meta: Meta = {
  title: 'Grid Kit/Round 2 Features',
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

const getKey = (r: DemoRow): string => r.key;

// ─── Emoji + editable rating ─────────────────────────────────────────────────

const ratingCols = (style: 'stars' | 'emoji'): ColumnDef<DemoRow>[] => [
  { key: 'name', fieldName: 'name', name: 'Account', rendererType: 'text', minWidth: 160 },
  {
    key: 'score',
    fieldName: 'score',
    name: style === 'emoji' ? 'Sentiment' : 'Rating',
    rendererType: 'rating',
    editorType: 'number',
    minWidth: 160,
    rendererConfig: style === 'emoji' ? { style: 'emoji', faceCount: 5 } : { max: 5 },
  },
];

const RatingDemo: React.FC<{ style: 'stars' | 'emoji' }> = ({ style }) => {
  const [rows, setRows] = useState(demoRows);
  return (
    <DataGrid<DemoRow>
      items={rows}
      columns={ratingCols(style)}
      editable
      getKey={getKey}
      onValueChange={(rowKey, fieldName, value) =>
        setRows((prev) => prev.map((r) => (r.key === rowKey ? { ...r, [fieldName]: value } : r)))
      }
    />
  );
};

/** Click-to-set star rating (editorType:'number'). */
export const EditableStarRating: Story = { render: () => <RatingDemo style="stars" /> };
/** Sentiment emoji faces (ratingStyle:'emoji'); click a face to set. Requires initializeIcons(). */
export const EmojiRating: Story = { render: () => <RatingDemo style="emoji" /> };

// ─── Editable lookup wired to a fetch-free searchLookup callback ─────────────

const OWNERS = ['Alex Park', 'Jordan Lee', 'Sam Rivera', 'Casey Kim', 'Morgan Doe', 'Pat Smith'];
const searchLookup = async (term: string): Promise<Array<{ id: string; name: string }>> => {
  await new Promise((r) => setTimeout(r, 150)); // simulate a Dataverse round-trip
  return OWNERS.filter((o) => o.toLowerCase().includes(term.toLowerCase())).map((o, i) => ({
    id: String(i),
    name: o,
  }));
};

const lookupCols: ColumnDef<DemoRow>[] = [
  { key: 'name', fieldName: 'name', name: 'Account', rendererType: 'text', minWidth: 160 },
  {
    key: 'owner',
    fieldName: 'owner',
    name: 'Owner (lookup)',
    rendererType: 'lookup',
    editorType: 'lookup',
    minWidth: 220,
    rendererConfig: { displayField: 'owner', searchLookup },
  },
];

const LookupDemo: React.FC = () => {
  const [rows, setRows] = useState(demoRows);
  return (
    <DataGrid<DemoRow>
      items={rows}
      columns={lookupCols}
      editable
      getKey={getKey}
      onValueChange={(rowKey, fieldName, value) =>
        setRows((prev) =>
          prev.map((r) =>
            r.key === rowKey
              ? { ...r, [fieldName]: (value as { name?: string } | null)?.name ?? '' }
              : r
          )
        )
      }
    />
  );
};

/** Click a cell → type → pick from the consumer-supplied searchLookup results (no apiService). */
export const EditableLookup: Story = { render: () => <LookupDemo /> };

// ─── Editable optionset (the "confirm dropdown" item) ────────────────────────
// Covers the STANDARD Dataverse optionset: single-select numeric value/label,
// colored badge in read mode, Dropdown + (None) in edit mode.
//
// NOTE — one client grid uses a more flexible bespoke
// dropdown (multi-select, string keys, per-option icons). Those variants are NOT
// covered by EditableOptionSetCell and remain a future enhancement; this story
// demonstrates the standard single-select optionset that grid-kit does support.

interface StatusRow extends Record<string, unknown> {
  key: string;
  name: string;
  statuscode: number;
}
const statusRows: StatusRow[] = [
  { key: '1', name: 'Contoso Ltd', statuscode: 1 },
  { key: '2', name: 'Fabrikam Inc', statuscode: 2 },
  { key: '3', name: 'Adventure Works', statuscode: 3 },
];
const optionsetCols: ColumnDef<StatusRow>[] = [
  { key: 'name', fieldName: 'name', name: 'Account', rendererType: 'text', minWidth: 160 },
  {
    key: 'statuscode',
    fieldName: 'statuscode',
    name: 'Status',
    rendererType: 'optionset',
    editorType: 'dropdown',
    minWidth: 180,
    rendererConfig: {
      options: [
        { value: 1, label: 'Active' },
        { value: 2, label: 'Pending' },
        { value: 3, label: 'Inactive' },
      ],
      colorMap: { 1: '#107c10', 2: '#f7e600', 3: '#d13438' },
      // Explicit code→label (the realistic Dataverse pattern: the label comes from
      // metadata/formattedValue, not the stored numeric code). The wrapper also
      // derives this from `options`, so this is belt-and-suspenders for the demo.
      formatValue: (v: unknown) =>
        ({ 1: 'Active', 2: 'Pending', 3: 'Inactive' } as Record<number, string>)[v as number] ?? '-',
    },
  },
];

const OptionSetDemo: React.FC = () => {
  const [rows, setRows] = useState(statusRows);
  return (
    <DataGrid<StatusRow>
      items={rows}
      columns={optionsetCols}
      editable
      getKey={(r) => r.key}
      onValueChange={(rowKey, fieldName, value) =>
        setRows((prev) =>
          prev.map((r) => (r.key === rowKey ? { ...r, [fieldName]: value as number | null } : r))
        )
      }
    />
  );
};

/** Standard single-select optionset: colored badge (read) + Dropdown with (None) (edit). */
export const EditableOptionSet: Story = { render: () => <OptionSetDemo /> };

// ─── Multi-select / string-key / per-option-icon optionset (closes the 1c gap) ──

interface TagRow extends Record<string, unknown> {
  key: string;
  name: string;
  tags: string[];
}
const tagRows: TagRow[] = [
  { key: '1', name: 'Contoso Ltd', tags: ['vip', 'renewal'] },
  { key: '2', name: 'Fabrikam Inc', tags: ['prospect'] },
];
const tagCols: ColumnDef<TagRow>[] = [
  { key: 'name', fieldName: 'name', name: 'Account', rendererType: 'text', minWidth: 160 },
  {
    key: 'tags',
    fieldName: 'tags',
    name: 'Tags',
    rendererType: 'optionset',
    editorType: 'dropdown',
    minWidth: 260,
    rendererConfig: {
      multiSelect: true,
      // String keys + per-option icons + colors (the Order-Workflow dropdown shape).
      options: [
        { value: 'vip', label: 'VIP', iconName: 'FavoriteStar', color: '#ffb900' },
        { value: 'renewal', label: 'Renewal', iconName: 'Sync', color: '#0078d4' },
        { value: 'prospect', label: 'Prospect', iconName: 'Contact', color: '#498205' },
        { value: 'churn', label: 'Churn risk', iconName: 'Warning', color: '#d13438' },
      ],
    },
  },
];

const MultiSelectDemo: React.FC = () => {
  const [rows, setRows] = useState(tagRows);
  return (
    <DataGrid<TagRow>
      items={rows}
      columns={tagCols}
      editable
      getKey={(r) => r.key}
      onValueChange={(rowKey, fieldName, value) =>
        setRows((prev) =>
          prev.map((r) => (r.key === rowKey ? { ...r, [fieldName]: value as string[] } : r))
        )
      }
    />
  );
};

/** Multi-select optionset with string keys + per-option icons: read shows a badge
 * per tag; edit is a multi-select Dropdown. Requires initializeIcons(). */
export const MultiSelectOptionSet: Story = { render: () => <MultiSelectDemo /> };

// ─── Export toolbar split-button (CSV / JSON) ────────────────────────────────

/** Toolbar Export split-button over current items (or the selection when rows are selected). */
export const ExportSplitButton: Story = {
  render: () => (
    <DataGrid<DemoRow>
      items={demoRows}
      columns={demoColumns}
      getKey={getKey}
      selectionMode="multiple"
      exportConfig={{ enabled: true, filename: 'accounts' }}
    />
  ),
};

/** Export… opens a dialog with a format choice, a column picker, and a filename field. */
export const ExportDialog: Story = {
  render: () => (
    <DataGrid<DemoRow>
      items={demoRows}
      columns={demoColumns}
      getKey={getKey}
      selectionMode="multiple"
      exportConfig={{ enabled: true, dialog: true, filename: 'accounts' }}
    />
  ),
};

/** A "Columns" toolbar command opens a panel to show/hide and reorder columns. */
export const ColumnChooser: Story = {
  render: () => (
    <DataGrid<DemoRow> items={demoRows} columns={demoColumns} getKey={getKey} columnChooser />
  ),
};

// ─── Aggregate footer ────────────────────────────────────────────────────────

const aggregateCols: ColumnDef<DemoRow>[] = [
  { key: 'name', fieldName: 'name', name: 'Account', rendererType: 'text', minWidth: 160, aggregate: 'count' },
  {
    key: 'revenue',
    fieldName: 'revenue',
    name: 'Revenue',
    rendererType: 'currency',
    minWidth: 130,
    rendererConfig: { currencyCode: 'USD' },
    aggregate: 'sum',
  },
  { key: 'progress', fieldName: 'progress', name: 'Progress', rendererType: 'number', minWidth: 120, aggregate: 'avg' },
  { key: 'score', fieldName: 'score', name: 'Rating', rendererType: 'number', minWidth: 100, aggregate: 'max' },
];

/** Per-column footer aggregates (count / sum / avg / max). Currency sum formats as currency. */
export const AggregateFooter: Story = {
  render: () => <DataGrid<DemoRow> items={demoRows} columns={aggregateCols} getKey={getKey} />,
};

// ─── Cross-page grand totals (aggregateItems) ────────────────────────────────

/**
 * The grid shows a single "page" (2 rows) but the footer aggregates the FULL
 * dataset via `aggregateItems` — a cross-page grand total. Without it the footer
 * would only total the visible page.
 */
export const GrandTotalAcrossPages: Story = {
  render: () => (
    <DataGrid<DemoRow>
      items={demoRows.slice(0, 2)}
      aggregateItems={demoRows}
      columns={aggregateCols}
      getKey={getKey}
      pagination={{ currentPage: 1, pageSize: 2, totalItems: demoRows.length }}
    />
  ),
};

// ─── Per-group subtotals (GroupedGrid showGroupAggregates) ───────────────────

const subtotalCols: ColumnDef<DemoRow>[] = [
  { key: 'name', fieldName: 'name', name: 'Account', rendererType: 'text', minWidth: 160 },
  { key: 'status', fieldName: 'status', name: 'Status', rendererType: 'text', minWidth: 110 },
  {
    key: 'revenue',
    fieldName: 'revenue',
    name: 'Revenue',
    rendererType: 'currency',
    minWidth: 130,
    aggregate: 'sum',
    rendererConfig: { currencyCode: 'USD' },
  },
  { key: 'progress', fieldName: 'progress', name: 'Progress', rendererType: 'number', minWidth: 120, aggregate: 'avg' },
];

/**
 * Grouped grid with a per-group subtotal row under each group (`showGroupAggregates`)
 * plus the overall grand-total footer below the grid. Revenue sums and Progress
 * averages are computed per status group.
 */
export const GroupSubtotals: Story = {
  render: () => (
    <GroupedGrid<DemoRow>
      items={demoRows}
      columns={subtotalCols}
      getKey={getKey}
      group={{ groupBy: 'status', showGroupAggregates: true }}
    />
  ),
};

// ─── Alternate row colors + whole-row file drop (composed onRenderRow) ────────

/** Zebra striping and row file-drop share one onRenderRow — this proves they compose. */
export const AlternateRowsWithFileDrop: Story = {
  render: () => (
    <DataGrid<DemoRow>
      items={demoRows}
      columns={demoColumns}
      getKey={getKey}
      alternateRowColors={{ even: '#ffffff', odd: '#f3f9fd' }}
      rowFileDrop={{
        accept: ['.pdf', '.png'],
        // eslint-disable-next-line no-console
        onDrop: (item, files) => console.log('dropped on', item.name, files.map((f) => f.name)),
      }}
    />
  ),
};

// ─── Nested grid: editable + multi-select child ──────────────────────────────

interface LineItem extends Record<string, unknown> {
  key: string;
  product: string;
  qty: number;
}
const childColumns: ColumnDef<LineItem>[] = [
  { key: 'product', fieldName: 'product', name: 'Product', rendererType: 'text', editorType: 'text', minWidth: 160 },
  { key: 'qty', fieldName: 'qty', name: 'Qty', rendererType: 'number', editorType: 'number', minWidth: 90 },
];
const childrenByParent: Record<string, LineItem[]> = {
  '1': [{ key: '1a', product: 'Widget', qty: 4 }, { key: '1b', product: 'Gadget', qty: 2 }],
  '2': [{ key: '2a', product: 'Sprocket', qty: 7 }],
};

/**
 * Inline nested grid with a multi-select, editable child grid. Child selection AND
 * edits PERSIST across collapse/re-expand: the child grid stays mounted (hidden) on
 * collapse, and child edits are lifted into state (refreshed via `reloadToken`).
 */
function NestedSelectableEditableDemo(): JSX.Element {
  const [childData, setChildData] = React.useState<Record<string, LineItem[]>>(childrenByParent);
  const [reloadToken, setReloadToken] = React.useState(0);
  return (
    <NestedGrid<DemoRow, LineItem>
      items={demoRows}
      columns={demoColumns.slice(0, 3)}
      getKey={getKey}
      nested={{
        mode: 'inline',
        childColumns,
        getChildren: (parent) => childData[parent.key] ?? [],
        reloadToken,
        childSelectionMode: 'multiple',
        childEditable: true,
        // eslint-disable-next-line no-console
        onChildSelectionChanged: (parent, sel) => console.log('selected children of', parent.name, sel),
        onChildValueChange: (parent, rk, fn, v) => {
          // Lift the edit into state so it shows + persists; bump reloadToken so
          // useChildren re-reads the (mounted) child grid's data.
          setChildData((prev) => ({
            ...prev,
            [parent.key]: (prev[parent.key] ?? []).map((r) => (r.key === rk ? { ...r, [fn]: v } : r)),
          }));
          setReloadToken((t) => t + 1);
        },
      }}
    />
  );
}
export const NestedSelectableEditable: Story = { render: () => <NestedSelectableEditableDemo /> };

/**
 * requires-parent gating: the parent grid is selectable (multiple), and each
 * expanded child grid is only selectable while its PARENT row is checked. Expand
 * a row, then toggle the parent's checkbox to enable/disable child selection.
 */
export const NestedRequiresParent: Story = {
  render: () => (
    <NestedGrid<DemoRow, LineItem>
      items={demoRows}
      columns={demoColumns.slice(0, 3)}
      getKey={getKey}
      selectionMode="multiple"
      nested={{
        mode: 'inline',
        childColumns,
        getChildren: (parent) => childrenByParent[parent.key] ?? [],
        childSelectionMode: 'multiple',
        childSelectionGating: 'requires-parent',
        // eslint-disable-next-line no-console
        onChildSelectionChanged: (parent, sel) => console.log('selected children of', parent.name, sel),
      }}
    />
  ),
};

// ─── Navigation (Xrm.Navigation.navigateTo; localhost console no-op) ─────────

const navTo = (item: DemoRow): NavTarget => ({
  pageType: 'entityrecord',
  entityName: 'account',
  entityId: item.key,
});

/**
 * A link cell opens the record on click, and the toolbar "Open" command navigates
 * the active/selected row. On localhost (Storybook) navigateTo logs a no-op to the
 * browser console (open devtools to see it) — in a model-driven host it calls
 * Xrm.Navigation.navigateTo.
 */
export const Navigation: Story = {
  render: () => (
    <DataGrid<DemoRow>
      items={demoRows}
      columns={[
        { key: 'name', fieldName: 'name', name: 'Account', rendererType: 'link', minWidth: 180 },
        ...demoColumns.slice(1, 4),
      ]}
      getKey={getKey}
      selectionMode="single"
      navigateTo={navTo}
    />
  ),
};

// ─── Navigation options (open as a dialog; webresource data) ─────────────────

const navToDialog = (item: DemoRow): NavTarget => ({
  pageType: 'entityrecord',
  entityName: 'account',
  entityId: item.key,
  // Attach navigationOptions to the target itself — the cell-click and "Open"
  // paths pick it up with no separate options channel. Here: a centered modal.
  navigationOptions: { target: 2, position: 1, width: 600, height: 500, title: 'Account' },
});

/**
 * Same nav wiring as the Navigation story, but the resolved `NavTarget` carries
 * `navigationOptions` so the record opens in a centered dialog (`target: 2`)
 * instead of inline. A `webresource` target can likewise carry a `data` query
 * string — both flow straight through `Xrm.Navigation.navigateTo`. On localhost
 * the no-op log shows the target AND the options (open devtools).
 */
export const NavigationOptionsDialog: Story = {
  render: () => (
    <DataGrid<DemoRow>
      items={demoRows}
      columns={[
        { key: 'name', fieldName: 'name', name: 'Account', rendererType: 'link', minWidth: 180 },
        ...demoColumns.slice(1, 4),
      ]}
      getKey={getKey}
      selectionMode="single"
      navigateTo={navToDialog}
    />
  ),
};

// ─── Filter builder (Edit Filters) ───────────────────────────────────────────

const STATUS_OPTIONS = [
  { key: 'Active', text: 'Active' },
  { key: 'Pending', text: 'Pending' },
  { key: 'Inactive', text: 'Inactive' },
];

const filterColumns: ColumnDef<DemoRow>[] = [
  { key: 'name', fieldName: 'name', name: 'Account', rendererType: 'text', minWidth: 150 },
  { key: 'owner', fieldName: 'owner', name: 'Owner', rendererType: 'text', minWidth: 120 },
  {
    key: 'status',
    fieldName: 'status',
    name: 'Status',
    rendererType: 'optionset',
    minWidth: 110,
    rendererConfig: { options: STATUS_OPTIONS },
  },
  {
    key: 'revenue',
    fieldName: 'revenue',
    name: 'Revenue',
    rendererType: 'currency',
    minWidth: 120,
    aggregate: 'sum',
    rendererConfig: { currencyCode: 'USD' },
  },
  { key: 'created', fieldName: 'created', name: 'Created', rendererType: 'date', minWidth: 120 },
  { key: 'active', fieldName: 'active', name: 'Active', rendererType: 'toggle', minWidth: 90 },
  // isFilterable:false → excluded from the filter field picker.
  { key: 'progress', fieldName: 'progress', name: 'Progress', rendererType: 'progress', minWidth: 140, isFilterable: false, rendererConfig: { max: 100 } },
];

/**
 * The `filterBuilder` opt-in adds a "Filters" toolbar command opening the Edit
 * Filters panel (field → operator → value, combined with All/Any). The grid
 * filters its in-memory rows by the built model — the list, the aggregate footer
 * (Revenue sum), and export scope all reflect the filter. `Status` is an optionset
 * (dropdown value editor), `Revenue` numeric, `Created` a date picker, `Active`
 * boolean; `Progress` sets `isFilterable:false` so it is excluded from the field
 * picker. The command text shows the active condition count; `onFilterChange`
 * logs the emitted model (open devtools).
 */
export const FilterBuilder: Story = {
  render: () => (
    <DataGrid<DemoRow>
      items={demoRows}
      columns={filterColumns}
      getKey={getKey}
      selectionMode="multiple"
      filterBuilder
      exportConfig={{ enabled: true }}
      // eslint-disable-next-line no-console
      onFilterChange={(model) => console.log('[filter]', JSON.stringify(model))}
    />
  ),
};
