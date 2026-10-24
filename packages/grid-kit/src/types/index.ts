import type * as React from 'react';
import type { IContextualMenuProps } from '@fluentui/react';
import type { NavTarget } from '../navigation/navigateTo';
import type { GridFilterModel } from '../core/filter';
import type { AggregateSpec } from '../core/aggregate';
import type { GridToolbarLayout, GridCommandPosition, SelectionGatingMode } from '../core/toolbarCommands';

/**
 * grid-kit canonical contract.
 *
 * grid-kit OWNS this vocabulary (it does not import form-runtime, which is a
 * sibling, zero-React, typecheck-standalone package). The literals are aligned
 * with both `@khester/dynamics-cell-renderers`' `ListFieldType` and
 * form-runtime's `CellRendererType` so a grid-customizer definition maps onto
 * these via `fromGridCustomizerDefinition()` without a runtime dependency.
 */

// ─── Renderer & editor vocabularies ──────────────────────────────────────────

/** Cell renderer types. Superset of the canonical library + form-runtime. */
export type CellRendererType =
  | 'text'
  | 'link'
  | 'lookup'
  | 'optionset'
  | 'currency'
  | 'number'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'toggle'
  | 'icon'
  | 'progress'
  | 'coloredCell'
  | 'rating'
  | 'composite'
  | 'fileDrop';

/** Inline editor types for editable grids. `'none'` (or undefined) = read-only. */
export type CellEditorType = 'text' | 'number' | 'date' | 'dropdown' | 'toggle' | 'lookup' | 'none';

export type GridSelectionMode = 'none' | 'single' | 'multiple';

// ─── Column definition ───────────────────────────────────────────────────────

/**
 * grid-kit's renderer-agnostic column. The host adapters convert this into the
 * shape each grid host needs (Fluent `IColumn.onRender` or a GridCustomizer FC).
 */
export interface ColumnDef<T = Record<string, unknown>> {
  /** Stable column key. */
  key: string;
  /** Logical attribute / row field this column reads. */
  fieldName: string;
  /** Header text. */
  name: string;

  /**
   * Which renderer to use. A built-in `CellRendererType`, or any custom string
   * registered via `registry.register(type, …)`. The `(string & {})` keeps
   * autocomplete for the built-ins while allowing custom types without a cast.
   */
  // eslint-disable-next-line @typescript-eslint/ban-types -- `string & {}` is the idiom that keeps literal autocomplete
  rendererType: CellRendererType | (string & {});
  /**
   * Type-specific renderer config. Shape depends on `rendererType` — e.g.
   *   progress    → { max, color, showLabel }
   *   currency    → { currencyCode, locale, decimals }
   *   coloredCell → { colorMap, getBackgroundColor }
   *   optionset   → { options: [{ value, label, color }] }
   *   rating      → { max, color, allowHalf }
   *   composite   → CompositeRendererConfig (layout/gap/slots)
   *   lookup      → { entitySetName, searchField, targetEntity, … }
   */
  rendererConfig?: Record<string, unknown>;

  /** Inline editor type (editable grids). Undefined/`'none'` ⇒ read-only. */
  editorType?: CellEditorType;
  /** Locked even when the grid is editable (computed/permission-gated fields). */
  isLocked?: boolean;

  // sizing / behavior
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  isResizable?: boolean;
  isSortable?: boolean;
  isFilterable?: boolean;
  /**
   * Opt-in responsive priority (higher = kept longer). When ANY column on a grid
   * sets this, the DetailsList-backed hosts SHED the lowest-priority columns once
   * the container narrows below the `md` breakpoint (presentation-only — the data,
   * export, filter and aggregate scope keep the full set). Columns that declare an
   * `aggregate` (and grid-kit's `__`-prefixed control columns) are never shed.
   * Unset columns use a neutral mid default (`DEFAULT_RESPONSIVE_PRIORITY`). When no
   * column sets it, nothing sheds (byte/behavior-identical to before).
   */
  responsivePriority?: number;

