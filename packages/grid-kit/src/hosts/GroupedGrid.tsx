import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  DetailsListLayoutMode,
  type IDetailsGroupDividerProps,
  type IDetailsRowProps,
  type IObjectWithKey,
  Selection,
  SelectionMode,
  ShimmeredDetailsList,
  Stack,
} from '@fluentui/react';
import { getDetailsListStyles } from '@khester/dynamics-cell-renderers';
import type { GroupedGridProps } from '../types';
import { toDetailsListColumns } from '../adapters';
import { computeAggregates, computeGroupAggregates } from '../core';
import { hasAggregate as declaresAggregate } from '../core/aggregate';
import { shedColumns } from '../core/responsive';
import { useEditState } from './useEditState';
import { useContainerWidth } from './useContainerWidth';
import { useGridContext } from './useGridContext';
import { useRowContextMenu } from './useRowContextMenu';
import { GridToolbar } from './toolbar/GridToolbar';
import { GridPaginationFooter } from './GridPaginationFooter';
import { AggregateRow, ColumnWidthsContext } from './GridAggregateFooter';
import { buildGroups } from './buildGroups';
import { fillStackStyles, FillRegion } from './fill';

function mapSelectionMode(mode?: string): SelectionMode {
  return mode === 'multiple' ? SelectionMode.multiple : mode === 'single' ? SelectionMode.single : SelectionMode.none;
}

// Left offset to align a footer/subtotal under its rows: the selection checkbox column.
const SELECTION_COLUMN_WIDTH = 48;

/**
 * Measure the DetailsList's justified per-column widths (keyed by column key, read
 * off Fluent's `data-item-key` header cells) so the subtotal + grand-total rows can
 * pin each cell to the real body column width instead of guessing. A ResizeObserver
 * re-measures when the grid resizes (columns re-justify); the effect re-runs when the
 * column set changes.
 */
function useHeaderColumnWidths(ref: React.RefObject<HTMLElement>, deps: React.DependencyList): Record<string, number> {
  const [widths, setWidths] = useState<Record<string, number>>({});
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = (): void => {
      const cells = el.querySelectorAll<HTMLElement>('.ms-DetailsHeader [data-item-key]');
      const next: Record<string, number> = {};
      cells.forEach((c) => {
        const k = c.getAttribute('data-item-key');
        if (k) next[k] = c.getBoundingClientRect().width;
      });
      setWidths((prev) => {
        const keys = Object.keys(next);
        const same =
          keys.length === Object.keys(prev).length && keys.every((k) => Math.abs((prev[k] ?? -1) - next[k]) < 0.5);
        return same ? prev : next;
      });
    };
    measure();
    // Observe the REAL header element (the `display:contents` wrapper has no box to
    // observe) so we re-measure when the justified layout settles or columns resize.
    const header = el.querySelector('.ms-DetailsHeader');
    const ro = new ResizeObserver(measure);
    if (header) ro.observe(header);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return widths;
}

/**
 * Grouped grid host. Buckets rows by `group.groupBy` into a contiguous,
 * ordered list and renders a Fluent v8 grouped `DetailsList` (collapsible
 * groups + count badges), reusing the same columns/registry as `<DataGrid>`.
 */
