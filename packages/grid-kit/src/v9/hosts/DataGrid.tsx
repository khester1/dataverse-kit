/**
 * The Fluent UI v9 flat / read grid host — the v9 counterpart of the v8 `<DataGrid>`.
 * Built on `@fluentui/react-components`' `DataGrid` primitives; columns come from the
 * v9 `toDataGridColumns` adapter (reusing the shared `buildCellProps` render context),
 * cells from `createV9CellRegistry`. Reuses the pure `core/` responsive `shedColumns`
 * + `useContainerWidth`, and the v9 footers/toolbar.
 *
 * This first increment is READ-only (the flat workhorse): selection, controlled sort,
 * loading, pagination, aggregate footer, responsive column shedding, and a lean
 * toolbar, plus the turnkey `exportConfig` command (`./useV9Export`). DnD and the filter/
 * column-chooser panels (and export's `dialog`) are follow-on v9 increments.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DataGrid as FluentDataGrid,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridBody,
  DataGridRow,
  DataGridCell,
  Skeleton,
  SkeletonItem,
  Menu,
  MenuTrigger,
  MenuPopover,
  createTableColumn,
  makeStyles,
  mergeClasses,
  tokens,
  useIsomorphicLayoutEffect,
  type DataGridProps as FluentDataGridProps,
  type TableRowId,
  type TableColumnSizingOptions,
  type TableColumnId,
} from '@fluentui/react-components';
import type { V9GridProps } from '../types';
import type { ColumnDef, GridRegistry, GridSelectionMode } from '../../types';
import { createV9CellRegistry, editorRefusal } from '../cells/registry';
import { EmptyCellTextContext } from '../cells/util';
import { toDataGridColumns } from '../adapter';
import { defaultGetKey, type GridRenderContext } from '../../adapters/context';
import { shedColumns, hasAggregate, fillColumnWidths } from '../../core';
import { useContainerWidth } from '../../hosts/useContainerWidth';
// useEditState is a Fluent-free React hook (edit buffer / dirty / errors / active
// cell) — reused verbatim by both skins. (useGridContext is NOT reused: it defaults
// to the v8 createCellRegistry, which would pull Fluent v8 into the v9 bundle.)
import { useEditState } from '../../hosts/useEditState';
import { ceForm } from '@dataverse-kit/design-tokens';
import { GridToolbar } from './GridToolbar';
import { useV9Export, EXPORT_COMMAND_KEY } from './useV9Export';
import { ColumnTriple20Regular, ColumnTripleEdit20Regular, Filter20Regular } from '@fluentui/react-icons';
import {
  applyColumnOrder,
  initialColumnChoice,
  isHostColumnKey,
  orderVisibleColumns,
  reconcileColumnChoice,
  type ColumnChoice,
} from '../../core/columnOrder';
import { mergeToolbarCommands } from '../../core/toolbarCommands';
import { activeFilterCount, applyColumnFilters, pruneFilterModel, type GridFilterModel } from '../../core/filter';
import type { V9ColumnChooserPanel, V9FilterBuilderPanel, V9GridCommand, V9GridToolbarConfig } from '../types';
import { GridPaginationFooter, GridAggregateRows } from './footers';
import {
  ROW_COMMANDS_COLUMN_ID,
  ROW_COMMANDS_CONTENT_WIDTH,
  ROW_COMMANDS_WIDTH,
  ROW_COMMANDS_FIXED_STYLE,
  RowCommandMenuList,
  RowCommandsCell,
} from './rowCommands';
import { ExtraRowContext, type ExtraRowContextValue, type RowExtension } from './rowExtension';

/** The v8 key of the injected Columns command, so collision handling ports between skins. */
export const COLUMNS_COMMAND_KEY = '__gridkit_columns__';
/** The v8 key of the injected Filters command. */
export const FILTERS_COMMAND_KEY = '__gridkit_filters__';

const EMPTY_FILTER_MODEL: GridFilterModel = { match: 'all', conditions: [] };

/** Column definitions already warned about, across every grid instance (see the refusal warning). */
const warnedColumns = new WeakSet<object>();

/** Why a column that asks to be edited will render read-only (undefined = it is editable). */
function refusalFor(column: ColumnDef, registry: GridRegistry): string | undefined {
  const reg = registry.get(column.rendererType);
  if (reg && !reg.edit && column.rendererType === 'lookup') {
    // The likeliest opt-in mistake: the editor is opt-in by import, so the DEFAULT registry has none.
    return `lookup column "${column.key}" has editorType "${column.editorType}" but the registry has no lookup editor — import EditableLookupCell from '@dataverse-kit/grid-kit/v9' and pass registry={createV9CellRegistry({ lookup: { read: LookupCell, edit: EditableLookupCell } })}.`;
  }
  return editorRefusal(column, reg);
}
// One-time dev warnings (module-level, as v8's `warnedFilterPaging`).
let warnedFilterPaging = false;
let warnedFilterServerTotals = false;

/** grid-kit selection mode → v9 DataGrid selectionMode (undefined = no selection). */
function v9SelectionMode(mode: GridSelectionMode): FluentDataGridProps['selectionMode'] | undefined {
  if (mode === 'single') return 'single';
  if (mode === 'multiple') return 'multiselect';
  return undefined;
}

/** Skeleton placeholder body shown while `isLoading` (v9 has no ShimmeredDetailsList). */
function GridSkeleton({ colCount, rowCount = 5 }: { colCount: number; rowCount?: number }): JSX.Element {
  return (
    <div role="status" aria-label="Loading data" style={{ padding: '8px 0' }}>
      {Array.from({ length: rowCount }).map((_, r) => (
        <Skeleton key={r} style={{ display: 'flex', gap: 12, padding: '8px 4px' }}>
          {Array.from({ length: Math.max(1, colCount) }).map((_, c) => (
            <SkeletonItem key={c} style={{ flex: 1, height: 16 }} />
          ))}
        </Skeleton>
      ))}
    </div>
  );
}

/**
 * ★★★ Fluent v9 header/body cells carry 8px of horizontal padding on EACH side ON TOP OF the
 * `width` it sets (content-box). MEASURED in real Chrome (verify-aggregate-footer-browser.mjs):
 * every column rendered exactly +16px over the width asked for — so a fill that sets the RENDERED
 * target as the width overflows by 16px per column and skews the ratios (a constant +16 is a
 * bigger fraction of a narrow column). Fill works in RENDERED widths and subtracts this once.
 * ★ A Fluent spacing change moves the rendered widths; the browser gate pins them, so it goes red.
 */