  /**
   * Footer aggregate(s) for this (numeric) column. One function, or several: the v9 hosts
   * render ONE footer row per distinct function; the v8 hosts (single-row footer) use the
   * first. Test it with `hasAggregate(col)`, never truthiness — `[]` is truthy.
   */
  aggregate?: AggregateSpec;
  /**
   * Custom format for the aggregate footer cell. Default: `count` → integer;
   * `sum`/`avg`/`min`/`max` → `computeFormattedValue` by `rendererType` (so a
   * currency column's sum shows as currency); `null` → blank.
   */
  aggregateFormat?: (value: number | null, fn: 'sum' | 'avg' | 'count' | 'min' | 'max') => string;

  // callbacks
  /** Link/record-link click handler. */
  onLinkClick?: (item: T) => void;
  /** Per-column value-change handler (4-arg, matches the editable cells). */
  onValueChange?: (rowKey: string, fieldName: string, value: unknown, originalValue: unknown) => void;
  /** Edit-mode validation — returns an error message or undefined. */
  validate?: (value: unknown, rowKey: string) => string | undefined;

  // hover callout parity (preserves the behavior of the grid it replaced)
  /**
   * Custom callout content shown on hover over the cell (e.g. a lookup's
   * related-record preview). Consumed by the DetailsList host (`toDetailsListColumns`
   * → `CalloutCell`); ignored when `onRender` (the escape hatch) is set, and not yet
   * wired on the Grid Customizer host.
   */
  calloutContent?: (item: T) => React.ReactNode;
  /** Callout content shown on icon hover (icon columns). */
  onIconMouseEnter?: (item: T) => React.ReactNode;
  /** How the callout dismisses. */
  dismissMode?: 'mouseleave' | 'timeout';
  /** Auto-dismiss duration (ms) when `dismissMode === 'timeout'`. */
  timeoutDuration?: number;

  /** Escape hatch: fully custom cell render, bypassing the registry. */
  onRender?: (item: T) => React.ReactNode;
}

// ─── The keystone cell contract ──────────────────────────────────────────────

/**
 * The single normalized cell-render contract every grid-kit renderer speaks.
 * A superset union of the three host shapes (DetailsList `onRender(item,idx,col)`,
 * GridCustomizer `FC<CellRendererProps>`, and the canonical lib's
 * `Cell({item,column,value,itemKey})`). Adapters build this per cell; renderers
 * never reach back into a host.
 */
export interface GridCellProps<T = Record<string, unknown>> {
  /** Raw field value. */
  value: unknown;
  /** Display string — host-supplied (Dataverse formatted value) or computed fallback. */
  formattedValue: string;
  /**
   * Only set when the value was supplied by the host/platform (e.g. Dataverse
   * `@OData…FormattedValue`), NOT when `formattedValue` is a computed fallback.
   * Renderers use this to honor a real optionset/lookup label over the raw code.
   */
  suppliedFormattedValue?: string;
  /** Full row. */
  item: T;
  /** Row key (for change callbacks). */
  itemKey: string;
  /** Column definition. */
  column: ColumnDef<T>;

  // edit-state (read-only renderers ignore these)
  isEditing?: boolean;
  isDirty?: boolean;
  editedValue?: unknown;
  errorMessage?: string;
  /** 4-arg change signal, matching the canonical editable cells. */
  onValueChange?: (rowKey: string, fieldName: string, value: unknown, originalValue: unknown) => void;
  onValidationError?: (rowKey: string, fieldName: string, message: string | undefined) => void;
  onEditStart?: () => void;
  onEditEnd?: () => void;
}

/** A grid-kit cell renderer is a component (rendered as an element, never called). */
export type GridCellRenderer<T = Record<string, unknown>> = React.ComponentType<GridCellProps<T>>;

// ─── Registry ────────────────────────────────────────────────────────────────

