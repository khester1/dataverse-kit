// @dataverse-kit/grid-kit/v9 — the Fluent UI v9 skin of the grid.
//
// The v9 counterpart of the default (v8) `.` entry: a flat READ DataGrid over
// @fluentui/react-components, with the 13 read cell types re-skinned to v9. It SHARES
// the framework-agnostic layers with the v8 skin — the renderer-agnostic contract
// (../types), the pure formatters / color / thresholds / aggregate / responsive
// shedding (../core), the Fluent-free `buildCellProps` render context (../adapters/context),
// and the `toReusableColumn` config mapping (../registry/columnMapping) are imported,
// never forked. Only the cell JSX, the columns adapter, the host, the v9 prop contract
// (./types), and the v9 theme (./theme) are v9-specific.
//
// Usage:
//   import { FluentProvider } from '@fluentui/react-components';
//   import { DataGrid, createDynamicsV9Theme } from '@dataverse-kit/grid-kit/v9';
//   <FluentProvider theme={createDynamicsV9Theme()}><DataGrid items={…} columns={…} /></FluentProvider>

// Shared, framework-agnostic layers (re-exported so a v9-only consumer gets the
// contract types + the pure core helpers without importing the v8 barrel).
export type {
  CellRendererType,
  CellEditorType,
  GridSelectionMode,
  ColumnDef,
  GridCellProps,
  GridCellRenderer,
  CellRegistration,
  GridRegistry,
  GridSortState,
  GridPaginationState,
  CardConfig,
  FocusedViewConfig,
  FocusedViewField,
  FocusedViewRow,
  NestedConfig,
  NestedDisplayMode,
  NestedSidePanelSize,
  GroupConfig,
} from '../types';
export {
  toNumber,
  toBool,
  toDate,
  toDisplayString,
  resolveThreshold,
  resolveCellColor,
  getContrastColor,
  normalizeHexColor,
  computeFormattedValue,
  computeAggregate,
  computeAggregates,
  computeAggregateRows,
  aggregateList,
  hasAggregate,
  fillColumnWidths,
  shedColumns,
  GRID_BREAKPOINTS,
  DEFAULT_RESPONSIVE_PRIORITY,
  initialColumnChoice,
  reconcileColumnChoice,
  applyColumnOrder,
  orderVisibleColumns,
  isHostColumnKey,
  applyFilters,
  evalCondition,
  evalConditionForField,
  applyColumnFilters,
  activeFilterCount,
  pruneFilterModel,
  isConditionComplete,
  operatorRequiresValue,
  operatorIsMultiValue,
  columnDisplayText,
  fieldTypeForRenderer,
  getOperatorsForFieldType,
  filterFieldOptions,
  toFilterField,
  filterableFields,
} from '../core';
export type {
  AggregateFunction,
  AggregateResult,
  AggregateSpec,
  AggregateValues,
  AggregateRowResult,
  ThresholdLevel,
  Thresholds,
  GridToolbarLayout,
  GridCommandPosition,
  SelectionGatingMode,
  ColumnChoice,
  FilterOperator,
  FilterMatch,
  FilterCondition,
  GridFilterModel,
  FilterFieldType,
  FilterField,
  FilterFieldOption,
} from '../core';

// v9-specific: prop contract, theme, cell registry + renderers, columns adapter, hosts.
export * from './types';
export {
  createDynamicsV9Theme,
  createDynamicsV9DarkTheme,
  dynamicsV9Theme,
  dynamicsBrandRamp,
} from './theme';
export { createV9CellRegistry } from './cells/registry';
export { EmptyCellTextContext, useEmptyCellText } from './cells/util';
export {
  TextCell,
  NumberCell,
  CurrencyCell,
  LinkCell,
  LookupCell,
  OptionSetCell,
  ColoredCell,
  ToggleCell,
  IconCell,
  ProgressBarCell,
  RatingCell,
  CompositeCell,
} from './cells/cells';
export {
  EditableTextCell,
  EditableNumberCell,
  EditableDateCell,
  EditableOptionSetCell,
  EditableRatingCell,
} from './cells/editable';
// Editable lookup: `rendererConfig.searchLookup(term)` feeds a Combobox (see the cell's docs).
export { EditableLookupCell, LOOKUP_SEARCH_DEBOUNCE_MS } from './cells/editableLookup';
export type { LookupOption, LookupValue } from './cells/editableLookup';
export { EditCellWrapper } from './EditCellWrapper';
export { toDataGridColumns } from './adapter';
export { DataGrid } from './hosts/DataGrid';
// Opt-in: pass as `columnChooser={GridColumnChooserV9}` (the grid does not import it — bundle cost).
export { GridColumnChooserV9 } from './hosts/GridColumnChooserV9';
export type { GridColumnChooserV9Props } from './hosts/GridColumnChooserV9';
// Opt-in: pass as `filterBuilder={GridFilterBuilderV9}` (the grid does not import it — bundle cost).
export { GridFilterBuilderV9 } from './hosts/GridFilterBuilderV9';
export type { GridFilterBuilderV9Props } from './hosts/GridFilterBuilderV9';
export { ROW_COMMANDS_COLUMN_ID } from './hosts/rowCommands';
export { ReadOnlyGrid } from './hosts/ReadOnlyGrid';
export { CardGrid } from './hosts/CardGrid';
export { FocusedViewGrid } from './hosts/FocusedViewGrid';
export { GroupedGrid } from './hosts/GroupedGrid';
export { NestedGrid } from './hosts/nested/NestedGrid';
export { GridToolbar } from './hosts/GridToolbar';
export { GridPaginationFooter, GridAggregateFooter } from './hosts/footers';
export { cardGridStyle, resolveCardLayout, CARD_GRID_GAP } from './hosts/cardLayout';
export { bucketGroups, BLANK_GROUP_KEY } from './hosts/buildGroups';
export type { V9Group } from './hosts/buildGroups';
