// @dataverse-kit/grid-kit/v9 — the public prop contract for the Fluent UI v9 grid.
//
// It reuses the renderer-agnostic grid vocabulary from the v8 layer (`../types`) —
// `ColumnDef`, `CellRendererType`, `GridCellProps`, `GridSortState`,
// `GridPaginationState`, `GridSelectionMode` are all Fluent-free and shared, never
// forked — but every place the v8 host props leaked a Fluent-v8 type is replaced
// with a v9-native one:
//   - toolbar commands are `V9GridCommand[]` (a v9 `<Toolbar>`), not a `GridCommand`
//     whose `subMenuProps` is a v8 `IContextualMenuProps`
//   - command icons are a rendered `ReactElement` (a v9 `@fluentui/react-icons`
//     element), not a v8 `iconName` string
// The pure `core/` (formatters / color / thresholds / aggregate / responsive
// shedding) is imported by the v9 hosts, never re-implemented.
import type { ComponentType, ReactElement } from 'react';
import type {
  ColumnDef,
  GridSelectionMode,
  GridSortState,
  GridPaginationState,
  GridRegistry,
  CardConfig,
  FocusedViewConfig,
  NestedConfig,
  GroupConfig,
  GridExportConfig,
} from '../types';
import type { NavTarget } from '../navigation/navigateTo';
import type { AggregateValues, AggregateFunction } from '../core/aggregate';
import type { GridFilterModel } from '../core/filter';
import type { GridToolbarLayout, GridCommandPosition, SelectionGatingMode } from '../core/toolbarCommands';

/**
 * A column-chooser panel component (`GridColumnChooserV9`, or your own with the same props). Pass a
 * STABLE component — an inline `(p) => <GridColumnChooserV9 {...p} />` is a new component every
 * render, so the drawer remounts and loses its working copy.
 */
export type V9ColumnChooserPanel<T = Record<string, unknown>> = ComponentType<V9ColumnChooserPanelProps<T>>;
/** The props the grid passes its column-chooser panel. */
export interface V9ColumnChooserPanelProps<T = Record<string, unknown>> {
  open: boolean;
  onClose: () => void;
  /** The CHOOSABLE columns (host `__…` columns already removed by the grid). */
  columns: ColumnDef<T>[];
  /** Visible keys in display order (the applied choice). */
  visibleOrder: readonly string[];
  onApply: (visibleOrder: string[]) => void;
  /** "Columns", or "Edit columns" under look="ce". */
  title?: string;
}

/**
 * A filter-builder panel component (`GridFilterBuilderV9`, or your own with the same props). Pass a
 * STABLE component, as for `V9ColumnChooserPanel`.
 */
export type V9FilterBuilderPanel<T = Record<string, unknown>> = ComponentType<V9FilterBuilderPanelProps<T>>;
/** The props the grid passes its filter-builder panel. */
export interface V9FilterBuilderPanelProps<T = Record<string, unknown>> {
  open: boolean;
  onClose: () => void;
  /** All grid columns — the panel offers the filterable ones (`filterableFields`). */
  columns: ColumnDef<T>[];
  /** The applied model, already limited to fields the grid offers (the panel resets to it on open). */
  model: GridFilterModel;
  /** Apply a model (incomplete conditions already dropped). */
  onApply: (model: GridFilterModel) => void;
  /** "Edit filters". */
  title?: string;
}