/** Read + optional edit renderer pair for a cell type. */
export interface CellRegistration<T = Record<string, unknown>> {
  read: GridCellRenderer<T>;
  edit?: GridCellRenderer<T>;
}

/** The cell-renderer registry shared across both grid hosts. */
export interface GridRegistry {
  /** Look up a registration (built-in or custom). */
  get(type: CellRendererType | string): CellRegistration | undefined;
  /** Register or override a cell type (built-in override or brand-new type). */
  register(type: CellRendererType | string, reg: CellRegistration): void;
  /** Resolve the renderer for a column, honoring read-vs-edit. */
  resolve<T = Record<string, unknown>>(column: ColumnDef<T>, editable: boolean): GridCellRenderer<T>;
}

// ─── Grid host props ─────────────────────────────────────────────────────────

export interface GridSortState {
  fieldName: string;
  direction: 'asc' | 'desc';
}

export interface GridPaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
}

export interface GridCommand {
  key: string;
  text: string;
  iconName?: string;
  onClick?: () => void;
  disabled?: boolean;
  /** Render as a split button (primary `onClick` + a `subMenuProps` dropdown). */
  split?: boolean;
  /**
   * Dropdown menu for split/menu commands (e.g. the export CSV/JSON choice). Without
   * `split`, the command renders as a menu button (Dynamics' "Flow ▾"); in the `⋮`
   * overflow it becomes a submenu.
   */
  subMenuProps?: IContextualMenuProps;
  /** `layout: 'dynamics'` only: render the icon alone; `text` becomes the tooltip + accessible name. */
  iconOnly?: boolean;
  /**
   * `layout: 'dynamics'` only. `'primary'` (default) sits inline and folds into `⋮`
   * when space runs out; `'overflow'` always lives in `⋮`. (A Dynamics `'far'`
   * position is not supported: Fluent's far items never overflow.)
   */
  position?: GridCommandPosition;
  /**
   * Show the command only when at least this many rows are selected. Needs
   * `GridToolbarConfig.selectedCount`; without it, gating is off.
   */
  minSelectionCount?: number;
  /** Show the command only when at most this many rows are selected (e.g. 1 for "Edit"). */
  maxSelectionCount?: number;
}

/**
 * A per-row command shown in the right-click context menu (`GridProps.rowCommands`).
 *
 * Intentionally NOT a `GridCommand`: that is a toolbar command with a zero-arg,
 * optional `onClick`, a boolean `disabled`, and `split`/`subMenuProps` (meaningless
 * per-row). A `RowCommand` is item-aware — `onClick(item)` and the `visible`/`disabled`
 * predicates all receive the row. `onClick` takes only the item (no positional index):
 * resolve the row off the item itself (e.g. a stamped `__rowIndex`) so callers can't
 * mis-key on a display index.
 */
export interface RowCommand<T = Record<string, unknown>> {
  key: string;
  text: string;
  iconName?: string;
  onClick: (item: T) => void;
  /** Hide this command for a row when it returns `false`. Default: shown. */
  visible?: (item: T) => boolean;
  /** Disable (grey out) this command for a row when it returns `true`. Default: enabled. */
  disabled?: (item: T) => boolean;
}

/** Turnkey CSV/JSON export config (a toolbar split-button over the host's items). */
export interface GridExportConfig {
  /** Show the Export split-button in the toolbar. */
  enabled?: boolean;
  /** Base filename (a date suffix is added). Default 'grid-export'. */
  filename?: string;
  /** Formats offered in the split-button menu. Default ['csv', 'json']. */
  formats?: Array<'csv' | 'json'>;
  /**
   * `'all'` always exports every row in `items`. `'selected'` exports only the
   * current selection (requires `selectionMode` ≠ 'none'; no-ops when nothing is
   * selected). Default (unset): the selection when non-empty, else all `items`.
   */
  scope?: 'all' | 'selected';
  /**
   * Open the `GridExportDialog` (format + column picker + filename) instead of
   * exporting immediately. The split-button becomes a single "Export…" button.
   */
  dialog?: boolean;
}

