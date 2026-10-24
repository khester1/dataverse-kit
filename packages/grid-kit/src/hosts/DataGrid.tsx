import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DetailsListLayoutMode,
  type IDetailsFooterProps,
  type IDetailsRowProps,
  type IObjectWithKey,
  Selection,
  SelectionMode,
  ShimmeredDetailsList,
  Stack,
} from '@fluentui/react';
import { computeAggregates } from '../core';
import { hasAggregate as declaresAggregate } from '../core/aggregate';
import { getDetailsListStyles } from '@khester/dynamics-cell-renderers';
import type { GridCommand, GridProps, GridSelectionMode, GridToolbarConfig, RowFileDropConfig } from '../types';
import { toDetailsListColumns } from '../adapters';
import { exportGrid, GridExportDialog } from '../export';
import { navigateToTarget } from '../navigation/navigateTo';
import { useFileDrop } from '../dnd/useFileDrop';
import { useEditState } from './useEditState';
import { useGridContext } from './useGridContext';
import { useRowContextMenu } from './useRowContextMenu';
import { GridToolbar } from './toolbar/GridToolbar';
import { GridPaginationFooter } from './GridPaginationFooter';
import { AggregateRow } from './GridAggregateFooter';
import { GridColumnChooser } from './GridColumnChooser';
import {
  applyColumnOrder,
  initialColumnChoice,
  isHostColumnKey,
  orderVisibleColumns,
  reconcileColumnChoice,
  type ColumnChoice,
} from '../core/columnOrder';
import { GridFilterBuilder } from './GridFilterBuilder';
import {
  applyColumnFilters,
  activeFilterCount as countActiveFilters,
  pruneFilterModel,
  type GridFilterModel,
} from '../core/filter';
import { shedColumns } from '../core/responsive';
import { mergeToolbarCommands } from '../core/toolbarCommands';
import { fillStackStyles, FillRegion } from './fill';
import { useContainerWidth } from './useContainerWidth';

/** Wraps a rendered DetailsList row as a file-drop target. */
function RowFileDropTarget<T>({
  item,
  config,
  children,
}: {
  item: T;
  config: RowFileDropConfig<T>;
  children: React.ReactNode;
}): JSX.Element {
  const { isDragOver, dragProps } = useFileDrop({
    onDrop: (files) => config.onDrop(item, files),
    accept: config.accept,
    multiple: config.multiple,
    onReject: config.onReject ? (reason) => config.onReject!(item, reason) : undefined,
  });
  return (
    // role="presentation" so the wrapper doesn't add a node to the grid's ARIA
    // row structure — the DetailsRow inside keeps role="row".
    <div {...dragProps} role="presentation" style={{ position: 'relative' }}>
      {children}
      {isDragOver && (
        // Drawn ON TOP of the row: the DetailsRow's own background would otherwise
        // cover a tint applied to this wrapper (behind it), which made the old
        // highlight barely visible. pointer-events:none so drag/drop still reaches the
        // wrapper. Blue tint + dashed outline + left accent = a clear "drop here".
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: 'rgba(0,120,212,0.16)',
            outline: '2px dashed #0078d4',
            outlineOffset: '-2px',
            boxShadow: 'inset 3px 0 0 0 #0078d4',
          }}
        />
      )}
    </div>
  );
}

// One-time dev warning: client-side filtering over a consumer-pre-sliced page is
// inconsistent with pagination.totalItems. Fired once per process.
let warnedFilterPaging = false;

const EMPTY_FILTER_MODEL: GridFilterModel = { match: 'all', conditions: [] };

function mapSelectionMode(mode: GridSelectionMode): SelectionMode {
  switch (mode) {
    case 'single':
      return SelectionMode.single;
    case 'multiple':
      return SelectionMode.multiple;
    case 'none':
    default:
      return SelectionMode.none;
  }
}

