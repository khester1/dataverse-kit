/**
 * @khester/dynamics-cell-renderers
 *
 * Cell renderer components for Dynamics 365 grids.
 * Provides read-only and editable renderers for common field types:
 * text, link, currency, date, number, optionset, toggle, icon, progress, lookup.
 *
 * Peer dependencies: @fluentui/react, react, react-dom
 * Runtime dependency: @khester/dynamics-utils (formatting + color utilities)
 */

// Types
export type {
  ListFieldType,
  IReusableColumn,
  CellRendererProps,
  BatchUpdateResult,
  BatchUpdateRecord,
  ListSelectionMode,
  SortDirection,
  SortState,
  PaginationState,
  ChangedRecord,
  IApiService,
  CompositeSlotType,
  ConditionalStyle,
  CompositeSlot,
  CompositeRendererConfig,
} from './types';

// Styles
export {
  // Cell-level styles
  cellClass,
  linkCellClass,
  coloredBadgeClass,
  currencyCellClass,
  progressBarContainerClass,
  progressBarBackgroundClass,
  progressBarFillClass,
  progressBarLabelClass,
  iconButtonCellClass,
  ratingCellClass,
  ratingStarClass,
  compositeCellClass,
  editableCellClass,
  editableCellInputWrapperClass,
  dirtyCellIndicatorClass,
  errorCellIndicatorClass,
  cellErrorTextClass,
  // Lookup styles
  lookupCellContainerClass,
  lookupDropdownClass,
  lookupDropdownItemClass,
  lookupDropdownItemActiveClass,
  lookupDropdownNoneOptionClass,
  lookupLoadingClass,
  lookupNoResultsClass,
  lookupClearButtonClass,
  lookupReadModeLinkClass,
  // Grid-level styles
  getDetailsListStyles,
  getRowStyles,
  getRowStylesWithSelection,
} from './styles';

// Read-only renderers
export { TextCell } from './renderers/TextCell';
export { LinkCell } from './renderers/LinkCell';
export { CurrencyCell } from './renderers/CurrencyCell';
export { DateCell } from './renderers/DateCell';
export { NumberCell } from './renderers/NumberCell';
export { OptionSetCell } from './renderers/OptionSetCell';
export { ToggleCell } from './renderers/ToggleCell';
export { IconCell } from './renderers/IconCell';
export { ProgressBarCell } from './renderers/ProgressBarCell';
export { ColoredCell } from './renderers/ColoredCell';
export { LookupCell } from './renderers/LookupCell';
export type { LookupCellProps } from './renderers/LookupCell';
export { RatingCell } from './renderers/RatingCell';
export { CompositeCell } from './renderers/CompositeCell';

// Editable renderers
export { EditableTextCell } from './editable/EditableTextCell';
export type { EditableTextCellProps } from './editable/EditableTextCell';
export { EditableNumberCell } from './editable/EditableNumberCell';
export type { EditableNumberCellProps } from './editable/EditableNumberCell';
export { EditableDateCell } from './editable/EditableDateCell';
export type { EditableDateCellProps } from './editable/EditableDateCell';
export { EditableOptionSetCell } from './editable/EditableOptionSetCell';
export type { EditableOptionSetCellProps } from './editable/EditableOptionSetCell';
export { EditableLookupCell } from './editable/EditableLookupCell';
export type { EditableLookupCellProps, LookupOption, LookupValue } from './editable/EditableLookupCell';
export { EditableRatingCell } from './editable/EditableRatingCell';
export type { EditableRatingCellProps } from './editable/EditableRatingCell';