export interface GridToolbarConfig {
  showSearch?: boolean;
  searchPlaceholder?: string;
  onSearch?: (term: string) => void;
  commands?: GridCommand[];
  /**
   * `'default'` (unset) is the historical bar — commands left, search right.
   * `'dynamics'` mimics the model-driven subgrid command bar for surfaces the
   * platform does not decorate (custom pages): `title` left, commands right-aligned,
   * commands that do not fit fold into a `⋮` menu, search far right.
   */
  layout?: GridToolbarLayout;
  /** `layout: 'dynamics'` only: the section title on the left; also the toolbar's accessible name. */
  title?: string;
  /** `layout: 'dynamics'` only: icon-only buttons across the bar (a command's own `iconOnly` wins). */
  iconOnly?: boolean;
  /**
   * The current selection size, supplied by the consumer (mirror the host's
   * `onSelectionChanged`). Drives each command's `minSelectionCount` /
   * `maxSelectionCount`. Unset = gating off, every command shown as configured.
   */
  selectedCount?: number;
  /** Out-of-bounds commands are hidden (default — what Dynamics does) or disabled. */
  selectionGating?: SelectionGatingMode;
  /** Accessible name of the `⋮` button. Default: `More commands for {title}` / `More commands`. */
  overflowAriaLabel?: string;
}

/** Whole-row file-drop config (HTML5 drop of OS files onto a row). */
export interface RowFileDropConfig<T = Record<string, unknown>> {
  /** Called with the row + the accepted dropped files. */
  onDrop: (item: T, files: File[]) => void;
  /** Allowed extensions (e.g. `['.pdf', '.png']`). Empty/undefined = any. */
  accept?: string[];
  /** Allow multiple files (default false → first accepted file only). */
  multiple?: boolean;
  /** Called when a drop is rejected (wrong type / no files). */
  onReject?: (item: T, reason: string) => void;
}