/** A single toolbar command in the v9 grid (renders a `<ToolbarButton>`). */
export interface V9GridCommand {
  key: string;
  /** Button label. */
  text: string;
  /** A rendered v9 icon element (e.g. `<ArrowClockwise20Regular />`). */
  icon?: ReactElement;
  /** `primary` uses the brand appearance; otherwise a subtle toolbar button. */
  appearance?: 'primary' | 'subtle';
  disabled?: boolean;
  onClick?: () => void;
  /**
   * `layout: 'dynamics'` only: render a menu button (Dynamics' "Flow ▾") listing these
   * items; in the `⋮` overflow it becomes a submenu. The v9 counterpart of v8
   * `GridCommand.subMenuProps` (without `split` — v9 split buttons are not supported).
   * A command with `menuItems` only opens its menu; its own `onClick` is not called.
   */
  menuItems?: V9GridMenuItem[];
  /** `layout: 'dynamics'` only: render the icon alone; `text` becomes the tooltip + accessible name. */
  iconOnly?: boolean;
  /**
   * `layout: 'dynamics'` only. `'primary'` (default) sits inline and folds into `⋮`
   * when space runs out; `'overflow'` always lives in `⋮`.
   */
  position?: GridCommandPosition;
  /** Show only when at least this many rows are selected (needs `V9GridToolbarConfig.selectedCount`). */
  minSelectionCount?: number;
  /** Show only when at most this many rows are selected (e.g. 1 for "Edit"). */
  maxSelectionCount?: number;
  /**
   * The button is a focus-RESTORE target: when a drawer/dialog this command opened closes, focus
   * returns to it (Fluent's restorer — `useRestoreFocusTarget`). While the command is folded into
   * `⋮` its menu item unmounts on click, so the `⋮` button is the target instead. Used by the
   * grid's own Columns command; a consumer command that opens an overlay can set it too.
   */
  restoreFocusTarget?: boolean;
}

/** One entry of a `V9GridCommand.menuItems` menu (flat — no nesting). */
export interface V9GridMenuItem {
  key: string;
  text: string;
  icon?: ReactElement;
  disabled?: boolean;
  onClick?: () => void;
}

/**
 * A per-row command (`V9GridProps.rowCommands`), shown in the right-click menu and/or the
 * trailing "⋯" button's menu, as `V9GridProps.rowCommandsDisplay` says.
 *
 * The v9 counterpart of the v8 `RowCommand` (`../types`): item-aware — `onClick(item)`,
 * `visible(item)`, and `disabled(item)` all receive the clicked row. The ONLY shape
 * difference from the v8 `RowCommand` is the icon — a rendered v9 `@fluentui/react-icons`
 * `ReactElement` (like `V9GridCommand.icon`), NOT a v8 `iconName` string — so the
 * export-engine v9 emitter maps a row-command icon the same way it maps a toolbar-command
 * icon (v8 name → v9 element), and `V9RowCommand` stays icon-consistent with `V9GridCommand`.
 */
export interface V9RowCommand<T = Record<string, unknown>> {
  key: string;
  text: string;
  /** A rendered v9 icon element (e.g. `<Open20Regular />`). */
  icon?: ReactElement;
  /** Invoked with the clicked row. */
  onClick: (item: T) => void;
  /** Hide this command for a row when it returns `false`. Default: shown. */
  visible?: (item: T) => boolean;
  /** Disable (grey out) this command for a row when it returns `true`. Default: enabled. */
  disabled?: (item: T) => boolean;
}

/** v9 grid toolbar config (search box + command buttons). Presentational — the grid
 *  does not filter internally; `onSearch` bubbles the term to the consumer. */
export interface V9GridToolbarConfig {
  showSearch?: boolean;
  searchPlaceholder?: string;
  onSearch?: (term: string) => void;
  commands?: V9GridCommand[];
  /**
   * `'default'` (unset) is the historical bar — search, then a wrapping toolbar.
   * `'dynamics'` mimics the model-driven subgrid command bar for surfaces the platform
   * does not decorate (custom pages): `title` left, commands right-aligned, commands
   * that do not fit fold into a `⋮` menu, search far right.
   *
   * In a PCF, the `⋮` menu and icon-only tooltips are PORTALS: give each control
   * instance its own `IdPrefixProvider` outside its `FluentProvider`, or they render
   * unthemed. Toolbar + Menu also use tabster arrow navigation — a `standard` control
   * on a model-driven form needs tabster isolation.
   */
  layout?: GridToolbarLayout;
  /** `layout: 'dynamics'` only: the section title on the left; also the toolbar's accessible name. */
  title?: string;
  /** `layout: 'dynamics'` only: icon-only buttons across the bar (a command's own `iconOnly` wins). */
  iconOnly?: boolean;
  /**
   * The current selection size, supplied by the consumer (mirror the host's
   * `onSelectionChanged`). Drives each command's `minSelectionCount` /
   * `maxSelectionCount`. Unset = gating off.
   */
  selectedCount?: number;
  /** Out-of-bounds commands are hidden (default — what Dynamics does) or disabled. */
  selectionGating?: SelectionGatingMode;
  /** Accessible name of the `⋮` button. Default: `More commands for {title}` / `More commands`. */
  overflowAriaLabel?: string;
}

