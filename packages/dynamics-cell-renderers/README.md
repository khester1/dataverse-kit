# @khester/dynamics-cell-renderers

React cell renderer components for Dynamics 365 grids — read-only and editable renderers for common Dataverse field types (text, link, currency, date, number, optionset, toggle, icon, progress, rating, lookup, composite).

## What it does

Provides a set of small, focused Fluent UI v8 components that render a single grid cell for a given field type. Each read-only renderer (e.g. `CurrencyCell`, `DateCell`, `OptionSetCell`, `LookupCell`) takes a shared `CellRendererProps<T>` shape — `item`, `column`, `value`, `itemKey` — and formats the value via `@khester/dynamics-utils`, honoring per-column options on `IReusableColumn<T>` (currency code, locale, color maps, progress max, rating style, etc.). Editable variants (`EditableTextCell`, `EditableNumberCell`, `EditableDateCell`, `EditableOptionSetCell`, `EditableLookupCell`, `EditableRatingCell`) add in-cell editing with dirty/error indicators and validation callbacks. The package also exports the column/cell type definitions and the CSS-in-JS style classes the renderers use.

## When to use it

Reach for this package when you need the **leaf-level cell rendering** for a Dynamics grid, or when you are **authoring a new cell renderer** — new renderers go here. In practice you rarely import these directly: `@dataverse-kit/grid-kit` wraps these renderers behind its registry-driven `DataGrid`/detail-list hosts, so use grid-kit when you want a whole grid. Use `@dataverse-kit/surface-kit` for form shells/containers and `@khester/reusable-components` for custom-page controls. Import this package directly when you're building a custom grid host or extending the renderer set.

## Install

```bash
npm install @khester/dynamics-cell-renderers
```

Peer dependencies (not bundled): `react` / `react-dom` (>=17) and `@fluentui/react` (^8). Formatting/color utilities come from `@khester/dynamics-utils`.

## Minimal example

```tsx
import { CurrencyCell, EditableTextCell } from '@khester/dynamics-cell-renderers';
import type { IReusableColumn } from '@khester/dynamics-cell-renderers';

type Row = { key: string; name: string; revenue: number };
const row: Row = { key: 'a1', name: 'Contoso', revenue: 1500000 };

const revenueColumn: IReusableColumn<Row> = {
  key: 'revenue',
  name: 'Revenue',
  fieldName: 'revenue',
  minWidth: 120,
  fieldType: 'currency',
  currencyCode: 'USD',
  locale: 'en-US',
};

// Read-only currency cell
<CurrencyCell item={row} column={revenueColumn} value={row.revenue} itemKey={row.key} />;

// Editable text cell with dirty/validation tracking
<EditableTextCell
  item={row}
  column={{ key: 'name', name: 'Name', fieldName: 'name', minWidth: 160, fieldType: 'text' }}
  value={row.name}
  itemKey={row.key}
  isEditMode
  isDirty={false}
  onValueChange={(rowKey, field, next, original) => console.log(rowKey, field, next, original)}
/>;
```

## Key exports

| Export | Purpose |
|--------|---------|
| `TextCell` / `LinkCell` / `NumberCell` | Read-only text, hyperlink, and numeric cell renderers |
| `CurrencyCell` / `DateCell` | Locale-aware currency and date renderers |
| `OptionSetCell` / `ToggleCell` / `ColoredCell` | OptionSet badge, two-option toggle, and color-mapped cells |
| `IconCell` / `ProgressBarCell` / `RatingCell` | Icon button, progress bar, and star/emoji rating renderers |
| `LookupCell` / `CompositeCell` | Lookup display (with navigation) and multi-slot composite renderer |
| `EditableTextCell` / `EditableNumberCell` / `EditableDateCell` | Inline-editable text, number, and date cells with dirty/error state |
| `EditableOptionSetCell` / `EditableLookupCell` / `EditableRatingCell` | Inline-editable optionset dropdown, lookup search, and rating cells |
| `CellRendererProps` / `IReusableColumn` / `ListFieldType` | Core types: shared cell props, extended column config, and field-type union |
| `cellClass`, `currencyCellClass`, `getDetailsListStyles`, … | CSS-in-JS style classes shared by the renderers and host grids |