export interface GridProps<T = Record<string, unknown>> {
  items: T[];
  columns: ColumnDef<T>[];
  /** Defaults to `createCellRegistry()`. */
  registry?: GridRegistry;
  selectionMode?: GridSelectionMode;
  /** Fires with the currently selected rows (requires `selectionMode` ≠ 'none'). */
  onSelectionChanged?: (selectedItems: T[]) => void;
  /**
   * Row keys (`getKey`) to select on mount — an uncontrolled INITIAL selection used to
   * RESTORE a selection when the grid is remounted (e.g. a nested side-panel / drawer
   * that unmounts its child grid on close). Applied once; later selection is user-driven.
   */
  initialSelectedKeys?: string[];
  /**
   * Column width layout. `'fill'` (default) = justified — columns stretch to fill the
   * width (measured async on mount, so a small grid can visibly re-justify). `'fixed'` =
   * columns stay at their `minWidth`/`width` (no stretch, no mount re-justify) — better
   * for compact grids like a nested child grid.
   */
  columnLayout?: 'fill' | 'fixed';
  /**
   * Enables inline editing for columns whose `editorType` is set (and not
   * `'none'`/locked). By default editing is **per-cell click-to-edit**
   * (`editTrigger: 'click'`) — a cell shows read text until clicked, then its
   * inline editor. Set `editTrigger: 'always'` for an Excel-like grid where
   * every editable cell shows its editor at once.
   */
  editable?: boolean;
  /** Edit activation model when `editable`. Default `'click'`. */
  editTrigger?: 'click' | 'always';
  isLoading?: boolean;
  sort?: GridSortState;
  onSortChange?: (fieldName: string, direction: 'asc' | 'desc') => void;
  /**
   * Presentational pager only — the consumer MUST pre-slice `items` to the
   * current page. The grid renders exactly what is in `items`; it does not
   * page internally.
   */
  pagination?: GridPaginationState;
  onPageChange?: (page: number) => void;
  /**
   * Rows the aggregate footer computes over. Defaults to the displayed (filtered)
   * rows — i.e. the current page when the consumer pre-paginates. Pass the FULL
   * dataset here for cross-page grand totals; an active filter (`filterBuilder`) is
   * applied to it too, so the total reflects what the filter shows across all pages.
   * Note: on `<GroupedGrid>`, per-group subtotals (`showGroupAggregates`) stay
   * page-scoped — only this overall footer goes cross-page — so they intentionally
   * need not sum to the grand total.
   */
  aggregateItems?: T[];
  toolbar?: GridToolbarConfig;
  /** Row-key accessor (default: `item.key`). */
  getKey?: (item: T) => string;
  /** Bubbled value-change from any editable cell. */
  onValueChange?: (rowKey: string, fieldName: string, value: unknown, originalValue: unknown) => void;
  onActiveItemChanged?: (item: T, index?: number) => void;
  /** Compact row height. */
  compact?: boolean;
  /**
   * Fill the host's container: the grid root becomes a flex column at `height`
   * (default 100%) and the list/cards scroll internally, so the toolbar + footers
   * stay fixed. Default off (natural height). For dropping a grid into a surface-kit
   * Section / Dialog / Panel that owns the available height.
   *
   * Requirements / limits:
   * - The container MUST have a resolved height (a flex/grid parent or an explicit
   *   height) — `height: '100%'` against an auto-height parent renders nothing.
   * - v1: the DetailsList column header scrolls with the body (not pinned).
   * - Honored by side-panel / hover-callout nested modes (via DataGrid), but NOT by
   *   `<NestedGrid mode="inline">` (inline child height is driven by row expansion).
   */
  fill?: boolean;
  /** Explicit grid height (number = px, or any CSS value). With `fill`, defaults to '100%'. */
  height?: number | string;
  /** Make each row a file-drop target (OS files → `onDrop(item, files)`). */
  rowFileDrop?: RowFileDropConfig<T>;
  /**
   * Adds a turnkey Export (CSV/JSON) split-button to the toolbar over the host's
   * current `items` (or the selection when non-empty). Renders the toolbar even
   * if `toolbar` is undefined.
   */
  exportConfig?: GridExportConfig;
  /**
   * Zebra-stripe rows with the given even/odd row background colors. Composes
   * with `rowFileDrop` (both share the DetailsList `onRenderRow`). No-op on
   * CardGrid (no rows). Mirrors form-runtime's `alternateRowColors`.
   */
  alternateRowColors?: { even: string; odd: string };
  /**
   * Resolve a row → a navigation target. When set, `link`/`lookup` cells open it
   * on click and a toolbar "Open" command navigates the active/selected row.
   * Executed via `Xrm.Navigation` (no-op + console on localhost / no Xrm).
   */
  navigateTo?: (item: T) => NavTarget | undefined;
  /** Row-level navigation hook, wired to DetailsList `onItemInvoked` (double-click / Enter). */
  onRowNavigate?: (item: T) => void;
  /**
   * Per-row right-click context menu. When set (and non-empty), right-clicking a row
   * opens a Fluent v8 `ContextualMenu` of these commands (the native browser menu is
   * suppressed). When unset/empty the native menu is left intact (strict no-op for
   * existing consumers). Honored by every host: the DetailsList-backed grids (`DataGrid`,
   * `GroupedGrid`, and `<NestedGrid>`'s inline/side-panel/hover-callout/detail-pane
   * parents), the card grids (flat `CardGrid` and the `NestedCardParent` card parents,
   * per-card right-click), and the `FocusedViewGrid` rail.
   */
  rowCommands?: RowCommand<T>[];
  /**
   * Adds a "Columns" toolbar command that opens a column-chooser panel
   * (show/hide + reorder). The grid manages the visible set internally; opt-in.
   */
  columnChooser?: boolean;
  /** Notified with the new visible column keys (in order) when the chooser applies. */
  onColumnOrderChange?: (visibleOrder: string[]) => void;
  /**
   * Seed for the column chooser (read at mount, like `initialSelectedKeys`) — e.g. a choice the
   * consumer persisted from `onColumnOrderChange`. Its keys are shown in that order; every other
   * column present at mount starts HIDDEN; a column added later appears (visible). Host `__…`
   * columns are never part of it.
   */
  initialVisibleOrder?: string[];
  /**
   * Adds a "Filters" toolbar command that opens a filter-builder panel (field +
   * operator + value conditions combined with All/Any). The grid filters its
   * in-memory `items` by the built model — the list, aggregate footer, and export
   * scope all reflect the filter; opt-in. Operates on the passed `items`, so pair
   * it with a client-side (non-paginated) dataset, like the aggregate footer; for
   * server-side filtering, read `onFilterChange` and re-query.
   */
  filterBuilder?: boolean;
  /** Notified with the applied filter model when the filter panel applies. */
  onFilterChange?: (model: GridFilterModel) => void;
  /**
   * Seed for the filter builder (read at mount, like `initialVisibleOrder`) — e.g. a model the
   * consumer persisted from `onFilterChange`. A condition counts and filters only while the grid
   * offers its field, so `columns` may arrive after mount; the filter panel shows only those, and
   * its next Apply drops the rest. Does not fire `onFilterChange`.
   */
  initialFilterModel?: GridFilterModel;
}