/**
 * Props for the v9 flat / read grid (`<DataGrid>` from `@dataverse-kit/grid-kit/v9`).
 *
 * The flat host supports READ + inline EDITING (per-cell click-to-edit by default).
 * The 13 read cell types render; the editable columns (text / number / currency /
 * date / datetime / optionset / rating) swap to a v9 editor when `editable`. Editable
 * LOOKUP is opt-in: `createV9CellRegistry({ lookup: { read: LookupCell, edit: EditableLookupCell } })`
 * passed as `registry` (a column also needs `rendererConfig.searchLookup`).
 */
export interface V9GridProps<T = Record<string, unknown>> {
  items: T[];
  columns: ColumnDef<T>[];
  /** Cell-renderer registry. Defaults to `createV9CellRegistry()`. */
  registry?: GridRegistry;
  /** `'none'` (default) renders no selection column. */
  selectionMode?: GridSelectionMode;
  /** Fires with the currently selected rows (requires `selectionMode` ≠ 'none'). */
  onSelectionChanged?: (selectedItems: T[]) => void;
  /**
   * Row keys to select on mount — an uncontrolled INITIAL selection used to restore a
   * selection when the grid is remounted (e.g. a side-panel/drawer that unmounts its
   * child grid on close). Applied once; later selection is user-driven.
   */
  initialSelectedKeys?: string[];
  /**
   * Enables inline editing for columns whose `editorType` is set (and not
   * `'none'`/locked). By default editing is per-cell click-to-edit
   * (`editTrigger: 'click'`); set `editTrigger: 'always'` for an all-cells-editable
   * grid. Bubbled cell changes come through `onValueChange`.
   */
  editable?: boolean;
  /** Edit activation model when `editable`. Default `'click'`. */
  editTrigger?: 'click' | 'always';
  /** Bubbled value-change from any editable cell: `(rowKey, fieldName, value, originalValue)`. */
  onValueChange?: (rowKey: string, fieldName: string, value: unknown, originalValue: unknown) => void;
  isLoading?: boolean;
  /** Controlled sort indicator. The grid does NOT sort in-memory — clicking a
   *  sortable header calls `onSortChange`; the consumer re-queries/re-sorts. */
  sort?: GridSortState;
  onSortChange?: (fieldName: string, direction: 'asc' | 'desc') => void;
  /** Presentational pager — the consumer MUST pre-slice `items` to the page. */
  pagination?: GridPaginationState;
  onPageChange?: (page: number) => void;
  /** Rows the aggregate footer computes over (cross-page grand totals). Defaults to
   *  the displayed `items`. */
  aggregateItems?: T[];
  /**
   * Precomputed footer values per `(fieldName, fn)` — e.g. server-side totals over every
   * matching record, which no in-memory row set can produce. A pair that is present (even
   * `null` = blank) wins; an absent pair is computed over `aggregateItems ?? items`.
   */
  aggregateResults?: AggregateValues;
  toolbar?: V9GridToolbarConfig;
  /**
   * Turnkey CSV/JSON export — the SAME `GridExportConfig` as the v8 `DataGrid`. Adds an Export
   * command to the toolbar (synthesizing a toolbar when there is none; under `look="ce"` a
   * `layout: 'dynamics'` one). `layout: 'dynamics'`: one `Export ▾` menu of the formats (it folds
   * into `⋮` like any command). Default layout: one button per format (`Export CSV`, `Export JSON`)
   * — that toolbar cannot render a menu. Scope as v8: `'all'`, `'selected'`, or (unset) the
   * selection when non-empty, else `items`. CSV carries what the grid SHOWS (a row's
   * `@OData…FormattedValue` when present); JSON the raw values. Host-injected `__…` columns
   * (NestedGrid's "Related") are not exported. `dialog: true` is not supported on v9 yet — it
   * warns and exports directly. Command key `'__gridkit_export__'`, as v8.
   */
  exportConfig?: GridExportConfig;
  /**
   * The column chooser PANEL — pass `GridColumnChooserV9` (from `@dataverse-kit/grid-kit/v9`) to add a
   * "Columns" toolbar command ("Edit columns" under `look="ce"`) opening a drawer to show/hide and
   * reorder columns, the v8 `GridProps.columnChooser`. The grid owns the choice; a new `columns` array
   * with the same keys keeps it (hidden stays hidden). Host `__…` columns (NestedGrid's "Related")
   * are not listed and always render last. Export keeps exporting EVERY column.
   *
   * ★ Opt-in by IMPORT, not a boolean as on v8: the drawer (overlay, dialog, focus trap) is ~35 KB
   *   minified / ~10 KB gzip, and a grid that imported it would make EVERY v9 DataGrid bundle carry
   *   it — PCF bundles are one file, so nothing tree-shakes or lazy-loads it. MEASURED vs 0.27.0.
   *   `true` alone warns and adds nothing (there is no panel to open).
   */
  columnChooser?: boolean | V9ColumnChooserPanel<T>;
  /** Notified with the visible column keys (in order) when the chooser applies — persist this… */
  onColumnOrderChange?: (visibleOrder: string[]) => void;
  /**
   * …and pass it back here to restore it (read at mount): its keys show in that order, every other
   * column present at mount starts hidden, a column added later appears. As v8.
   */
  initialVisibleOrder?: string[];
  /**
   * The filter-builder PANEL — pass `GridFilterBuilderV9` (from `@dataverse-kit/grid-kit/v9`) to add a
   * "Filters" toolbar command ("Filters (n)" while n conditions apply) opening a drawer that builds
   * field · operator · value conditions combined with All/Any — the v8 `GridProps.filterBuilder`.
   * The grid filters its in-memory `items`: the rows, the aggregate footer (and `aggregateItems`),
   * export, selection and `Rows: N` all follow it. Text operators match what a cell SHOWS as well as
   * the raw value; optionset / boolean / date / number / currency compare the raw value. Like
   * v8, it filters the `items` you pass — with `pagination` that is one page (a dev warning says so);
   * for server-side filtering read `onFilterChange` and re-query.
   *
   * Whenever the shown rows change — an Apply, a data refresh, columns arriving — the selection is
   * trimmed to the rows still shown (emitted once), so neither `onSelectionChanged` nor export can act
   * on a row the user can no longer see. To do that the grid holds the selection itself, so with a
   * filter panel a selection also SURVIVES an `isLoading` reload (without one, Fluent's grid remounts
   * and restarts from `initialSelectedKeys`).
   *
   * ★ Opt-in by IMPORT, as `columnChooser` (the same drawer). `true` alone warns and adds nothing.
   *   `GroupedGrid` does not take it; NestedGrid's default-look inline mode warns and ignores it.
   */
  filterBuilder?: boolean | V9FilterBuilderPanel<T>;
  /** Notified with the applied model when the filter panel applies — persist this… */
  onFilterChange?: (model: GridFilterModel) => void;
  /**
   * …and pass it back here to restore it (read at mount). A condition filters and counts only while
   * the grid offers its field, so `columns` may arrive after mount; the panel shows only those, and
   * its next Apply drops the rest. Does not fire `onFilterChange`. As v8.
   */
  initialFilterModel?: GridFilterModel;
  /**
   * Per-row commands, surfaced as `rowCommandsDisplay` says: a right-click context menu
   * (default), a trailing "⋯" button column, or both. A row whose every command is hidden
   * (`visible(item) === false`) gets neither — the native browser menu stays intact and its
   * "⋯" cell is empty.
   *
   * Honored by the flat `<DataGrid>`, its `<ReadOnlyGrid>` preset, and the `<NestedGrid>`
   * modes that render through `<DataGrid>` (`side-panel` / `hover-callout` / `detail-pane`,
   * where the "⋯" column follows the "Related" trigger column). Ignored by `<NestedGrid>`
   * `inline` mode and by the card / grouped / focused v9 hosts.
   *
   * NOTE: under `editTrigger: 'always'`, a right-click inside a cell's live editor opens
   * this row menu rather than the browser's native input (cut / copy / paste) menu.
   */
  rowCommands?: V9RowCommand<T>[];
  /**
   * Where `rowCommands` surface:
   * - `'context'` (default) — right-click the row (the behaviour before this prop existed);
   * - `'button'` — a trailing "⋯" column (`ROW_COMMANDS_COLUMN_ID`), never shed: 44px wide in a
   *   non-resizable grid and an initial 44px in a resizable one;
   * - `'both'`.
   *
   * The "⋯" column is the grid's LAST column, so a resizable grid with Fluent's default
   * `autoFitColumns` hands it any spare width — the button stays right-aligned in it. (With
   * `columnFill: 'proportional'` the data columns take the width instead.) Using the button
   * or its menu never selects, activates or navigates the row. In `'both'`, right-clicking the
   * "⋯" button opens the row's right-click menu.
   *
   * Honored by the flat `<DataGrid>`, its `<ReadOnlyGrid>` preset, and the `<NestedGrid>`
   * modes that render through `<DataGrid>` (`side-panel` / `hover-callout` / `detail-pane`,
   * where the "⋯" column follows the "Related" trigger column). Ignored by `<NestedGrid>`
   * `inline` mode and by the card / grouped / focused v9 hosts.
   */
  rowCommandsDisplay?: 'context' | 'button' | 'both';
  /** Row-key accessor (default: `item.key`). */
  getKey?: (item: T) => string;
  /** Fires when a row is focused/clicked (the active row). */
  onActiveItemChanged?: (item: T) => void;
  /** Row-navigation hook (double-click / Enter on a row). */
  onRowNavigate?: (item: T) => void;
  /** Resolve a row → a navigation target; `link`/`lookup` cells open it on click. */
  navigateTo?: (item: T) => NavTarget | undefined;
  /** Compact row height (v9 DataGrid `size="small"`). */
  compact?: boolean;
  /**
   * `'ce'`: the MEASURED stock Dynamics subgrid (a Power Apps grid in a form section — evidence in
   * dynamics-ui-kit `apps/ce-parity/reference/captures/website-sitesettings-subgrid-1710.txt`,
   * metrics in `@dataverse-kit/design-tokens` `ceForm.subgrid`): 42px rows with a `#f0f0f0` rule,
   * a 43px header (42px semibold cells), cell text 12px in, the grid inset 20px left / 32px right,
   * the `layout: 'dynamics'` toolbar's commands 42px tall with quick find on its OWN row below
   * them (180×32, right-aligned), and a "Rows: N" footer when there is no `pagination`.
   * Pair it with surface-kit `Section look="ce"`. Default `'default'` (renders as before).
   * The ce toolbar needs `toolbar.layout: 'dynamics'` (a `'default'` layout toolbar is not
   * restyled). The stock grid always shows `⋮`; here it appears when a command is pinned
   * (`position: 'overflow'`) or overflows, as in the default look.
   * Overrides `compact`. An empty cell is blank, as on the stock subgrid (the default look shows
   * `-`). Command icon size is not measured.
   */
  look?: 'default' | 'ce';
  /**
   * The total row count the `look="ce"` footer shows ("Rows: N") — pass the server's total when
   * `items` is one page. Default `items.length`.
   */
  totalRowCount?: number;
  /** Allow interactive column resizing (v9 `resizableColumns`). Default false. */
  resizableColumns?: boolean;
  /**
   * Options for the v9 resize behaviour, forwarded verbatim to `DataGrid`.
   *
   * ★★★★★ `autoFitColumns` DEFAULTS TO **TRUE** IN FLUENT, AND THAT MAKES RESIZING IMPOSSIBLE IN
   * ANY CONTAINER NARROWER THAN THE COLUMNS NEED — which is every Dataverse subgrid. Every resize
   * action is routed through `adjustColumnWidthsToFitContainer(...)`
   * (`useTableColumnResizeState.js`), so with no slack the new width is clamped straight back and
   * the drag appears to do nothing at all.
   *
   * MEASURED in Chrome against a shipped PCF bundle, same build, only the container width varying:
   *
   * | columns need | container | resize |
   * |---|---|---|
   * | 1024px (6 cols) | 445px — a real subgrid cell | **inert** |
   * | 1400px (6 cols) | 1400px — fits exactly | works |
   * | 588px (3 cols) | 445px | **inert** |
   *
   * Forcing `autoFitColumns: false` at the same 445px: column 0 went 144px → 204px, no other
   * column shrank, and the handle count went 5 → 6 — the last column gains one, exactly as
   * Fluent's `isLastColumn && autoFitColumns ? null : handle` predicts, which is the independent
   * signal that the flag (and not something else) is what changed.
   *
   * ★★ It was reported from a real form as "the columns still don't resize" while every gate was
   * green, because the gates asserted the PLUMBING marker (each header carries a bare
   * `width: Npx`) — true the moment `resizableColumns` is passed, and equally true while every
   * drag is being clamped to zero.
   *
   * ★ Left undefined by default so this is a pure pass-through and no existing consumer changes
   *   behaviour. A grid inside a horizontal scroller wants `{ autoFitColumns: false }`.
   */
  resizableColumnsOptions?: { autoFitColumns?: boolean };
  /**
   * How columns use spare width. `'none'` (default, unchanged): Fluent's own layout — equal
   * flex when not resizable; `width`/`minWidth` as the ideal when resizable. `'proportional'`:
   * the STOCK Dynamics grid rule — each column's `width` (e.g. its view/layoutxml width) is
   * scaled by one common factor to fill the grid, never below that width (a narrow container
   * scrolls horizontally instead). See `fillColumnWidths`.
   *
   * Non-resizable: pure CSS (`flex: <width> 0 <width>px`), no measurement. Resizable: the grid
   * measures its scroll container and feeds the filled widths to Fluent as `idealWidth`, with
   * `autoFitColumns` forced OFF (Fluent's auto-fit would give all spare width to the last
   * column). ★ A container resize refills and so RESETS any widths the user dragged — Fluent
   * resets a column's width whenever its `idealWidth` changes.
   */
  columnFill?: 'none' | 'proportional';
  /** Explicit grid height (number = px, or any CSS value); the body scrolls within. */
  height?: number | string;
  /** Accessible label for the grid. */
  'aria-label'?: string;
}

