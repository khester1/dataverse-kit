import { IColumn } from '@fluentui/react';

/**
 * Minimal API service interface for lookup cell search queries.
 * Consumers should pass their own IApiService implementation that satisfies this contract.
 */
export interface IApiService {
  retrieveMultipleRecords<T>(entitySetName: string, options?: string): Promise<{ value: T[] }>;
}

/**
 * Minimal ChangedRecord interface for edit mode tracking.
 * The full implementation lives in the consuming grid component (e.g., web-resources).
 */
export interface ChangedRecord {
  key: string;
  changes: Record<string, { oldValue: unknown; newValue: unknown }>;
}

/**
 * Supported field types for list columns.
 */
export type ListFieldType =
  | 'text'
  | 'link'
  | 'currency'
  | 'date'
  | 'datetime'
  | 'number'
  | 'lookup'
  | 'optionset'
  | 'toggle'
  | 'icon'
  | 'progressBar'
  | 'coloredCell'
  | 'rating'
  | 'composite';

/**
 * Slot types for the composite cell renderer.
 * Structurally aligned with form-runtime's CompositeSlotType so a grid
 * customizer definition maps onto these without an import.
 */
export type CompositeSlotType =
  | 'icon'
  | 'text'
  | 'badge'
  | 'link'
  | 'image'
  | 'spacer'
  | 'progress'
  | 'rating';

/** Conditional style rule for a composite slot — first match wins. */
export interface ConditionalStyle {
  /** Field on the row to evaluate (not limited to this column). */
  field: string;
  /** Comparison operator. */
  operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'between';
  /** Value to compare against. */
  value: string | number;
  /** End value for the 'between' operator. */
  valueTo?: string | number;
  /** CSS style applied when the condition matches. */
  style: Record<string, string>;
}

/** A composable slot within a composite cell. */
export interface CompositeSlot {
  /** Unique identifier. */
  id: string;
  /** Slot type — determines what is rendered. */
  type: CompositeSlotType;
  /** Bind to a row field (dynamic); omit for a static value. */
  fieldBinding?: string;
  /** Static value (icon name, text, URL…) when no field binding. */
  staticValue?: string;
  /** Base style when no conditional style matches. */
  defaultStyle?: Record<string, string>;
  /** Ordered conditional styles — first match wins, else `defaultStyle`. */
  conditionalStyles?: ConditionalStyle[];
}

/** Configuration object for the composite renderer (mirrors form-runtime). */
export interface CompositeRendererConfig {
  /** Layout direction for slots. */
  layout: 'horizontal' | 'vertical';
  /** Gap between slots in pixels. */
  gap: number;
  /** Ordered list of composable slots. */
  slots: CompositeSlot[];
}

/**
 * Extended column interface for the ReusableDetailsList.
 * Adds field type information and custom rendering options.
 */
export interface IReusableColumn<T> extends Omit<IColumn, 'onRender'> {
  /** The type of field for automatic rendering */
  fieldType: ListFieldType;

  /** Whether the column is editable */
  editable?: boolean;

  // Link field options
  /** Handler when link is clicked */
  onLinkClick?: (item: T) => void;
  /** Whether to open in new tab (for URLs) */
  openInNewTab?: boolean;

  // Colored cell / optionset options
  /** Map of value to background color */
  colorMap?: Record<string | number, string>;
  /** Function to get background color from value */
  getBackgroundColor?: (value: string | number) => string;

  // Toggle options
  /** Label when toggle is on */
  toggleOnText?: string;
  /** Label when toggle is off */
  toggleOffText?: string;
  /** Handler when toggle value changes */
  onToggleChange?: (key: string, fieldName: string, value: boolean) => void;

  // Icon options
  /** Icon name from Fluent UI icons */
  iconName?: string;
  /** Handler when icon is clicked */
  onIconClick?: (item: T) => void;
  /** Tooltip for the icon */
  iconTitle?: string;

  // Progress bar options
  /** Maximum value for progress (default: 100) */
  progressMax?: number;
  /** Color for the progress bar */
  progressColor?: string;
  /** Whether to show percentage label */
  showProgressLabel?: boolean;

  // Rating options
  /** Maximum rating (number of stars), default 5 */
  ratingMax?: number;
  /** Filled-star color (default gold '#ffb900') */
  ratingColor?: string;
  /** Round to half-stars from fractional values (default true) */
  ratingAllowHalf?: boolean;
  /** Rating display style: 'stars' (default) or 'emoji' (sentiment faces). */
  ratingStyle?: 'stars' | 'emoji';
  /** Number of emoji faces (2–5). Falls back to ratingMax clamped to 2..5. */
  ratingFaceCount?: number;
  /** Tint emoji faces with sentiment colors (red→green). Default true for emoji. */
  ratingUseSentimentColor?: boolean;

