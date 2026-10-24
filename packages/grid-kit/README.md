# @dataverse-kit/grid-kit

Registry-driven grid and detail-list hosts for Dynamics 365, built on Fluent UI v8 — with a Fluent UI v9 read grid on the [`./v9`](#fluent-ui-v9-v9-subpath) subpath.

## What it does

`@dataverse-kit/grid-kit` provides a single cell-renderer registry (`createCellRegistry`) that maps a column's `rendererType` to a memoized cell component from `@khester/dynamics-cell-renderers`, plus a family of React hosts that render with it: `<DataGrid>` (flat and editable), `<ReadOnlyGrid>`, `<CardGrid>`, `<GroupedGrid>`, `<NestedGrid>`, and `<FocusedViewGrid>`. The same registry serves both a Fluent v8 `DetailsList` and a Microsoft Grid Customizer via host adapters (`toDetailsListColumns`, `toGridCustomizerOverrides`), so a column definition renders identically across hosts. It also ships toolbar/column-chooser/filter-builder UI, CSV/JSON export (`exportGrid`, `GridExportDialog`), client-side filtering and aggregates, file-drop primitives, and an `Xrm.Navigation` wrapper.

## When to use it

Reach for grid-kit when you need a **grid, detail list, or editable subgrid** in a custom page, PCF control, or Grid Customizer — anything that displays tabular Dataverse data with typed cell rendering, inline editing, grouping, or master-detail layouts. For form shells, page containers, and layout chrome use **surface-kit**; for general custom-page UI controls use **reusable-components**. If you only need the individual cell renderers without a grid host, depend on **@khester/dynamics-cell-renderers** directly — grid-kit wraps that package and adds the registry, adapters, and hosts on top.

## Install

```bash
npm install @dataverse-kit/grid-kit
```

Peer dependencies: `react`, `react-dom` (^18.2) and `@fluentui/react` (^8.115.6, Fluent UI v8).

## Minimal example

```tsx
import { DataGrid, createCellRegistry, type ColumnDef } from '@dataverse-kit/grid-kit';

const registry = createCellRegistry();

const columns: ColumnDef[] = [
  { key: 'name', fieldName: 'name', name: 'Account', rendererType: 'text' },
  {
    key: 'progress',
    fieldName: 'completion',
    name: 'Progress',
    rendererType: 'progress',
    rendererConfig: { max: 100, showLabel: true },
    aggregate: 'avg',
  },
  { key: 'revenue', fieldName: 'revenue', name: 'Revenue', rendererType: 'currency' },
];

const items = [
  { key: '1', name: 'Contoso', completion: 80, revenue: 1_200_000 },
  { key: '2', name: 'Fabrikam', completion: 45, revenue: 540_000 },
];

export function AccountGrid() {
  return (
    <DataGrid
      items={items}
      columns={columns}
      registry={registry}
      selectionMode="multiple"
      onSelectionChanged={(rows) => console.log(rows)}
    />
  );
}
```

## Key exports

| Export | Purpose |
|--------|---------|
| `createCellRegistry` | Builds the `rendererType` → cell-component registry; override or add types with `registry.register(...)`. |
| `DataGrid` | The flat / editable Fluent v8 `DetailsList` host (selection, click-to-edit, toolbar, pagination footer). |
| `ReadOnlyGrid`, `CardGrid`, `GroupedGrid`, `NestedGrid`, `FocusedViewGrid` | Hosts for the Grid Customizer grid types (read-only, card layout, collapsible groups, expandable rows, master-detail). |
| `ColumnDef` (type) | The column contract — `fieldName`, `rendererType`, `rendererConfig`, `editorType`, aggregates, callbacks. |
| `GridProps` / `GridRegistry` (types) | Host props contract and the registry interface. |
| `toDetailsListColumns`, `toGridCustomizerOverrides` | Adapters that drive a Fluent `DetailsList` or a Grid Customizer from the same registry. |
| `resolveGridFromDefinition` | Maps a duck-typed Grid Customizer definition (gridType + config) to the right host + props. |
| `exportGrid`, `GridExportDialog` | Turnkey CSV / JSON export and an opt-in format + column-picker dialog. |
| `GridToolbar`, `GridColumnChooser`, `GridFilterBuilder` | Toolbar command bar, show/hide-reorder column panel, and client-side filter builder. |
| `applyColumnFilters`, `applyFilters`, `computeAggregates`, `computeFormattedValue` | Framework-agnostic core helpers for filtering (column-aware: text operators match what a cell shows; or raw values only), footer aggregates, and value formatting. |
| `useGridContext`, `useEditState`, `useFileDrop` | Hooks: the custom-host extension seam, edit-state management, and HTML5 file-drop. |

## Fluent UI v9 (`./v9` subpath)

The default entry above is **Fluent UI v8**. A **Fluent UI v9** skin ships under the `./v9`
subpath — a flat **read + inline-editable** `<DataGrid>` (over `@fluentui/react-components`) with
the 13 read cell types re-skinned + 5 editable cells (text / number / currency / date / datetime /
optionset / rating, per-cell click-to-edit or `editTrigger="always"`), plus selection, controlled
sort, loading, pagination, an aggregate footer, responsive column shedding, and a lean toolbar. It
shares the SAME framework-agnostic core (the `ColumnDef` contract, formatters/color/aggregate/
responsive helpers, the render context, and the `useEditState` buffer) with the v8 skin — only the
cell JSX and the host are v9.

```tsx
import { FluentProvider } from '@fluentui/react-components';
import { DataGrid, createDynamicsV9Theme, type ColumnDef } from '@dataverse-kit/grid-kit/v9';

const columns: ColumnDef[] = [
  { key: 'name', fieldName: 'name', name: 'Account', rendererType: 'text', isSortable: true },
  { key: 'revenue', fieldName: 'revenue', name: 'Revenue', rendererType: 'currency', aggregate: 'sum' },
];

export function V9AccountGrid() {
  return (
    <FluentProvider theme={createDynamicsV9Theme()}>
      <DataGrid items={items} columns={columns} selectionMode="multiple" />
    </FluentProvider>
  );
}
```

Beyond the flat `<DataGrid>`, the `./v9` skin ships the full grid-host set — `<CardGrid>` (a v9
`Card` layout with responsive `minCardWidth` reflow), `<FocusedViewGrid>` (a master-detail rail +
detail pane), `<GroupedGrid>` (a v9 `Accordion` of per-group `<DataGrid>`s with cross-group
selection + opt-in per-group subtotals — or, with `look="ce"`, ONE Dynamics-styled grid whose group
rows sit between its data rows, measured against the stock grid's runtime "Group by"), and `<NestedGrid>` (inline chevron-expand via a manual v9
`Table` — or, with `look="ce"`, the measured stock grid with Child items: one grid, the expander in
the select cell, the child as an inset ce grid — plus `side-panel` = `OverlayDrawer` and
`hover-callout` = `Popover` modes) — all rendering
cells through the same shared v9 registry.

**Grouped subtotals from the server (default look).** When a group's records span pages, its rows on
screen are not the group, so a subtotal computed from them is wrong. Supply the values instead —
`groupAggregateResults` (`{ [groupKey]: { [field]: { sum, count, … } } }`, keyed by the group value's
string or `BLANK_GROUP_KEY` for the empty group) and, optionally, `groupAggregateFormatted` (the same
shape with display strings). Both are AUTHORITATIVE: a group or pair you leave out renders blank (the
column's `aggregateFormat` formats only a SUPPLIED value), and once `groupAggregateFormatted` is set a
group footer never uses `aggregateFormat` at all. Groups appear in the order of their first row, so
order the rows by the group field first, then by the user's `sort` (on a paged server query this
also keeps a group's rows together). The grand total (`aggregateResults`) is a
headerless grid with the group grids' columns, stuck to the bottom of the scroller, so its cells line
up with theirs. `sort` / `onSortChange`, `rowCommands`, `onActiveItemChanged` and `onRowNavigate`
reach every group grid; selection and expansion survive a reload, and the grand total stays visible
while `isLoading`. Group grids are not resizable. (`look="ce"` has no per-group footers: it warns
and ignores the two props.)

```tsx
<GroupedGrid items={pageRows} columns={columns} group={{ groupBy: 'stage', showCount: false }}
  groupAggregateResults={{ Prospect: { revenue: { sum: 23077660.08 } }, [BLANK_GROUP_KEY]: { revenue: { sum: 15679646.79 } } }}
  aggregateResults={{ revenue: { sum: 2088711571.84 } }} selectionMode="multiple" height={500} />
```

The v9 `<DataGrid>` also takes the toolbar features of the v8 grid: `exportConfig` (CSV / JSON),
and two **opt-in-by-import** drawers — `columnChooser={GridColumnChooserV9}` (show / hide / reorder)
and `filterBuilder={GridFilterBuilderV9}` (field · operator · value conditions, All / Any). The grid
never imports a drawer itself, so a grid that does not use one does not carry it (PCF bundles are one
file). Persist and restore with `onColumnOrderChange` / `initialVisibleOrder` and `onFilterChange` /
`initialFilterModel`. Filtering is client-side over `items` and drives the rows, selection (trimmed to
the rows still shown on Apply), export, the aggregate footer and `Rows: N`; text operators match what
a cell shows as well as the raw value.

```tsx
import { DataGrid, GridColumnChooserV9, GridFilterBuilderV9 } from '@dataverse-kit/grid-kit/v9';

<DataGrid items={items} columns={columns} selectionMode="multiple"
  columnChooser={GridColumnChooserV9} filterBuilder={GridFilterBuilderV9}
  onFilterChange={saveFilter} initialFilterModel={savedFilter} />
```

The v9 Fluent packages (`@fluentui/react-components` ^9.46.2, `@fluentui/react-icons` ^2.0.239)
are **optional peers** — install them only if you use `./v9`; v8-only consumers are unaffected.
**Editable lookup on v9 is opt-in** — its Combobox costs ~3 KB gzip, so the default registry does not
carry it. Register it and give the column a fetch-free `searchLookup`:

```tsx
import { DataGrid, LookupCell, EditableLookupCell, createV9CellRegistry } from '@dataverse-kit/grid-kit/v9';

const registry = useMemo(() => createV9CellRegistry({ lookup: { read: LookupCell, edit: EditableLookupCell } }), []);
<DataGrid editable registry={registry} columns={[{ key: 'parent', fieldName: '_parentaccountid_value', name: 'Parent',
  rendererType: 'lookup', editorType: 'lookup',
  rendererConfig: { searchLookup: (term) => searchAccounts(term), entitySetName: 'accounts' } }]} />
```

It commits `{ id, name, entitySetName }` (or `null` for "(None)") through `onValueChange`; with a `_x_value`
field name, map it to the navigation property before building an `@odata.bind`. Nested child grids take
the same registry as `nested.childRegistry`. The nested `parentLayout:'cards'` variant is still v8-only.

> See [`CLAUDE.md`](./CLAUDE.md) for the full architecture / contributor reference.