/**
 * Props for the v9 read-only grid — `<DataGrid>` with selection + editing omitted.
 * A thin preset (the `toolbar` + navigation are still forwarded).
 */
export type V9ReadOnlyGridProps<T = Record<string, unknown>> = Omit<
  V9GridProps<T>,
  'selectionMode' | 'onSelectionChanged' | 'editable' | 'editTrigger' | 'onValueChange'
>;

// ─── Card grid ─────────────────────────────────────────────────────────────────

/**
 * Props for the v9 card-view grid (`<CardGrid>`). Cards are READ-ONLY (no editing,
 * sorting, or aggregates), so this is a focused subset of `V9GridProps` + `card`.
 */
export interface V9CardGridProps<T = Record<string, unknown>> {
  items: T[];
  columns: ColumnDef<T>[];
  /** Card layout (cards-per-row, responsive `minCardWidth`, title/subtitle/image/body fields). */
  card?: CardConfig;
  registry?: GridRegistry;
  selectionMode?: GridSelectionMode;
  onSelectionChanged?: (selectedItems: T[]) => void;
  toolbar?: V9GridToolbarConfig;
  pagination?: GridPaginationState;
  onPageChange?: (page: number) => void;
  onActiveItemChanged?: (item: T) => void;
  navigateTo?: (item: T) => NavTarget | undefined;
  getKey?: (item: T) => string;
  height?: number | string;
}