  // Composite options
  /** Ordered slots for the composite renderer */
  compositeSlots?: CompositeSlot[];
  /** Layout direction for composite slots (default 'horizontal') */
  compositeLayout?: 'horizontal' | 'vertical';
  /** Gap between composite slots in px (default 4) */
  compositeGap?: number;

  // Formatting options
  /** Custom format function for display value */
  formatValue?: (value: unknown, item: T) => string;
  /** Currency code for currency fields (default: 'USD') */
  currencyCode?: string;
  /** Locale for formatting (default: 'en-US') */
  locale?: string;

  // Record link options (for primary name field that links to the record itself)
  /** Whether this column links to the record itself (uses item.key as ID) */
  isRecordLink?: boolean;
  /** Entity logical name for record link navigation (e.g., 'account') */
  recordEntityLogicalName?: string;

  // Lookup options
  /** Field name for the lookup display value */
  lookupDisplayField?: string;
  /** Entity set name for the lookup target (e.g., 'contacts') - used for search API */
  lookupEntitySetName?: string;
  /** Primary name attribute of the lookup target entity (e.g., 'fullname' for contact) */
  lookupSearchField?: string;
  /** Logical name of the lookup target entity (e.g., 'contact') - used for navigation URLs */
  lookupTargetEntity?: string;
  /** Primary ID attribute of the lookup target entity (e.g., 'contactid') */
  lookupPrimaryIdAttribute?: string;
  /** Custom OData filter for lookup search (e.g., "statecode eq 0" for active records only) */
  lookupFilter?: string;
  /** Additional fields to select for lookup display (comma-separated) */
  lookupSelectFields?: string;
  /**
   * Consumer-supplied search callback for editable lookup (fetch-free).
   * Preferred over `apiService` when present — this is grid-kit's contract:
   * the host owns the query, the cell only renders the returned options.
   */
  lookupSearch?: (term: string) => Promise<Array<{ id: string; name: string }>>;

  // Option set options (for editable dropdown)
  /**
   * Option set choices for dropdown editing. `value` may be numeric (standard
   * Dataverse optionset) or a string key; `iconName`/`color` are optional
   * per-option adornments (rendered in the dropdown + read-mode badges).
   */
  optionSetOptions?: Array<{ value: number | string; label: string; iconName?: string; color?: string }>;
  /** Multi-select optionset: the value is an array of selected option values. */
  optionSetMultiSelect?: boolean;

  // Edit mode options
  /** Validation function for edit mode - returns error message or undefined */
  validate?: (value: unknown, rowKey: string) => string | undefined;

  // Export options
  /** Whether to include this column in export options (default: true) */
  exportable?: boolean;
  /** Custom header name for export (defaults to column.name) */
  exportLabel?: string;

  // Import options
  /** Whether this column can be imported (default: true) */
  importable?: boolean;
  /** Whether this field is required during import */
  importRequired?: boolean;
  /** Alternative header names to match during import column mapping */
  importAlias?: string[];
}

/**
 * Result of a batch update operation.
 */
export interface BatchUpdateResult {
  /** IDs of records successfully updated */
  succeeded: string[];
  /** Records that failed to update */
  failed: { id: string; error: string }[];
}

/**
 * Record for batch update operation.
 */
export interface BatchUpdateRecord {
  /** Record ID */
  id: string;
  /** Fields to update */
  data: Record<string, unknown>;
}

/**
 * Selection mode for the list.
 */
export type ListSelectionMode = 'none' | 'single' | 'multiple';

/**
 * Sort direction for columns.
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Sort state for the list.
 */
export interface SortState<T> {
  /** Column key being sorted */
  sortColumn: keyof T | null;
  /** Sort direction */
  sortDirection: SortDirection;
}

/**
 * Pagination state for the list.
 */
export interface PaginationState {
  /** Current page (1-based) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Items per page */
  pageSize: number;
  /** Total number of items */
  totalItems: number;
}

/**
 * Props for cell renderer components.
 */
export interface CellRendererProps<T> {
  /** The item being rendered */
  item: T;
  /** The column configuration */
  column: IReusableColumn<T>;
  /** The field value */
  value: unknown;
  /** The item's key (for callbacks) */
  itemKey: string;
}