// ─── Read-Only grid ──────────────────────────────────────────────────────────

/**
 * Read-only grid: `<DataGrid>` with selection off and editing off. A thin preset.
 * The `toolbar` config (including `commands`) is forwarded, so a read-only grid
 * can still host non-selection toolbar actions (New / Refresh / Export) in the
 * single host `<GridToolbar>`; selection-dependent commands are inert under
 * `selectionMode="none"` and should be omitted by the consumer.
 */
export type ReadOnlyGridProps<T = Record<string, unknown>> = Omit<
  GridProps<T>,
  'selectionMode' | 'editable' | 'editTrigger' | 'onSelectionChanged' | 'onValueChange'
>;

// ─── Card grid ───────────────────────────────────────────────────────────────

/**
 * Card-view layout config. Mirrors form-runtime's `GridCardViewConfig` (minus
 * its `enabled` flag — choosing `<CardGrid>` IS "enabled").
 */
export interface CardConfig {
  /** Cards per row (CSS grid columns). Default 3. */
  cardsPerRow?: number;
  /**
   * Opt-in responsive minimum card width in px. When set, the card grid REFLOWS
   * to the container width — cards never get narrower than `minCardWidth` (down to
   * a single full-width column on mobile) and never exceed `cardsPerRow` columns on
   * wide screens. When unset, the grid keeps the fixed `cardsPerRow`-column layout
   * (default — byte-identical to before). Requires modern CSS Grid + `min()`/`max()`
   * (evergreen Chromium / Power Pages modern runtime; not IE11, consistent with
   * CardGrid's existing modern-grid baseline).
   */
  minCardWidth?: number;
  /** Fixed card height in px (otherwise content-sized). */
  cardHeight?: number;
  /** Column whose value is the card title. Default: first column. */
  titleField?: string;
  /** Column whose value is the card subtitle. */
  subtitleField?: string;
  /** Column whose value is an image URL shown as a card thumbnail. */
  imageField?: string;
  /**
   * Columns rendered (label + value) in the card body. Default: all columns
   * except the title/subtitle/image fields.
   */
  bodyFields?: string[];
}

export interface CardGridProps<T = Record<string, unknown>> extends Omit<GridProps<T>, 'compact'> {
  card?: CardConfig;
}

// ─── Grouped grid ────────────────────────────────────────────────────────────