// ─── Focused-view / master-detail grid ──────────────────────────────────────────

/**
 * Props for the v9 focused-view / master-detail grid (`<FocusedViewGrid>`): a summary
 * rail + a detail pane, with an optional `nested` `mode:'detail-pane'` child grid.
 */
export interface V9FocusedViewGridProps<T = Record<string, unknown>> {
  items: T[];
  columns: ColumnDef<T>[];
  focusedView: FocusedViewConfig;
  /** Optional child grid rendered in the detail pane (nested `mode:'detail-pane'`). */
  nested?: NestedConfig<T>;
  registry?: GridRegistry;
  onActiveItemChanged?: (item: T) => void;
  navigateTo?: (item: T) => NavTarget | undefined;
  getKey?: (item: T) => string;
  height?: number | string;
  /**
   * `'ce'`: the detail pane's child grid (`nested` — the pane's "Related" section for mode `'detail-pane'`, or the
   * whole pane with `focusedView.childOnly`, for any mode) renders as a `DataGrid look="ce"` — the
   * measured stock subgrid. Only the child: the rail and the pane are not a measured stock surface, so they keep
   * their look. Default `'default'`.
   */
  look?: 'default' | 'ce';
}

// ─── Grouped grid ────────────────────────────────────────────────────────────

/**
 * Props for the v9 grouped grid (`<GroupedGrid>`). Buckets rows by `group.groupBy`
 * and renders a v9 `<Accordion>` of per-group `<DataGrid>`s. Selection is aggregated
 * across groups; per-group subtotals are opt-in (`group.showGroupAggregates`).
 */