export function GroupedGrid<T extends Record<string, unknown>>(props: GroupedGridProps<T>): JSX.Element {
  const { items, columns, group, selectionMode = 'none', onSelectionChanged, isLoading, pagination, onPageChange, aggregateItems, toolbar, compact, alternateRowColors, fill, height, rowCommands } = props;

  const edit = useEditState();
  const { ctx, getKeyFn } = useGridContext<T>(props, edit);
  // Responsive shedding (see DataGrid): opt-in via ColumnDef.responsivePriority; identity
  // no-op when no column opts in. The per-group subtotals + overall footer use the SAME
  // shed set so their positional cells line up with the body.
  const [rootRef, width] = useContainerWidth<HTMLDivElement>();
  const shedCols = useMemo(() => shedColumns(columns, width), [columns, width]);
  const dlColumns = useMemo(() => toDetailsListColumns(shedCols, ctx), [shedCols, ctx]);
  // Measured justified column widths → pixel-perfect subtotal + grand-total alignment.
  const gridRef = useRef<HTMLDivElement>(null);
  const columnWidths = useHeaderColumnWidths(gridRef, [width, shedCols]);
  // Per-row right-click menu (DetailsList path, same as DataGrid/NestedInline). No-op when
  // rowCommands is unset (onItemContextMenu is undefined → no handler attached).
  const { onItemContextMenu, contextMenuElement } = useRowContextMenu<T>(rowCommands);

  // Fluent Selection so a toolbar's selection-gated commands can read the checked rows via
  // onSelectionChanged. Ported verbatim from <DataGrid> (the grouped DetailsList supports
  // selection + groups together: the Selection is over the flattened `orderedItems`, and
  // group headers select-all per group). `getKey` (= the consumer's getKey via getKeyFn) keys
  // the selection per row; null-safe for enableShimmer placeholder rows. selectionMode='none'
  // (the default) passes no selection → display-only / per-row-menu-only grids are unchanged.
  const safeRowKey = (it: T | undefined, index?: number): string =>
    it == null ? `__gridkit_shimmer_${index ?? 0}` : getKeyFn(it);
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

  // Bucket by groupBy → ordered items + IGroup[] (DetailsList needs contiguous
  // group ranges). See buildGroups (pure + unit-tested).
  const { orderedItems, groups } = useMemo(() => buildGroups(items, group), [items, group]);

  const hasAggregate = columns.some(declaresAggregate);
  // Per-group subtotals: aggregate each group's slice (keyed by group key).
  const groupAggregates = useMemo(
    () =>
      group.showGroupAggregates && hasAggregate
        ? computeGroupAggregates(
            orderedItems,
            groups.map((g) => ({ key: g.key, startIndex: g.startIndex, count: g.count })),
            columns
          )
        : {},
    [group.showGroupAggregates, hasAggregate, orderedItems, groups, columns]
  );
  // Overall footer source: all displayed groups by default, or the full
  // `aggregateItems` dataset for cross-page grand totals. Note: per-group subtotals
  // always aggregate the displayed (page) rows of each group — only the overall
  // footer goes cross-page.
  const footerItems = aggregateItems ?? orderedItems;
  // Left offset for a group subtotal. It spans the full row width (NOT indented by
  // the group chevron), so it uses the SAME offset as the overall footer — adding the
  // chevron width pushed subtotals ~36px right of the grand total. Selection only.
  const groupLeadingSpacer = selectionMode !== 'none' ? SELECTION_COLUMN_WIDTH : 0;
  // Grand total across the full (cross-page) footerItems. Rendered INSIDE the list via
  // onRenderDetailsFooter (below) so it shares the group footers' container and lines up
  // exactly with the per-group subtotals (a sibling footer below the list drifts).
  const footerAggregates = useMemo(
    () => (hasAggregate ? computeAggregates(footerItems, shedCols) : {}),
    [hasAggregate, footerItems, shedCols]
  );

  // Alt-row tint (file-drop isn't supported on grouped grids). Striping is by the
  // flattened row index across groups.
  const onRenderRow = useMemo(
    () =>
      alternateRowColors
        ? (rowProps?: IDetailsRowProps, defaultRender?: (p?: IDetailsRowProps) => JSX.Element | null) => {
            if (!rowProps || !defaultRender) return null;
            return defaultRender({
              ...rowProps,
              styles: {
                root: {
                  backgroundColor:
                    rowProps.itemIndex % 2 === 0 ? alternateRowColors.even : alternateRowColors.odd,
                },
              },
            });
          }
        : undefined,
    [alternateRowColors]
  );

  return (
    <ColumnWidthsContext.Provider value={columnWidths}>
    <Stack styles={fillStackStyles(fill, height)}>
      {/* Zero-height width sentinel (see DataGrid) — drives responsive column shedding. */}
      <div ref={rootRef} aria-hidden="true" style={{ height: 0 }} />
      {toolbar && <GridToolbar config={toolbar} />}
      <FillRegion fill={fill}>
      {/* display:contents → the wrapper adds no box (no layout impact) but gives us a
          ref to measure the DetailsList's justified header-column widths. */}
      <div ref={gridRef} style={{ display: 'contents' }}>
      <ShimmeredDetailsList
        items={orderedItems}
        columns={dlColumns}
        groups={groups}
        selectionMode={mapSelectionMode(selectionMode)}
        selection={selectionMode !== 'none' ? selectionRef.current : undefined}
        getKey={(it, index) => safeRowKey(it as T, index)}
        layoutMode={DetailsListLayoutMode.justified}
        compact={compact}
        setKey="grid-kit-grouped"
        onRenderRow={onRenderRow}
        onRenderDetailsFooter={
          hasAggregate
            ? () => (
                <AggregateRow
                  columns={shedCols}
                  aggregates={footerAggregates}
                  leadingSpacer={groupLeadingSpacer}
                  columnWidths={columnWidths}
                />
              )
            : undefined
        }
        onItemContextMenu={onItemContextMenu as (item?: unknown, index?: number, ev?: Event) => boolean | void}
        styles={getDetailsListStyles()}
        ariaLabelForGrid="Grouped grid"
        groupProps={{
          showEmptyGroups: false,
          // Render a subtotal under each EXPANDED group. Fluent v8 calls the group
          // footer renderer even for collapsed groups, so guard on isCollapsed —
          // otherwise a subtotal floats under a collapsed header whose rows are hidden.
          onRenderFooter:
            group.showGroupAggregates && hasAggregate
              ? (gprops?: IDetailsGroupDividerProps) =>
                  gprops?.group && !gprops.group.isCollapsed ? (
                    <AggregateRow
                      columns={shedCols}
                      aggregates={groupAggregates[gprops.group.key] ?? {}}
                      leadingSpacer={groupLeadingSpacer}
                      background="#f3f2f1"
                    />
                  ) : null
              : undefined,
        }}
        enableShimmer={isLoading}
      />
      </div>
      </FillRegion>
      {contextMenuElement}
      {pagination && <GridPaginationFooter pagination={pagination} onPageChange={onPageChange} />}
    </Stack>
    </ColumnWidthsContext.Provider>
  );
}
