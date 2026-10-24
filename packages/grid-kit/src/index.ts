/**
 * @dataverse-kit/grid-kit
 *
 * Shared, registry-driven grid / detail-list components for Dynamics 365
 * (Fluent UI v8). Wraps @khester/dynamics-cell-renderers behind one cell-renderer
 * registry usable by both a DetailsList grid and a Grid Customizer.
 */

// Types — the canonical contract
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
  GridCommand,
  RowCommand,
  GridToolbarConfig,
  GridExportConfig,
  RowFileDropConfig,
  GridProps,
  ReadOnlyGridProps,
  CardConfig,
  CardGridProps,
  GroupConfig,
  GroupedGridProps,
  NestedDisplayMode,
  NestedSidePanelSize,
  NestedConfig,
  NestedGridProps,
  FocusedViewField,
  FocusedViewRow,
  FocusedViewConfig,
  FocusedViewGridProps,
} from './types';

// Framework-agnostic core (formatters / color / thresholds / coercion)
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
  computeGroupAggregates,
  computeAggregateRows,
  aggregateList,
  hasAggregate,
  fillColumnWidths,
  applyFilters,
  evalCondition,
  isConditionComplete,
  operatorRequiresValue,
  operatorIsMultiValue,
  evalConditionForField,
  applyColumnFilters,
  activeFilterCount,
  pruneFilterModel,
  columnDisplayText,
  gateCommands,
  partitionCommands,
  mergeToolbarCommands,
  initialColumnChoice,
  reconcileColumnChoice,
  applyColumnOrder,
  isHostColumnKey,
} from './core';
export type { ColumnChoice } from './core';
export type {
  ThresholdLevel,
  Thresholds,
  ColorResolution,
  FormatConfig,
  AggregateFunction,
  AggregateResult,
  AggregateSpec,
  AggregateValues,
  AggregateRowResult,
  FilterOperator,
  FilterMatch,
  FilterCondition,
  GridFilterModel,
  FilterField,
  FilterFieldOption,
  GridToolbarLayout,
  GridCommandPosition,
  SelectionGatingMode,
} from './core';

// Registry
export { createCellRegistry, makeReadWrapper, makeEditWrapper, toReusableColumn, rendererToFieldType } from './registry';

// Host adapters — same registry serves DetailsList AND Grid Customizer
export {
  toDetailsListColumns,
  toGridCustomizerOverrides,
  fromGridCustomizerDefinition,
  fromGridCustomizerColumn,
  mapFormRuntimeRendererType,
  resolveGridFromDefinition,
  buildCellProps,
  getFieldValue,
  getSuppliedFormattedValue,
  defaultGetKey,
} from './adapters';
export type {
  GridRenderContext,
  GcGridColumn,
  GcCellRendererProps,
  GcCellRenderer,
  GcCellRendererOverrides,
  GridCustomizerOverridesOptions,
  GridColumnDefinitionLike,
  GridCustomizerDefinitionLike,
  GridTypeLike,
  GridDefinitionLike,
  ResolvedGrid,
  ResolveGridOptions,
} from './adapters';

// Export (CSV / JSON over @khester/dynamics-utils)
export { exportGrid, toExportColumns, GridExportDialog, resolveExportColumns } from './export';
export type { GridExportDialogProps } from './export';

// Navigation (Xrm.Navigation.navigateTo wrapper; localhost no-op)
export { navigateToTarget } from './navigation';
export type { NavTarget, NavigationOptions } from './navigation';

// Drag & drop (HTML5 file drop)
export { useFileDrop, isFileAccepted, DroppableCell, FileDropCell } from './dnd';
export type { FileDropOptions, FileDropProps, DroppableCellProps, FileDropCellConfig } from './dnd';

// Hosts
export {
  DataGrid,
  DetailsGrid,
  ReadOnlyGrid,
  CardGrid,
  GroupedGrid,
  NestedGrid,
  FocusedViewGrid,
  GridToolbar,
  GridColumnChooser,
  orderVisibleColumns,
  GridFilterBuilder,
  getOperatorsForFieldType,
  fieldTypeForRenderer,
  buildGroups,
  useEditState,
  useChildren,
  // useGridContext is the extension seam for building a custom host (build your
  // own layout on the shared render context). GridPaginationFooter stays internal.
  useGridContext,
} from './hosts';
export type { EditState, GridColumnChooserProps, GridFilterBuilderProps, FilterFieldType } from './hosts';