/**
 * Grouping config for `<GroupedGrid>`. grid-kit-originated (form-runtime has no
 * `groupBy` field yet); maps onto Fluent v8 DetailsList `IGroup[]`.
 */
export interface GroupConfig<T = Record<string, unknown>> {
  /** Field whose value buckets rows into groups. */
  groupBy: string;
  /** Custom header label; default is the formatted group value. */
  getGroupLabel?: (groupValue: unknown, items: T[]) => string;
  /** Start groups collapsed. Default false. */
  collapsedByDefault?: boolean;
  /** Show a per-group count in the header. Default true. */
  showCount?: boolean;
  /**
   * Render a per-group subtotal footer row (aggregating each group's rows for the
   * columns that declared an `aggregate`). Default false. The overall footer below
   * the grid is unaffected. Subtotals always aggregate the displayed (page) rows of
   * each group — only the overall footer goes cross-page via `aggregateItems`.
   */
  showGroupAggregates?: boolean;
}

export interface GroupedGridProps<T = Record<string, unknown>> extends GridProps<T> {
  group: GroupConfig<T>;
}

// ─── Nested / expandable grid ────────────────────────────────────────────────

/**
 * How a parent row surfaces its child records. Mirrors form-runtime's
 * `NestedDisplayMode`.
 * - `inline`        — chevron expands the child grid under the parent row
 * - `detail-pane`   — child grid renders in a master-detail pane (FocusedViewGrid)
 * - `side-panel`    — a trigger opens a Fluent Panel hosting the child grid
 * - `hover-callout` — hovering a count badge shows a compact callout of top-N rows
 */
export type NestedDisplayMode = 'inline' | 'detail-pane' | 'side-panel' | 'hover-callout';

/** Side-panel size (maps to Fluent v8 `PanelType`). */
export type NestedSidePanelSize = 'small' | 'medium' | 'large';

/**
 * Nested-grid config for `<NestedGrid>`. grid-kit never fetches — the consumer
 * supplies `getChildren(parent)` (sync array or promise); it owns the
 * relationship/FetchXML. The child grid is itself a grid-kit grid.
 */
export interface NestedConfig<T = Record<string, unknown>, C = Record<string, unknown>> {
  /** How children surface. */
  mode: NestedDisplayMode;
  /** Child grid columns. */
  childColumns: ColumnDef<C>[];
  /** Resolve a parent row → its child rows (sync or async). */
  getChildren: (parent: T) => C[] | Promise<C[]>;
  /**
   * Bump to invalidate + re-fetch already-loaded children (e.g. after associating a
   * new child to a parent). Caching hosts (`useChildren` / `NestedTriggerCell`) re-run
   * `getChildren` for loaded parents in place — old rows stay visible until the new
   * ones arrive. Leave unset for a static list.
   */
  reloadToken?: string | number;
  /** Side-panel size when `mode === 'side-panel'`. Default 'medium'. */
  panelSize?: NestedSidePanelSize;
  /**
   * Hover delay (ms) before a `hover-callout` opens. Default 300. Honoured by the v9 host
   * (≥ 0.21.0); a pointer that leaves before it elapses opens nothing and FETCHES nothing, so
   * sweeping the mouse down a column does not fire a child query per row.
   */
  hoverDelay?: number;
  /** Max rows shown in the hover-callout preview. Default 5. */
  calloutMaxRows?: number;
  /** Trigger label (supports the `{count}` token). Default "View {count} related". */
  triggerLabel?: string;
  /** Fluent icon name for the trigger. Default 'OpenPaneMirrored'. */
  triggerIcon?: string;
  /** Registry for the child grid; defaults to the parent's registry. */
  childRegistry?: GridRegistry;

  // ── parent layout ──
  /**
   * How parent rows render. `'rows'` (default) = DetailsList/DataGrid rows per
   * `mode`. `'cards'` = each parent is a card that expands IN PLACE to reveal its
   * child grid (`<NestedCardParent>`); `mode` is ignored for card parents.
   */
  parentLayout?: 'rows' | 'cards';
  /** Card layout config when `parentLayout === 'cards'` (reuses `CardConfig`). */
  parentCard?: CardConfig;