const CELL_HPAD = 16;

/** Fluent's selection cell width (TableSelectionCell CELL_WIDTH — checkbox and radio alike). ONE copy:
 *  the fill arithmetic and the auto-fit offset must agree on it. */
const SELECT_CELL_WIDTH = 44;

// ── look="ce": the MEASURED stock Dynamics subgrid (ceForm.subgrid; evidence in dynamics-ui-kit
//    apps/ce-parity/reference/captures/website-sitesettings-subgrid-1710.txt). Classes, never an
//    inline `style` on a cell: Fluent spreads `style` last, so it would wipe column sizing.
const SG = ceForm.subgrid;
const useCeStyles = makeStyles({
  // Header + rows inset inside the grid root (its ag-root padding); the toolbar spans the root.
  body: { paddingLeft: `${SG.gridPaddingLeft}px`, paddingRight: `${SG.gridPaddingRight}px` },
  // The org's 42px header cells carry the 1px #e0e0e0 rule THEMSELVES (so its text centres in 41px),
  // and the header is 43 — one more pixel below the rule. So: the rule moves onto the cell (41px
  // content + 1px border = 42; min-height is content-box — measured, 42 + 1 put the header at 44),
  // and the row keeps its 1px border, transparent, for the 43rd pixel.
  headerRow: { borderBottomColor: 'transparent' },
  headerCell: {
    minHeight: `${SG.headerCellHeight - 1}px`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    alignItems: 'center',
    paddingLeft: `${SG.cellTextInset}px`,
    paddingRight: `${CELL_HPAD - SG.cellTextInset}px`,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  row: { borderBottomColor: tokens.colorNeutralStroke3 },
  // Cell text 12px in. The horizontal padding still totals CELL_HPAD (12 + 4), so columnFill's
  // content-box arithmetic is unchanged.
  cell: {
    minHeight: `${SG.rowHeight - 1}px`,
    paddingLeft: `${SG.cellTextInset}px`,
    paddingRight: `${CELL_HPAD - SG.cellTextInset}px`,
  },
  // A `flush` leading column (the nested look's expander): its content fills the column.
  flush: { paddingLeft: 0, paddingRight: 0 },
  // A NARROWED select cell: Fluent's checkbox root is 16px + 8px margins each side (32), which would
  // overflow a 19.9px cell into the row's left edge and under the next column (measured: root at −6.05).
  // The root and its hidden input — the click target — fill the cell; the 16px box centres in it
  // (measured +1.95). ★ Do NOT also zero the indicator's side margins: measured, that shrinks the root
  // and the click target to 16px and changes nothing visible.
  narrowSelect: {
    '& .fui-Checkbox': { width: '100%', justifyContent: 'center' },
    '& .fui-Checkbox__input': { width: '100%' },
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    minHeight: `${SG.footerHeight}px`,
    paddingLeft: `${SG.gridPaddingLeft}px`,
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
    color: tokens.colorNeutralForeground2,
  },
});

/** The extension context, only when there is an extension (the plain grid's tree is unchanged). */
function MaybeExtraRowProvider({ value, children }: { value: ExtraRowContextValue | undefined; children: React.ReactNode }): JSX.Element {
  return value ? <ExtraRowContext.Provider value={value}>{children}</ExtraRowContext.Provider> : <>{children}</>;
}

/** A column's base (e.g. view/layoutxml) width — what `columnFill` scales from, and the resizable ideal. */
function baseWidth(c: { width?: number; minWidth?: number }): number {
  return c.width ?? c.minWidth ?? 120;
}

export function DataGrid<T extends Record<string, unknown>>(props: V9GridProps<T>): JSX.Element {
  return <DataGridInner<T> {...props} />;
}

/**
 * INTERNAL: the grid itself, plus an optional `rowExtension` (extra rows + a leading column) for the
 * v9 hosts built on ONE grid (GroupedGrid `look="ce"`). Without an extension every branch below is the
 * plain `DataGrid` path (pinned by the baseline markup snapshots).
 */
export function DataGridInner<T extends Record<string, unknown>>(
  props: V9GridProps<T> & { rowExtension?: RowExtension<T> },
): JSX.Element {
  const {
    items,
    columns,
    registry: registryProp,
    selectionMode = 'none',
    onSelectionChanged,
    initialSelectedKeys,
    editable,
    editTrigger,
    onValueChange,
    isLoading,
    sort,
    onSortChange,
    pagination,
    onPageChange,
    aggregateItems,
    aggregateResults,
    toolbar,
    exportConfig,
    columnChooser,
    onColumnOrderChange,
    initialVisibleOrder,
    filterBuilder,
    onFilterChange,
    initialFilterModel,
    rowCommands,
    rowCommandsDisplay = 'context',
    getKey,
    onActiveItemChanged,
    onRowNavigate,
    navigateTo,
    compact,
    resizableColumns,
    resizableColumnsOptions,
    columnFill = 'none',
    height,
    look = 'default',
    totalRowCount,
    rowExtension: ext,
  } = props;
  const lead = ext?.leadingColumn;
  // ★ The leading column's RESIZABLE sizing (its columnSizingOptions entry, cellStyle's resizable leg,
  //   and the auto-fit offset's select-width + flush terms) is gated by the nested resizable auto-fit
  //   story in ce-parity — possible since #439 made a flat ce grid's auto-fit fill its content box.
  /** The leading column's CONTENT width (Fluent sizes the content box; see CELL_HPAD). */
  const leadContent = lead ? (lead.flush ? lead.width : Math.max(1, lead.width - CELL_HPAD)) : 0;
  // The select column's width when an extension narrows it (Fluent's is 44, via min/max-width on its
  // flex layout — a slot `style` overrides those without touching column sizing).
  const selectWidth = ext?.selectCellWidth ?? SELECT_CELL_WIDTH;
  const selectCellStyle = useMemo<React.CSSProperties | undefined>(
    () => (ext?.selectCellWidth === undefined ? undefined : { minWidth: selectWidth, maxWidth: selectWidth, width: selectWidth }),
    [ext?.selectCellWidth, selectWidth],
  );
  const ce = look === 'ce';
  const ceStyles = useCeStyles();

  const defaultRegistry = useMemo(() => createV9CellRegistry(), []);
  const registry = registryProp ?? defaultRegistry;
  // A column that asks to be edited but renders read-only says why — once: per column KEY within a grid
  // (an inline `columns={[…]}` is a new array every render) AND per column OBJECT across grids (nested child
  // grids share one `childColumns` definition; N expanded parents must not warn N times).
  const refusals = editable
    ? columns
        .filter((c) => c.editorType && c.editorType !== 'none' && !c.isLocked)
        .map((c) => [c, refusalFor(c as ColumnDef, registry)] as const)
        .filter((r): r is readonly [ColumnDef<T>, string] => !!r[1])
    : [];
  const refusalKey = refusals.map(([c, r]) => `${c.key}\u0000${r}`).join('\n');
  const warnedRefusals = useRef(new Set<string>());
  useEffect(() => {
    for (const [column, reason] of refusals) {
      if (warnedRefusals.current.has(column.key) || warnedColumns.has(column)) continue;
      warnedRefusals.current.add(column.key);
      warnedColumns.add(column);
      console.warn(`[grid-kit/v9] ${reason}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by the refusal SET, not the array identity
  }, [refusalKey]);
  const getKeyFn = getKey ?? defaultGetKey;
  const getRowId = useCallback((item: T): TableRowId => getKeyFn(item), [getKeyFn]);
  const edit = useEditState();
  const trigger = editTrigger ?? 'click';

  // Responsive column shedding — reuses the pure core primitive (identity no-op unless
  // a column declares responsivePriority AND the container is narrow).
  const [rootRef, width] = useContainerWidth<HTMLDivElement>();
  // Column chooser (`core/columnOrder`, shared with v8): visible keys + every key seen, reconciled
  // DURING RENDER so a new `columns` array with the same keys is a no-op (hidden stays hidden). The
  // projection runs BEFORE shedding, so the footer, sizing, fill and the lead/⋯ columns follow it.
  // Opt-in by IMPORT (see `V9GridProps.columnChooser`): the grid never imports the drawer itself.
  const ChooserPanel = typeof columnChooser === 'function' || (typeof columnChooser === 'object' && columnChooser !== null)
    ? (columnChooser as V9ColumnChooserPanel<T>)
    : undefined;
  const chooserMissingPanel = columnChooser === true;
  useEffect(() => {
    if (chooserMissingPanel) {
      console.warn("[grid-kit/v9] columnChooser={true} needs the panel: import { GridColumnChooserV9 } from '@dataverse-kit/grid-kit/v9' and pass columnChooser={GridColumnChooserV9}. (It is opt-in so grids that do not use it do not carry it.)");
    }
  }, [chooserMissingPanel]);
  const [storedChoice, setChoice] = useState<ColumnChoice>(() => initialColumnChoice(columns, initialVisibleOrder));
  const choice = reconcileColumnChoice(storedChoice, columns);
  if (choice !== storedChoice) setChoice(choice);
  const viewColumns = useMemo(
    () => (ChooserPanel ? orderVisibleColumns(columns, choice.order) : columns),
    [ChooserPanel, columns, choice.order],
  );
  const choosableColumns = useMemo(() => columns.filter((c) => !isHostColumnKey(c.key)), [columns]);
  const [chooserOpen, setChooserOpen] = useState(false);
  const shedCols = useMemo(() => shedColumns(viewColumns, width), [viewColumns, width]);

  // Filter builder — opt-in by IMPORT, as the chooser. The row SET changes (the chooser only projects
  // columns), so `effectiveItems` feeds the Fluent grid, selection, export, the aggregate footer and
  // `Rows: N` alike. A condition on a field the grid does not offer neither filters nor counts, and the
  // panel only ever sees offered ones, so its next Apply drops the rest (`core/filter`, shared with v8).
  // Filtering reads ALL `columns` — hiding a column in the chooser never drops its filter.
  const FilterPanel = typeof filterBuilder === 'function' || (typeof filterBuilder === 'object' && filterBuilder !== null)
    ? (filterBuilder as V9FilterBuilderPanel<T>)
    : undefined;
  const filterMissingPanel = filterBuilder === true;
  useEffect(() => {
    if (filterMissingPanel) {
      console.warn("[grid-kit/v9] filterBuilder={true} needs the panel: import { GridFilterBuilderV9 } from '@dataverse-kit/grid-kit/v9' and pass filterBuilder={GridFilterBuilderV9}. (It is opt-in so grids that do not use it do not carry it.)");
    }
  }, [filterMissingPanel]);
  const [filterModel, setFilterModel] = useState<GridFilterModel>(() => initialFilterModel ?? EMPTY_FILTER_MODEL);
  const [filterOpen, setFilterOpen] = useState(false);
  const effectiveItems = useMemo(
    () => (FilterPanel ? applyColumnFilters(items, filterModel, columns) : items),
    [FilterPanel, items, filterModel, columns],
  );
  const filterCount = useMemo(() => (FilterPanel ? activeFilterCount(filterModel, columns) : 0), [FilterPanel, filterModel, columns]);
  const panelFilterModel = useMemo(() => pruneFilterModel(filterModel, columns), [filterModel, columns]);
  useEffect(() => {
    if (FilterPanel && pagination && !warnedFilterPaging) {
      warnedFilterPaging = true;
      console.warn(
        '[grid-kit/v9] filterBuilder filters the in-memory `items` (the current page when paginated), ' +
          'so rows on other pages are not considered. Pass the full dataset for client-side filtering, or for ' +
          'server-side filtering, read onFilterChange and re-query instead.',
      );
    }
  }, [FilterPanel, pagination]);
  // Server totals cannot be re-computed for a filtered row set — say so once rather than show them as if
  // they were filtered.
  const serverTotalsUnderFilter = filterCount > 0 && !!aggregateResults && Object.keys(aggregateResults).length > 0;
  useEffect(() => {
    if (serverTotalsUnderFilter && !warnedFilterServerTotals) {
      warnedFilterServerTotals = true;
      console.warn('[grid-kit/v9] aggregateResults are precomputed and are NOT filtered by filterBuilder — the footer shows them unfiltered while a filter applies.');
    }
  }, [serverTotalsUnderFilter]);

  const gridColumns = useMemo(() => {
    const ctx: GridRenderContext<T> = {
      registry,
      editable,
      editTrigger: trigger,
      getKey: getKeyFn,
      sort,
      onSortChange,
      navigateTo,
      // Per-cell edit-state (threaded from useEditState). Only the active cell is in
      // edit mode with trigger 'click'; 'always' puts every editable cell in edit mode.
      isEditing: (rk, fn) => !!editable && (trigger === 'always' || edit.isActiveCell(rk, fn)),
      isDirty: edit.isDirty,
      getEditedValue: edit.getEditedValue,
      getError: edit.getError,
      onValueChange: (rk, fn, v, ov) => {
        edit.onValueChange(rk, fn, v, ov);
        onValueChange?.(rk, fn, v, ov);
      },
      onValidationError: edit.onValidationError,
      onEditStart: (rk, fn) => edit.setActiveCell(rk, fn),
      onEditEnd: () => edit.clearActiveCell(),
    };
    return toDataGridColumns(shedCols, ctx);
  }, [registry, editable, trigger, getKeyFn, sort, onSortChange, navigateTo, shedCols, edit, onValueChange]);

  // Row commands: which surfaces are on. The "⋯" column is appended AFTER shedding (never shed)
  // and depends only on `showRowButton` — its cell is rendered in the body from the row's own
  // filtered command array, so a fresh `rowCommands` array per render does not rebuild columns.
  const hasRowCommands = (rowCommands?.length ?? 0) > 0;
  const showRowButton = hasRowCommands && rowCommandsDisplay !== 'context';
  const showRowContext = hasRowCommands && rowCommandsDisplay !== 'button';
  const leadColumnId = lead?.columnId;
  const allColumns = useMemo(() => {
    const withTrailing = showRowButton
      ? [
          ...gridColumns,
          createTableColumn<T>({
            columnId: ROW_COMMANDS_COLUMN_ID,
            renderHeaderCell: () => null,
            renderCell: () => null,
          }),
        ]
      : gridColumns;
    // The leading column renders through the header/body branches below, like the "⋯" column.
    return leadColumnId === undefined
      ? withTrailing
      : [createTableColumn<T>({ columnId: leadColumnId, renderHeaderCell: () => null, renderCell: () => null }), ...withTrailing];
  }, [gridColumns, showRowButton, leadColumnId]);

  const v9Selection = v9SelectionMode(selectionMode);
  const controlled = ext?.selection;
  // ★ With a filter panel the grid OWNS an otherwise-uncontrolled selection: applying a filter must
  //   trim the selection to the rows still shown, and Fluent's uncontrolled selection cannot be set
  //   from outside (a remount would reset it). Without the trim, a row the user filtered out stays
  //   selected — `onSelectionChanged` and export would act on a row nobody can see. A host that
  //   controls selection itself (an extension) is left untouched.
  const ownSelection = !!FilterPanel && !!v9Selection && !controlled;
  const [ownSelected, setOwnSelected] = useState<Set<TableRowId>>(() => new Set<TableRowId>(initialSelectedKeys ?? []));

  // Turnkey export (`exportConfig`) — merged into the toolbar the way v8 merges its injected
  // commands (first in the default layout, last in dynamics). With no `toolbar`, one is
  // synthesized; under `look="ce"` THAT one is the dynamics layout (a default-layout bar renders
  // unstyled there). A consumer's own toolbar keeps its layout — enabling export must not
  // restyle it.
  const toolbarLayout = toolbar ? (toolbar.layout ?? 'default') : ce ? 'dynamics' : 'default';
  const { commands: exportCommands, onUncontrolledSelection: onExportSelection } = useV9Export<T>({
    exportConfig,
    // You export what the filter shows (v8 rule).
    items: effectiveItems,
    columns,
    getRowId,
    selectable: !!v9Selection,
    controlledSelected: (controlled?.selected ?? (ownSelection ? ownSelected : undefined)) as ReadonlySet<TableRowId> | undefined,
    initialSelectedKeys,
    isLoading,
    layout: toolbarLayout,
  });
  // "Columns" (`columnChooser`) — opens the chooser drawer; its button is the drawer's focus-restore
  // target. Under look="ce" it is "Edit columns" (the repo's own name for the Dynamics feature).
  const columnsCommands = useMemo<V9GridCommand[]>(
    () =>
      ChooserPanel
        ? [
            {
              key: COLUMNS_COMMAND_KEY,
              text: ce ? 'Edit columns' : 'Columns',
              icon: ce ? <ColumnTripleEdit20Regular /> : <ColumnTriple20Regular />,
              onClick: () => setChooserOpen(true),
              restoreFocusTarget: true,
            },
          ]
        : [],
    [ChooserPanel, ce],
  );
  // "Filters" (`filterBuilder`) — "Filters (n)" while n conditions apply (the kit's own convention: no
  // capture of the stock filter UI exists, so no parity claim).
  const filtersCommands = useMemo<V9GridCommand[]>(
    () =>
      FilterPanel
        ? [
            {
              key: FILTERS_COMMAND_KEY,
              text: filterCount ? `Filters (${filterCount})` : 'Filters',
              icon: <Filter20Regular />,
              onClick: () => setFilterOpen(true),
              restoreFocusTarget: true,
            },
          ]
        : [],
    [FilterPanel, filterCount],
  );
  // Collisions PER FEATURE: a consumer command on one feature's key (export: `__gridkit_export__`
  // or a per-format `__gridkit_export__csv`; columns: `__gridkit_columns__`; filters:
  // `__gridkit_filters__`) suppresses THAT feature only — never another — and only while it is on.
  // Listed in v8's injected order: export, columns, filters.
  const consumerKeys = useMemo(() => new Set((toolbar?.commands ?? []).map((c) => c.key)), [toolbar?.commands]);
  const features = [
    {
      commands: exportCommands,
      collides: consumerKeys.has(EXPORT_COMMAND_KEY) || exportCommands.some((c) => consumerKeys.has(c.key)),
      warning: `toolbar already has a '${EXPORT_COMMAND_KEY}…' command — exportConfig's Export is not added.`,
    },
    { commands: columnsCommands, collides: consumerKeys.has(COLUMNS_COMMAND_KEY), warning: `toolbar already has a '${COLUMNS_COMMAND_KEY}' command — columnChooser's Columns is not added.` },
    { commands: filtersCommands, collides: consumerKeys.has(FILTERS_COMMAND_KEY), warning: `toolbar already has a '${FILTERS_COMMAND_KEY}' command — filterBuilder's Filters is not added.` },
  ].map((f) => ({ ...f, collides: f.commands.length > 0 && f.collides }));
  // One string per render, so the effect fires when the SET of collisions changes — not every render —
  // and each warning prints once per grid, not again whenever another feature starts colliding.
  const collisionWarnings = features.filter((f) => f.collides).map((f) => f.warning).join('\n');
  const warnedCollisions = useRef(new Set<string>());
  useEffect(() => {
    if (!collisionWarnings) return;
    for (const w of collisionWarnings.split('\n')) {
      if (warnedCollisions.current.has(w)) continue;
      warnedCollisions.current.add(w);
      console.warn(`[grid-kit/v9] ${w}`);
    }
  }, [collisionWarnings]);
  const injected = features.flatMap((f) => (f.collides ? [] : f.commands));
  const effectiveToolbar = useMemo<V9GridToolbarConfig | undefined>(() => {
    if (!injected.length) return toolbar;
    const commands = mergeToolbarCommands(toolbar?.commands ?? [], injected, toolbarLayout);
    return toolbar ? { ...toolbar, commands } : { layout: toolbarLayout, commands };
    // `injected` is rebuilt every render; its parts are the real inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolbar, exportCommands, columnsCommands, filtersCommands, collisionWarnings, toolbarLayout]);
  const onSelectionChange = useCallback<NonNullable<FluentDataGridProps['onSelectionChange']>>(
    (_e, data) => {
      const set = data.selectedItems as Set<TableRowId>;
      // Controlled (an extension's group checkbox): the extension owns the state AND the emission.
      if (controlled) {
        controlled.onChange(new Set(set));
        return;
      }
      if (ownSelection) setOwnSelected(new Set(set));
      onExportSelection(set);
      // Resolved against `items`: a hidden key cannot reach a click — the trim effect below removed it
      // when it was hidden (one site).
      onSelectionChanged?.(items.filter((it) => set.has(getRowId(it))));
    },
    [items, getRowId, onSelectionChanged, controlled, onExportSelection, ownSelection],
  );
  const applyFilterModel = useCallback(
    (m: GridFilterModel) => {
      setFilterModel(m);
      onFilterChange?.(m);
    },
    [onFilterChange],
  );
  // ★ THE one site that keeps a hidden row out of an owned selection. It runs on every change of the
  //   SHOWN rows — an Apply, a seeded `initialFilterModel` hiding an `initialSelectedKeys` row, a data
  //   refresh moving a selected row out of the filter, columns arriving so a seeded condition starts to
  //   apply — not only on Apply (a first version trimmed on Apply alone, and the other three leaked a
  //   hidden key into `onSelectionChanged`). It drops only keys whose row IS in `items` but is not
  //   shown: a seeded key whose row has not arrived yet stays pending. Skipped while loading (Fluent's
  //   grid is unmounted and `items` may be a placeholder). Emitted once, only when something is dropped.
  useEffect(() => {
    if (!ownSelection || isLoading || ownSelected.size === 0) return;
    const shown = new Set(effectiveItems.map(getRowId));
    const hidden = new Set(items.map(getRowId).filter((k) => !shown.has(k)));
    if (![...ownSelected].some((k) => hidden.has(k))) return;
    const trimmed = new Set([...ownSelected].filter((k) => !hidden.has(k)));
    setOwnSelected(trimmed);
    onExportSelection(trimmed);
    onSelectionChanged?.(items.filter((it) => trimmed.has(getRowId(it))));
    // Re-run on the SHOWN set only: a selection change cannot add a hidden key (Fluent selects shown rows).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveItems, isLoading, ownSelection]);
  // Uncontrolled initial selection (restore-on-remount for side-panel/drawer children).
  const defaultSelectedItems = useMemo(
    () => (initialSelectedKeys && initialSelectedKeys.length ? new Set<TableRowId>(initialSelectedKeys) : undefined),
    [initialSelectedKeys],
  );

  // Proportional fill (`columnFill: 'proportional'`) — the stock grid's rule. Measured on the
  // SCROLL container (its contentRect excludes a vertical scrollbar, so a bounded grid does not
  // grow a horizontal one). Only the resizable path needs the number; the non-resizable path
  // is pure CSS flex (see `fillCellStyle`).
  const fill = columnFill === 'proportional';
  const [fillRef, fillWidth] = useContainerWidth<HTMLDivElement>();
  const filledWidths = useMemo<Record<string, number> | undefined>(() => {
    if (!fill || !resizableColumns) return undefined;
    // The selection cell is a fixed 44px (Fluent's TableSelectionCell) in every row.
    const available =
      fillWidth - (v9SelectionMode(selectionMode) ? selectWidth : 0) - (showRowButton ? ROW_COMMANDS_WIDTH : 0) - (lead ? lead.width : 0);
    const w = fillColumnWidths(shedCols.map(baseWidth), available);
    // `w` is RENDERED widths; Fluent's width is the content box (see CELL_HPAD).
    return Object.fromEntries(shedCols.map((c, i) => [c.key, Math.max(1, w[i] - CELL_HPAD)]));
  }, [fill, resizableColumns, fillWidth, selectionMode, shedCols, showRowButton, lead, selectWidth]);

  // ★★ A pure REORDER (same columns, new order — the chooser's Move up/down) is invisible to Fluent:
  //   `columnDefinitionsToState` returns its OLD state array, in the OLD order, when the count and every
  //   column's sizing option are unchanged (react-table `utils/columnResizeUtils.js`), and auto-fit then
  //   stretches (or, overflowing, shrinks) by that stale order — so the old last column stays wide in the
  //   middle. MEASURED in Chrome (ce-parity `columns.spec.mjs`): after moving Revenue up, City (now last)
  //   was 136px wide. The lever: each column's idealWidth carries its POSITION as a sub-pixel offset
  //   (i × 0.001px), so ANY change of order changes some column's option and Fluent rebuilds its state in
  //   the new order. (A first version nudged only the last column, alternating per reorder; review showed
  //   the alternation was unobservable and a reorder that keeps the last column was not covered.)
  //   Not a remount (`key`): that would reset the uncontrolled selection export reads. Dragged widths do
  //   NOT survive a reorder either way — Fluent keeps a drag in its state's idealWidth and resets it when
  //   the options change, which predates this. Auto-fit only: without it state order is irrelevant.
  const autoFit = !!resizableColumns && !fill && resizableColumnsOptions?.autoFitColumns !== false;
  const POSITION_EPSILON = autoFit ? 0.001 : 0;

  // Respect column min widths when the grid is resizable.
  const columnSizingOptions = useMemo<TableColumnSizingOptions | undefined>(() => {
    if (!resizableColumns) return undefined;
    const opts: TableColumnSizingOptions = {};
    shedCols.forEach((c, i) => {
      opts[c.key] = { minWidth: c.minWidth ?? 80, idealWidth: (filledWidths?.[c.key] ?? baseWidth(c)) + i * POSITION_EPSILON };
    });
    // ★ Unlisted, Fluent would size the "⋯" column at ideal 150 / min 100.
    if (showRowButton) {
      opts[ROW_COMMANDS_COLUMN_ID] = { minWidth: ROW_COMMANDS_CONTENT_WIDTH, idealWidth: ROW_COMMANDS_CONTENT_WIDTH };
    }
    if (leadColumnId !== undefined) opts[leadColumnId] = { minWidth: leadContent, idealWidth: leadContent };
    return opts;
  }, [resizableColumns, shedCols, filledWidths, showRowButton, leadColumnId, leadContent, POSITION_EPSILON]);
  // ★ Fluent auto-fits resizable columns to the grid's PARENT element's BORDER box (useMeasureElement:
  //   `el.parentElement.getBoundingClientRect().width`), but the columns live in its CONTENT box. The
  //   difference — the parent's "chrome" — is what they overflowed by: under look="ce" the subgrid inset
  //   (MEASURED: a 1596px content box held a 1648px grid, +52), and in EITHER look a classic vertical
  //   scrollbar when the grid has a `height` and enough rows to scroll. Measured, not assumed, so both are
  //   covered: border box − content box, read straight off the element at layout time (so the FIRST paint
  //   is right, not one ResizeObserver round-trip later) and again whenever `fillWidth` — the content box,
  //   which shrinks when a scrollbar appears — changes. The border box is read with getBoundingClientRect,
  //   the same reading Fluent takes, so a CSS transform cancels out; hence no clamp at 0 (scale < 1 makes
  //   it negative, correctly). Not caught: a border-box change with an UNCHANGED content box (the parent
  //   widening by exactly a scrollbar in the same frame) — corrected on the next resize.
  //   Seeded with the ce inset for SSR / an unlaid-out first render.
  //   (No wrapper element: that would change the ce markup the baseline snapshots pin.)
  const [parentChrome, setParentChrome] = useState(() => (ce ? SG.gridPaddingLeft + SG.gridPaddingRight : 0));
  useIsomorphicLayoutEffect(() => {
    const el = fillRef.current;
    if (!el || el.clientWidth === 0) return; // not laid out (jsdom, display:none): keep the seed
    const cs = getComputedStyle(el);
    const content = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const chrome = el.getBoundingClientRect().width - content;
    setParentChrome((prev) => (Math.abs(prev - chrome) > 0.01 ? chrome : prev));
  }, [fillRef, fillWidth]);
  // An explicit offset REPLACES Fluent's own −44-for-selection default, so the select cell is included.
  // With no chrome (no inset, no scrollbar) and no flush column the offset is left to Fluent — so a
  // default-look grid is unchanged unless it actually has a scrollbar to correct for. (The flush /
  // narrowed-select-cell terms come only from `rowExtension`, which only ce hosts pass today.)
  const resizeOffset =
    resizableColumns && (Math.abs(parentChrome) > 0.01 || lead?.flush || ext?.selectCellWidth !== undefined)
      ? -parentChrome -
        (v9SelectionMode(selectionMode) ? selectWidth : 0) +
        // Fluent's auto-fit counts CELL_HPAD of padding for EVERY sized column (MEASURED: Σ widths
        // 1480.1 + 6 × 16 = its 1576.1 target); a `flush` leading column has none, so it renders 16px
        // less than Fluent counted — give that back or the columns end 16px short.
        (lead?.flush ? CELL_HPAD : 0)
      : undefined;
  // Fill owns the widths: Fluent's auto-fit would re-hand all spare width to the last column.
  const effectiveResizeOptions = fill && resizableColumns ? { ...resizableColumnsOptions, autoFitColumns: false } : resizableColumnsOptions;

  // Non-resizable fill: grow in proportion to the base width, never shrink below it. Applied to
  // header, body AND footer cells so all three stay aligned. ★ Only when NOT resizable — a
  // `style` on a resizable cell REPLACES Fluent's sizing style (useDataGridCell spreads props last).
  const fillCellStyle = useMemo<((key: string) => React.CSSProperties | undefined) | undefined>(() => {
    if (!fill || resizableColumns) return undefined;
    const bases = Object.fromEntries(shedCols.map((c) => [c.key, baseWidth(c)]));
    // grow ∝ base, basis = base − padding ⇒ rendered = base × (available ÷ Σbase), exactly: the
    // free space is shared by the grow factors and each cell's padding restores its 16px.
    return (key: string) => {
      const b = bases[key];
      if (!b) return undefined;
      const content = Math.max(1, b - CELL_HPAD);
      return { flex: `${b} 0 ${content}px`, minWidth: content };
    };
  }, [fill, resizableColumns, shedCols]);
  // ★★ Spread, never `style={maybeUndefined}`: Fluent spreads `...props` AFTER its sizing props,
  // so even an explicit `style: undefined` WIPES the column width of a resizable grid.
  // The "⋯" column is fixed in EVERY non-resizable grid (fill or not); a resizable grid sizes it
  // through `columnSizingOptions` instead.
  // The leading column is fixed the same way.
  const cellStyle = useMemo<((key: string) => React.CSSProperties | undefined) | undefined>(() => {
    if (resizableColumns || (!showRowButton && leadColumnId === undefined)) return fillCellStyle;
    const leadStyle: React.CSSProperties = { flex: `0 0 ${leadContent}px`, minWidth: leadContent };
    return (key: string) =>
      key === ROW_COMMANDS_COLUMN_ID && showRowButton
        ? ROW_COMMANDS_FIXED_STYLE
        : key === leadColumnId
          ? leadStyle
          : fillCellStyle?.(key);
  }, [resizableColumns, showRowButton, fillCellStyle, leadColumnId, leadContent]);
  const fillProps = (columnId: TableColumnId): { style?: React.CSSProperties } => {
    const style = cellStyle?.(String(columnId));
    return style ? { style } : {};
  };

  // Read off shedCols — the footer's column source. Shedding never drops an aggregate column, but the
  // column chooser can HIDE one, so this is NOT `columns.some(...)`.
  const hasAggregates = shedCols.some(hasAggregate);
  // The first DISPLAYED row (an extension rules every row after it; a filter can remove `items[0]`).
  const firstRowId = effectiveItems.length > 0 ? getRowId(effectiveItems[0]) : undefined;
  // The displayed (filtered) rows by default, or `aggregateItems` (cross-page grand totals) with the
  // active filter applied to it too — the v8 rule.
  const aggregateSource = useMemo(
    () => (aggregateItems ? (FilterPanel ? applyColumnFilters(aggregateItems, filterModel, columns) : aggregateItems) : effectiveItems),
    [aggregateItems, FilterPanel, filterModel, columns, effectiveItems],
  );

  // Ctrl+End: Fluent focuses the last focusable in the LAST `[role="row"]` — with the footer
  // inside the grid that is a total row with nothing focusable, so the key would do nothing.
  // Run first (our onKeyDown precedes Fluent's) and target the last BODY row; preventDefault
  // makes Fluent's own handler stand down.
  // With an extension it also runs without aggregates (an extra row — a collapsed group's header —
  // may be last, and is then the target itself). A nested look's detail row — and the child grid in it —
  // is never the target: Ctrl+End stays in the parent grid.
  const onCtrlEndSkipFooter = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!e.ctrlKey || e.key !== 'End') return;
    const grid = e.currentTarget;
    // Bounded to THIS grid: a child grid inside a parent's detail row must still see its own rows.
    const inOwn = (el: Element, sel: string): boolean => {
      const hit = el.closest(sel);
      return !!hit && grid.contains(hit);
    };
    // (Ctrl+End pressed INSIDE a detail row never reaches here: the nested host stops it at the detail
    //  cell — one authoritative site, so the rule stays testable.)
    const rows = [...grid.querySelectorAll<HTMLElement>('[role="row"]')].filter(
      // `closest` includes the element itself: the detail row AND every row inside its child grid.
      (r) => !inOwn(r, '[data-gridkit-aggregate-footer]') && !inOwn(r, '[data-gridkit-detail-row]'),
    );
    const last = rows[rows.length - 1];
    if (!last) return;
    const focusables = [...last.querySelectorAll<HTMLElement>('[tabindex]')].filter((el) => el.tabIndex >= 0);
    const target = focusables[focusables.length - 1] ?? (last.tabIndex >= 0 ? last : undefined);
    if (!target) return;
    e.preventDefault();
    target.focus();
  }, []);

  // What an extension's extra rows read to line their cells up with this grid's columns.
  const extraRowValue = useMemo<ExtraRowContextValue | undefined>(
    () =>
      ext
        ? {
            columnIds: allColumns.map((c) => String(c.columnId)),
            leadingColumnId: leadColumnId,
            cellProps: (columnId: TableColumnId) => {
              const style = cellStyle?.(String(columnId));
              return style ? { style } : {};
            },
            selectable: !!v9Selection,
            selectCellStyle,
            selectCellClassName: selectCellStyle ? ceStyles.narrowSelect : undefined,
            multiselect: v9Selection === 'multiselect',
            ce,
          }
        : undefined,
    [ext, allColumns, leadColumnId, cellStyle, v9Selection, ce, selectCellStyle, ceStyles.narrowSelect],
  );

  const rootStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    ...(height !== undefined ? { height, minHeight: 0 } : {}),
  };

  const grid = (
    <div style={rootStyle} data-gridkit-look={look}>
      {/* Zero-height width sentinel driving responsive column shedding. */}
      <div ref={rootRef} aria-hidden="true" style={{ height: 0 }} />
      {effectiveToolbar && <GridToolbar config={effectiveToolbar} look={look} />}
      {/* Outside the isLoading branch: a reload must not unmount an open chooser. */}
      {ChooserPanel && (
        <ChooserPanel
          open={chooserOpen}
          onClose={() => setChooserOpen(false)}
          columns={choosableColumns}
          visibleOrder={choice.order}
          title={ce ? 'Edit columns' : 'Columns'}
          onApply={(order) => {
            const next = applyColumnOrder(columns, order);
            if (next.order.length === 0) return; // only stale keys: never apply an empty grid
            setChoice(next);
            onColumnOrderChange?.([...next.order]);
          }}
        />
      )}
      {FilterPanel && (
        <FilterPanel open={filterOpen} onClose={() => setFilterOpen(false)} columns={columns} model={panelFilterModel} onApply={applyFilterModel} title="Edit filters" />
      )}
      <div
        ref={fillRef}
        className={ce ? ceStyles.body : undefined}
        style={height !== undefined ? { flex: 1, minHeight: 0, overflow: 'auto' } : undefined}
      >
        {isLoading ? (
          <GridSkeleton colCount={shedCols.length + (showRowButton ? 1 : 0) + (lead ? 1 : 0)} rowCount={Math.min(8, Math.max(3, pagination?.pageSize ?? 5))} />
        ) : (
          <MaybeExtraRowProvider value={extraRowValue}>
          <FluentDataGrid
            items={effectiveItems}
            columns={allColumns}
            getRowId={getRowId}
            selectionMode={v9Selection}
            defaultSelectedItems={v9Selection && !controlled && !ownSelection ? defaultSelectedItems : undefined}
            {...(v9Selection && controlled ? { selectedItems: controlled.selected as Set<TableRowId> } : {})}
            {...(ownSelection ? { selectedItems: ownSelected } : {})}
            onSelectionChange={v9Selection ? onSelectionChange : undefined}
            size={compact && !ce ? 'small' : 'medium'}
            resizableColumns={resizableColumns}
            columnSizingOptions={columnSizingOptions}
            {...(effectiveResizeOptions ? { resizableColumnsOptions: effectiveResizeOptions } : {})}
            {...(resizeOffset !== undefined ? { containerWidthOffset: resizeOffset } : {})}
            focusMode="composite"
            onKeyDown={hasAggregates || ext ? onCtrlEndSkipFooter : undefined}
            aria-label={props['aria-label'] ?? 'Grid'}
          >
            {!ext?.hideHeader && (
            <DataGridHeader>
              <DataGridRow
                className={ce ? ceStyles.headerRow : undefined}
                {...(v9Selection
                  ? { selectionCell: { 'aria-label': 'Select all rows', ...(selectCellStyle ? { style: selectCellStyle, className: ceStyles.narrowSelect } : {}) } }
                  : {})}
              >
                {({ renderHeaderCell, columnId }) =>
                  lead && columnId === lead.columnId ? (
                    <DataGridHeaderCell
                      aside={null}
                      {...(lead.headerAriaLabel ? { 'aria-label': lead.headerAriaLabel } : {})}
                      className={mergeClasses(ce && ceStyles.headerCell, lead.flush && ceStyles.flush)}
                      {...fillProps(columnId)}
                    >
                      {lead.renderHeader()}
                    </DataGridHeaderCell>
                  ) : columnId === ROW_COMMANDS_COLUMN_ID ? (
                    // `aside={null}`: no resize handle on a fixed column (props spread after sizing).
                    <DataGridHeaderCell
                      aria-label="Row commands"
                      aside={null}
                      className={ce ? ceStyles.headerCell : undefined}
                      {...fillProps(columnId)}
                    />
                  ) : (
                    <DataGridHeaderCell className={ce ? ceStyles.headerCell : undefined} {...fillProps(columnId)}>
                      {renderHeaderCell()}
                    </DataGridHeaderCell>
                  )
                }
              </DataGridRow>
            </DataGridHeader>
            )}
            <DataGridBody<T>>
              {({ item, rowId }) => {
                // ★ The ONE visibility site: this row's commands, filtered once, feed both the
                // "⋯" cell and the right-click menu.
                const cmds = hasRowCommands ? rowCommands!.filter((c) => c.visible?.(item) !== false) : [];
                const row = (
                  <DataGridRow<T>
                    key={rowId}
                    className={ext?.rowClassName ? mergeClasses(ce && ceStyles.row, ext.rowClassName(item, rowId === firstRowId)) : ce ? ceStyles.row : undefined}
                    {...(v9Selection
                      ? { selectionCell: { 'aria-label': 'Select row', ...(selectCellStyle ? { style: selectCellStyle, className: ceStyles.narrowSelect } : {}) } }
                      : {})}
                    onClick={onActiveItemChanged ? () => onActiveItemChanged(item) : undefined}
                    onDoubleClick={onRowNavigate ? () => onRowNavigate(item) : undefined}
                  >
                    {({ renderCell, columnId }) =>
                      lead && columnId === lead.columnId ? (
                        <DataGridCell
                          focusMode="none"
                          className={mergeClasses(ce && ceStyles.cell, lead.flush && ceStyles.flush)}
                          {...fillProps(columnId)}
                        >
                          {lead.renderCell(item)}
                        </DataGridCell>
                      ) : columnId === ROW_COMMANDS_COLUMN_ID ? (
                        // focusMode "none": the button is the cell's only tab stop. No ce text-cell
                        // padding here: the ⋯ button keeps its own (unmeasured) layout.
                        <DataGridCell focusMode="none" {...fillProps(columnId)}>
                          <RowCommandsCell commands={cmds} item={item} />
                        </DataGridCell>
                      ) : (
                        <DataGridCell className={ce ? ceStyles.cell : undefined} {...fillProps(columnId)}>
                          {renderCell(item)}
                        </DataGridCell>
                      )
                    }
                  </DataGridRow>
                );
                // Per-row right-click context menu (v9 counterpart of the v8
                // `useRowContextMenu`). When no command survives for this row, the bare row is used
                // so the native browser menu stays intact.
                // `<Menu openOnContext>` renders no DOM of its own (a context provider), and
                // `<MenuTrigger>` under `openOnContext` clones ONLY the cursor/context handlers
                // (id / ref / onContextMenu / onMouse*) onto the row — it does NOT add
                // `aria-haspopup` / a toggle `onClick` / `onKeyDown`, so the row's role /
                // roving tabindex / selection / click-to-edit are untouched; the popover
                // portals only while open. `openOnContext` opens on right-click only,
                // positions at the cursor, and preventDefaults the native menu. (The <Menu>
                // carries the row's key when wrapped; the inner row key is then inert.)
                const dataRow =
                  !showRowContext || cmds.length === 0 ? (
                    row
                  ) : (
                    <Menu key={rowId} openOnContext>
                      <MenuTrigger disableButtonEnhancement>{row}</MenuTrigger>
                      <MenuPopover>
                        <RowCommandMenuList commands={cmds} item={item} />
                      </MenuPopover>
                    </Menu>
                  );
                if (!ext) return dataRow;
                // An extension's rows. ALWAYS the same three slots, so collapsing a group (hidden)
                // or opening a detail row never changes the element type around the extra row —
                // which would remount it and drop keyboard focus from the row being toggled.
                const hidden = ext.hidden?.(item) ?? false;
                return (
                  <React.Fragment key={rowId}>
                    {ext.before?.(item) ?? null}
                    {hidden ? null : dataRow}
                    {hidden ? null : (ext.after?.(item) ?? null)}
                  </React.Fragment>
                );
              }}
            </DataGridBody>
            {/* Aggregate rows INSIDE the grid: each cell joins the grid's column sizing, so the
                footer stays aligned after a resize and scrolls horizontally with the body. */}
            {hasAggregates && (
              <GridAggregateRows
                items={aggregateSource}
                columns={shedCols}
                selectable={!!v9Selection}
                aggregateResults={aggregateResults}
                sticky={height !== undefined}
                cellStyle={cellStyle}
                trailingColumnId={showRowButton ? ROW_COMMANDS_COLUMN_ID : undefined}
                leadingColumnId={leadColumnId}
                selectCellStyle={selectCellStyle}
              />
            )}
          </FluentDataGrid>
          </MaybeExtraRowProvider>
        )}
      </div>
      {pagination && <GridPaginationFooter pagination={pagination} onPageChange={onPageChange} />}
      {ce && !pagination && !isLoading && (
        <div className={ceStyles.footer}>
          {/* One span, one string: `Rows: {n}` would be two text nodes. */}
          <span data-gridkit-row-count="">{`Rows: ${filterCount > 0 ? effectiveItems.length : (totalRowCount ?? items.length)}`}</span>
        </div>
      )}
    </div>
  );
  // look="ce": an empty cell is blank, as on the stock subgrid; otherwise the '-' placeholder.
  return <EmptyCellTextContext.Provider value={ce ? '' : '-'}>{grid}</EmptyCellTextContext.Provider>;
}