/**
 * Flat / editable grid host built on Fluent v8 `ShimmeredDetailsList`. Columns
 * come from the registry via `toDetailsListColumns`; inline edit-state from
 * `useEditState` (per-cell click-to-edit by default). Card / grouped / nested
 * layouts are separate hosts that reuse the same registry + render context.
 */
export function DataGrid<T extends Record<string, unknown>>(props: GridProps<T>): JSX.Element {
  const {
    items,
    columns,
    selectionMode = 'none',
    onSelectionChanged,
    initialSelectedKeys,
    columnLayout,
    isLoading,
    pagination,
    onPageChange,
    aggregateItems,
    toolbar,
    onActiveItemChanged,
    compact,
    rowFileDrop,
    exportConfig,
    alternateRowColors,
    navigateTo,
    onRowNavigate,
    rowCommands,
    columnChooser,
    onColumnOrderChange,
    initialVisibleOrder,
    filterBuilder,
    onFilterChange,
    initialFilterModel,
    fill,
    height,
  } = props;

  const edit = useEditState();
  const { getKeyFn, ctx } = useGridContext<T>(props, edit);
  const { onItemContextMenu, contextMenuElement } = useRowContextMenu<T>(rowCommands);

  // Null-safe row key: with `enableShimmer`, Fluent calls getKey on UNDEFINED
  // placeholder rows — never let a consumer's getKey (e.g. `r => r.key`) crash
  // on those during loading.
  const safeRowKey = (it: T | undefined, index?: number): string =>
    it == null ? `__gridkit_shimmer_${index ?? 0}` : getKeyFn(it);

  // Fluent Selection so consumers can read selected rows via onSelectionChanged.
  const onSelectionChangedRef = useRef(onSelectionChanged);
  onSelectionChangedRef.current = onSelectionChanged;
  const selectionRef = useRef<Selection>();
  if (!selectionRef.current) {
    selectionRef.current = new Selection({
      getKey: (it: IObjectWithKey, index?: number) => safeRowKey(it as unknown as T, index),
      onSelectionChanged: () =>
        onSelectionChangedRef.current?.(selectionRef.current!.getSelection() as unknown as T[]),
    });
  }

  // Apply an uncontrolled INITIAL selection once (restore-on-remount for a side-panel
  // child grid). Gated on the inputs that could make the Selection's items ready
  // (`items`) so it doesn't re-run on every commit; the ref makes it apply-once.
  const initialSelApplied = useRef(false);
  useEffect(() => {
    if (initialSelApplied.current || !initialSelectedKeys?.length) return;
    const sel = selectionRef.current;
    if (!sel || sel.getItems().length === 0) return;
    initialSelApplied.current = true;
    initialSelectedKeys.forEach((k) => sel.setKeySelected(k, true, false));
  }, [initialSelectedKeys, items]);

  // Column chooser: the visible+ordered keys PLUS every key seen (`core/columnOrder`, shared with
  // v9). Reconciled DURING RENDER against the current `columns` — so a new array with the same keys
  // is a no-op (hidden stays hidden; the old reconcile re-appended hidden keys as "new"), and a new
  // key shows up in the same frame rather than one effect later.
  const [storedChoice, setChoice] = useState<ColumnChoice>(() => initialColumnChoice(columns, initialVisibleOrder));
  const choice = reconcileColumnChoice(storedChoice, columns);
  if (choice !== storedChoice) setChoice(choice);
  const visibleOrder = choice.order as string[];
  const [columnChooserOpen, setColumnChooserOpen] = useState(false);
  const effectiveColumns = useMemo(
    () => (columnChooser ? orderVisibleColumns(columns, visibleOrder) : columns),
    [columnChooser, columns, visibleOrder]
  );
  const choosableColumns = useMemo(() => columns.filter((c) => !isHostColumnKey(c.key)), [columns]);

  // Filter builder: the applied model + the filtered row set. Filtering changes
  // the row SET (unlike the chooser's purely-visual column projection), so
  // effectiveItems feeds the list, aggregate footer, AND export scope together.
  // Seeded from `initialFilterModel`. ONE rule covers columns arriving after mount, a seed naming a
  // field the grid does not offer, and a field removed later: `applyColumnFilters`/`countActiveFilters`
  // ignore a condition whose field is not offered, and the panel only ever sees the offered ones — so
  // its next Apply drops the rest. (No separate seed-time prune: it would be a second copy of the rule.)
  const [filterModel, setFilterModel] = useState<GridFilterModel>(() => initialFilterModel ?? EMPTY_FILTER_MODEL);
  const [filterBuilderOpen, setFilterBuilderOpen] = useState(false);
  const effectiveItems = useMemo(
    () => (filterBuilder ? applyColumnFilters(items, filterModel, columns) : items),
    [filterBuilder, items, filterModel, columns]
  );
  const activeFilterCount = useMemo(() => countActiveFilters(filterModel, columns), [filterModel, columns]);
  // The panel edits only rows it can show; applying it drops a removed field's condition for good.
  const panelFilterModel = useMemo(() => pruneFilterModel(filterModel, columns), [filterModel, columns]);
  // Footer aggregate source: the displayed (filtered) page by default, or the full
  // `aggregateItems` dataset for cross-page grand totals — with the active filter
  // applied to it too, so the grand total reflects the filter across all pages.
  const aggregateSource = useMemo(
    () =>
      aggregateItems ? (filterBuilder ? applyColumnFilters(aggregateItems, filterModel, columns) : aggregateItems) : effectiveItems,
    [aggregateItems, filterBuilder, filterModel, columns, effectiveItems]
  );
  useEffect(() => {
    if (filterBuilder && pagination && !warnedFilterPaging && typeof console !== 'undefined') {
      warnedFilterPaging = true;
      console.warn(
        '[grid-kit] filterBuilder filters the in-memory `items` (the current page when paginated), ' +
          'so the visible/footer/export counts can disagree with pagination.totalItems. For ' +
          'server-side filtering, read onFilterChange and re-query instead.'
      );
    }
  }, [filterBuilder, pagination]);

  // Responsive column shedding: below the `md` container width, low-priority columns
  // are dropped (opt-in via ColumnDef.responsivePriority; identity no-op otherwise, so
  // a grid with no priorities is byte/behavior-identical). Runs AFTER the chooser
  // projection. The aggregate footer is fed the SAME shed set so its positional cells
  // stay aligned with the body. Width is measured by the zero-height sentinel below.
  const [rootRef, width] = useContainerWidth<HTMLDivElement>();
  const shedCols = useMemo(() => shedColumns(effectiveColumns, width), [effectiveColumns, width]);
  const dlColumns = useMemo(() => toDetailsListColumns(shedCols, ctx), [shedCols, ctx]);

  // Turnkey export. selectionRef.getSelection() is safe even when selectionMode
  // is 'none' (returns []). Scope: 'all' = every row; 'selected' = only the
  // selection (no-op when empty / not selectable); default = selection if any,
  // else all.
  // NOTE: export uses the FULL `columns`, independent of the column chooser's
  // on-screen visibility — you export the whole dataset; the export dialog has
  // its own column picker for narrowing the output. Rows, however, DO honor the
  // filter builder (`effectiveItems`) — you export what the filter shows.
  const exportFormats = exportConfig?.formats ?? ['csv', 'json'];
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const scopedRows = useCallback((): T[] => {
    const selected = (selectionRef.current?.getSelection() ?? []) as unknown as T[];
    if (exportConfig?.scope === 'all') return effectiveItems;
    if (exportConfig?.scope === 'selected') return selected;
    return selected.length > 0 ? selected : effectiveItems;
  }, [effectiveItems, exportConfig]);
  const doExport = useCallback(
    (format: 'csv' | 'json') => {
      const rows = scopedRows();
      if (rows.length === 0) return;
      exportGrid(rows, columns, format, exportConfig?.filename);
    },
    [columns, exportConfig, scopedRows]
  );
  const exportCommand: GridCommand | undefined = !exportConfig?.enabled
    ? undefined
    : exportConfig.dialog
    ? {
        // Dialog mode — a single "Export…" button opening the column/format picker.
        key: '__gridkit_export__',
        text: 'Export…',
        iconName: 'Download',
        onClick: () => setExportDialogOpen(true),
      }
    : {
        key: '__gridkit_export__',
        text: 'Export',
        iconName: 'Download',
        split: exportFormats.length > 1,
        onClick: () => doExport(exportFormats[0]),
        subMenuProps:
          exportFormats.length > 1
            ? {
                items: exportFormats.map((f) => ({
                  key: f,
                  text: f.toUpperCase(),
                  iconProps: { iconName: f === 'csv' ? 'ExcelDocument' : 'Code' },
                  onClick: () => doExport(f),
                })),
              }
            : undefined,
      };
  // "Open" navigation command — navigates the selected row (else the active one).
  const activeItemRef = useRef<T | undefined>(undefined);
  const openCommand: GridCommand | undefined = navigateTo
    ? {
        key: '__gridkit_open__',
        text: 'Open',
        iconName: 'OpenInNewWindow',
        onClick: () => {
          const selected = (selectionRef.current?.getSelection() ?? []) as unknown as T[];
          const target = selected[0] ?? activeItemRef.current;
          if (!target) return;
          const nav = navigateTo(target);
          if (nav) void navigateToTarget(nav);
        },
      }
    : undefined;
  // "Columns" command — opens the column chooser panel.
  const columnsCommand: GridCommand | undefined = columnChooser
    ? {
        key: '__gridkit_columns__',
        text: 'Columns',
        iconName: 'ColumnOptions',
        onClick: () => setColumnChooserOpen(true),
      }
    : undefined;
  // "Filters" command — opens the filter builder panel (shows the active count).
  const filtersCommand: GridCommand | undefined = filterBuilder
    ? {
        key: '__gridkit_filters__',
        text: activeFilterCount ? `Filters (${activeFilterCount})` : 'Filters',
        iconName: 'Filter',
        onClick: () => setFilterBuilderOpen(true),
      }
    : undefined;
  const injectedCommands: GridCommand[] = [
    exportCommand,
    openCommand,
    columnsCommand,
    filtersCommand,
  ].filter(Boolean) as GridCommand[];
  const effectiveToolbar: GridToolbarConfig | undefined =
    toolbar || injectedCommands.length
      ? { ...toolbar, commands: mergeToolbarCommands(toolbar?.commands ?? [], injectedCommands, toolbar?.layout) }
      : undefined;

  // Compose alternate-row tint + whole-row file-drop into ONE onRenderRow (both
  // want it). Return undefined when neither is set so Fluent uses its optimized
  // default-row path. Tint by passing fresh `styles` to defaultRender — never
  // mutate rowProps.styles (it is optional and may be a style function).
  const onRenderRow = useMemo(
    () =>
      rowFileDrop || alternateRowColors
        ? (rowProps?: IDetailsRowProps, defaultRender?: (p?: IDetailsRowProps) => JSX.Element | null) => {
            if (!rowProps || !defaultRender) return null;
            const rendered = alternateRowColors
              ? defaultRender({
                  ...rowProps,
                  styles: {
                    root: {
                      backgroundColor:
                        rowProps.itemIndex % 2 === 0 ? alternateRowColors.even : alternateRowColors.odd,
                    },
                  },
                })
              : defaultRender(rowProps);
            return rowFileDrop ? (
              <RowFileDropTarget<T> item={rowProps.item as T} config={rowFileDrop}>
                {rendered}
              </RowFileDropTarget>
            ) : (
              rendered
            );
          }
        : undefined,
    [rowFileDrop, alternateRowColors]
  );

  // Aggregate footer rendered INSIDE the DetailsList via onRenderDetailsFooter, so
  // its cells pin to each column's justified `calculatedWidth` (perfect alignment)
  // instead of guessing widths from a sibling row below the list.
  const hasAggregates = effectiveColumns.some(declaresAggregate);
  const footerAggregates = useMemo(
    () => (hasAggregates ? computeAggregates(aggregateSource, shedCols) : {}),
    [hasAggregates, aggregateSource, shedCols]
  );
  const onRenderDetailsFooter = useMemo(
    () =>
      hasAggregates
        ? (footerProps?: IDetailsFooterProps): JSX.Element => {
            const widths: Record<string, number> = {};
            footerProps?.columns.forEach((c) => {
              if (c.key) widths[c.key] = c.calculatedWidth ?? c.currentWidth ?? 0;
            });
            return (
              <AggregateRow
                columns={shedCols}
                aggregates={footerAggregates}
                columnWidths={widths}
                leadingSpacer={selectionMode !== 'none' ? 48 : 0}
              />
            );
          }
        : undefined,
    [hasAggregates, shedCols, footerAggregates, selectionMode]
  );

  return (
    <Stack styles={fillStackStyles(fill, height)}>
      {/* Zero-height sentinel: a full-width block whose ResizeObserver reports the
          grid's container width WITHOUT wrapping the Stack (which would break the
          `fill` flex-height contract). Drives responsive column shedding. */}
      <div ref={rootRef} aria-hidden="true" style={{ height: 0 }} />
      {effectiveToolbar && <GridToolbar config={effectiveToolbar} />}
      <FillRegion fill={fill}>
      <ShimmeredDetailsList
        items={effectiveItems}
        columns={dlColumns}
        selectionMode={mapSelectionMode(selectionMode)}
        selection={selectionMode !== 'none' ? selectionRef.current : undefined}
        enableShimmer={isLoading}
        layoutMode={columnLayout === 'fixed' ? DetailsListLayoutMode.fixedColumns : DetailsListLayoutMode.justified}
        compact={compact}
        getKey={(it, index) => safeRowKey(it as T, index)}
        setKey="grid-kit"
        onRenderRow={onRenderRow}
        onRenderDetailsFooter={onRenderDetailsFooter}
        onActiveItemChanged={(item, index) => {
          activeItemRef.current = item as T;
          onActiveItemChanged?.(item as T, index);
        }}
        onItemInvoked={onRowNavigate ? (item) => onRowNavigate(item as T) : undefined}
        onItemContextMenu={onItemContextMenu as (item?: unknown, index?: number, ev?: Event) => boolean | void}
        styles={getDetailsListStyles()}
        ariaLabelForShimmer="Loading data"
        ariaLabelForGrid="Grid"
      />
      </FillRegion>
      {contextMenuElement}
      {pagination && <GridPaginationFooter pagination={pagination} onPageChange={onPageChange} />}
      {exportConfig?.dialog && (
        <GridExportDialog
          isOpen={exportDialogOpen}
          onClose={() => setExportDialogOpen(false)}
          items={exportDialogOpen ? scopedRows() : []}
          columns={columns}
          defaultFilename={exportConfig.filename}
          formats={exportFormats}
        />
      )}
      {columnChooser && (
        <GridColumnChooser<T>
          isOpen={columnChooserOpen}
          onClose={() => setColumnChooserOpen(false)}
          columns={choosableColumns}
          visibleOrder={visibleOrder}
          onApply={(order) => {
            const next = applyColumnOrder(columns, order);
            // A working copy of only STALE keys filters to nothing — never apply an empty grid.
            if (next.order.length === 0) return;
            setChoice(next);
            onColumnOrderChange?.([...next.order]);
          }}
        />
      )}
      {filterBuilder && (
        <GridFilterBuilder<T>
          isOpen={filterBuilderOpen}
          onClose={() => setFilterBuilderOpen(false)}
          columns={columns}
          model={panelFilterModel}
          onApply={(m) => {
            setFilterModel(m);
            onFilterChange?.(m);
          }}
        />
      )}
    </Stack>
  );
}