  // ── child grid selection / editing (inline + side-panel; not hover-callout) ──
  /** Selection mode for the child grid. Default 'none'. */
  childSelectionMode?: GridSelectionMode;
  /**
   * Gates child-row selection relative to the parent (mirrors form-runtime's
   * `nestedSelectionMode`). `'independent'` (default) = children selectable
   * regardless of parent. `'requires-parent'` = a parent's child grid is only
   * selectable while that parent row is selected (inline mode; requires the
   * parent grid to be selectable, i.e. `selectionMode` ≠ 'none'). De-selecting
   * then re-selecting a parent restores that child grid's prior selection (the
   * child keeps its own selection state while gated off).
   */
  childSelectionGating?: 'independent' | 'requires-parent';
  /** Fires with the selected child rows + their parent. */
  onChildSelectionChanged?: (parent: T, selected: C[]) => void;
  /** Make the child grid editable. */
  childEditable?: boolean;
  /**
   * Let the user resize the CHILD grid's columns (inline + side-panel; v9 host). Default false.
   * ★ Passes `resizableColumnsOptions: { autoFitColumns: false }` with it — Fluent's autofit clamps
   *   every drag whenever the columns overflow their container, which a drawer or an inline
   *   sub-grid routinely does, making resizing silently inert.
   */
  childResizableColumns?: boolean;
  /** Edit activation for the child grid. Default 'click'. */
  childEditTrigger?: 'click' | 'always';
  /** Bubbled value-change from a child cell (with its parent row). */
  onChildValueChange?: (
    parent: T,
    rowKey: string,
    fieldName: string,
    value: unknown,
    originalValue: unknown
  ) => void;
}

export interface NestedGridProps<T = Record<string, unknown>, C = Record<string, unknown>>
  extends GridProps<T> {
  nested: NestedConfig<T, C>;
}

// ─── Focused-view / master-detail grid ───────────────────────────────────────

/** A field reference in a focused-view summary row. Mirrors form-runtime `FocusedViewField`. */
export interface FocusedViewField {
  fieldName: string;
  label: string;
  linkedEntityAlias?: string;
  attributeType?: string;
}

/** A summary row in the focused-view left rail. Mirrors form-runtime `FocusedViewRow`. */
export interface FocusedViewRow {
  id: string;
  primaryField: FocusedViewField;
  secondaryField?: FocusedViewField;
  /** Fluent v8 icon name shown beside the row. */
  iconName?: string;
}

/** Focused-view config for `<FocusedViewGrid>`. Mirrors form-runtime `FocusedViewConfig`. */
export interface FocusedViewConfig {
  /** 1–4 summary rows for each left-rail item. */
  rows: FocusedViewRow[];
  /** Reserved (form-runtime parity) — show an "up next" activity slot. */
  showUpNextActivity?: boolean;
  /** Columns rendered in the right detail pane. Default: all columns. */
  detailFields?: string[];
  /**
   * Right-pane layout: when `true`, the pane renders ONLY the nested child grid —
   * no record-title heading, no detail-field list, no "Related" subheading. Use
   * for a pure master/detail where the rail is the master and the pane is the
   * related-records grid (the export-engine focused-view shape). Requires `nested`.
   * Default (`false`/unset): the classic detail-field list, with the child grid
   * appended under a "Related" heading when a `detail-pane` nested config is given.
   */
  childOnly?: boolean;
}

export interface FocusedViewGridProps<T = Record<string, unknown>> extends GridProps<T> {
  focusedView: FocusedViewConfig;
  /** Optional child grid rendered in the detail pane (nested `mode: 'detail-pane'`). */
  nested?: NestedConfig<T, Record<string, unknown>>;
}