export interface V9GroupedGridProps<T = Record<string, unknown>> {
  items: T[];
  columns: ColumnDef<T>[];
  group: GroupConfig<T>;
  registry?: GridRegistry;
  selectionMode?: GridSelectionMode;
  onSelectionChanged?: (selectedItems: T[]) => void;
  isLoading?: boolean;
  /** Rows the OVERALL footer aggregates over (cross-page grand totals). Defaults to `items`. */
  aggregateItems?: T[];
  /** Precomputed values for the OVERALL (grand-total) footer. Same semantics as
   *  `V9GridProps.aggregateResults`. Per-group subtotals: see `groupAggregateResults`. */
  aggregateResults?: AggregateValues;
  /**
   * Per-group subtotals supplied by the consumer (e.g. a server `groupby` query), keyed by group key —
   * the `String(value)` of `group.groupBy`, or `BLANK_GROUP_KEY` for the empty group. ★ AUTHORITATIVE:
   * when this is set, a group (or a field/function pair) missing from it renders BLANK — it is never
   * computed from the group's rows, which on a paged or formatted grid are not the group's records.
   * Setting it renders per-group footers whether or not `group.showGroupAggregates` is on. Without
   * `groupAggregateFormatted`, the column's `aggregateFormat` formats a SUPPLIED value only (an absent one
   * stays blank). Groups appear in the order of their first row: order rows by the group field first.
   * Default look only (`look="ce"` has no per-group footers: it warns and ignores this).
   */
  groupAggregateResults?: Record<string, AggregateValues>;
  /**
   * Per-group DISPLAY strings, keyed like `groupAggregateResults`: `{ [groupKey]: { [fieldName]: { sum: '…' } } }`.
   * When set, a group footer cell shows its string here, and a missing entry is BLANK — the column's
   * `aggregateFormat` is not used for group footers (a consumer closure formatting the grand total would
   * otherwise print the grand total in every group). The grand-total footer keeps `aggregateFormat`.
   */
  groupAggregateFormatted?: Record<string, Record<string, Partial<Record<AggregateFunction, string>>>>;
  /** Same as `V9GridProps.sort` — shown on every group grid's header (under `look="ce"`, the one grid's). */
  sort?: V9GridProps['sort'];
  /** Same as `V9GridProps.onSortChange` — a header click in any group. */
  onSortChange?: V9GridProps['onSortChange'];
  /** Same as `V9GridProps.rowCommands` — on every group grid's rows (under `look="ce"`, the one grid's). */
  rowCommands?: V9GridProps<T>['rowCommands'];
  /** Same as `V9GridProps.rowCommandsDisplay`. */
  rowCommandsDisplay?: V9GridProps['rowCommandsDisplay'];
  /** Same as `V9GridProps.onActiveItemChanged` — a row click in any group. */
  onActiveItemChanged?: (item: T) => void;
  /** Same as `V9GridProps.onRowNavigate` — a row double-click in any group. */
  onRowNavigate?: (item: T) => void;
  toolbar?: V9GridToolbarConfig;
  pagination?: GridPaginationState;
  onPageChange?: (page: number) => void;
  compact?: boolean;
  navigateTo?: (item: T) => NavTarget | undefined;
  getKey?: (item: T) => string;
  height?: number | string;
  /**
   * `'ce'`: the MEASURED stock grid grouped at runtime (the Power Apps grid's "Group by" — evidence in
   * dynamics-ui-kit `apps/ce-parity/reference/captures/account-temp-grouped-nested-1710.txt`, metrics
   * in `@dataverse-kit/design-tokens` `ceForm.groupedGrid`). ONE `DataGrid look="ce"` whose group rows
   * sit between its data rows (not an Accordion of grids): a "Group by: <column>" column first (300px),
   * group rows filled `#fafafa` with a chevron and ONE "Label (n)" run; groups ordered as measured —
   * text by label (the server's order for text and choice groups), numbers by value (the stock order
   * is undefined there), the empty-value group first; ALL
   * collapsed unless `group.collapsedByDefault` is `false`, the empty-value group labelled "(blank)",
   * and a group checkbox that selects the group's rows (multiple selection). Space on a focused group
   * row, or a click on its Group-by cell, expands it; Enter moves into the row (to its checkbox, with
   * multiple selection), as on every row, and Escape back out. Single selection has no group
   * checkbox. An empty-string value is its own group (only null/undefined is "(blank)").
   * Dates are grouped by their exact value: the stock grid buckets a date column by Year/Quarter/Month/
   * Week/Day and orders by the column's sort — derive a bucket field (e.g. the day) to group by that.
   * Not under `'ce'`: `group.showGroupAggregates` (per-group subtotals — warned and ignored; the overall
   * aggregate row still shows). Pagination pages the flat row list, so a group can span pages.
   * Default `'default'` (the Accordion, unchanged).
   */
  look?: 'default' | 'ce';
  /** `look="ce"`: the record count the "Rows: N" footer shows. Default `items.length`. */
  totalRowCount?: number;
  /**
   * Same as `V9GridProps.columnFill` (forwarded to every group's grid; under `'ce'`, to the one grid).
   * Default look: the group grids are NOT resizable — each is its own Fluent grid with its own sizing
   * state, so a drag in one could not keep the others (or the grand total) aligned.
   */
  columnFill?: V9GridProps['columnFill'];
  /** `look="ce"`: the grid's accessible name. Default "Grouped grid". */
  'aria-label'?: string;
}

// ─── Nested / expandable grid ────────────────────────────────────────────────

/**
 * Props for the v9 nested / expandable grid (`<NestedGrid>`). Extends `V9GridProps`
 * (the parent grid) with a `nested` config. Modes: `inline` (a manual v9 `<Table>`
 * with an expand chevron), `side-panel` (v9 `OverlayDrawer`), `hover-callout` (v9
 * `Popover`). `parentLayout:'cards'` is a follow-on v9 increment.
 *
 * NOTE (v9 inline scope): in the `inline` mode the parent grid renders read-only —
 * parent-row selection and `nested.childSelectionGating:'requires-parent'` gating are
 * not yet wired (children render as `'independent'`); use the `side-panel` mode's
 * child grid (a full v9 `<DataGrid>`) for parent+child selection today.
 *
 * `look="ce"` + `inline`: the MEASURED stock grid with Child items set (design-tokens
 * `ceForm.nestedGrid`) — ONE `DataGrid look="ce"`, the expander inside the 44px select cell (no extra
 * VISUAL column: in the DOM the select cell narrows to 19.9px and the expander is its own 24.1px column,
 * header named "Expand row"), a 1px rule on top of every row after the first, and each expanded row followed by a detail
 * row holding the child as its own ce grid (own header + "Rows: N", no toolbar). Parent selection works
 * there; row commands and `onActiveItemChanged` do not apply (the inline contract).
 */
export interface V9NestedGridProps<
  T extends Record<string, unknown> = Record<string, unknown>,
  C extends Record<string, unknown> = Record<string, unknown>,
> extends V9GridProps<T> {
  nested: NestedConfig<T, C>;
}
