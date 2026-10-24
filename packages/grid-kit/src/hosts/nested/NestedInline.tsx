import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  DetailsListLayoutMode,
  type IColumn,
  type IDetailsRowProps,
  type IObjectWithKey,
  IconButton,
  Selection,
  SelectionMode,
  ShimmeredDetailsList,
  Spinner,
} from '@fluentui/react';
import { getDetailsListStyles } from '@khester/dynamics-cell-renderers';
import type { NestedConfig, NestedGridProps } from '../../types';
import { toDetailsListColumns, GridRenderContext } from '../../adapters';
import { shedColumns } from '../../core/responsive';
import { hasAggregate as declaresAggregate } from '../../core/aggregate';
import { DataGrid } from '../DataGrid';
import { useContainerWidth } from '../useContainerWidth';
import { useRowContextMenu } from '../useRowContextMenu';
import { GridAggregateFooter } from '../GridAggregateFooter';
import { GridPaginationFooter } from '../GridPaginationFooter';
import { useChildren, CHILDREN_LOAD_ERROR, type ChildEntry } from './useChildren';

// Leading control-column widths the parent footer must skip to line up its cells
// with the data columns: the selection checkbox (Fluent default ~48px, present
// only when the parent grid is selectable) and the always-present expand chevron.
const SELECTION_CHECKBOX_WIDTH = 48;
const EXPAND_CHEVRON_WIDTH = 32;

function mapSelectionMode(mode?: string): SelectionMode {
  return mode === 'multiple' ? SelectionMode.multiple : mode === 'single' ? SelectionMode.single : SelectionMode.none;
}

// The lazily-resolved child cache, provided via context so the child region re-renders
// on child-data changes (e.g. an inline edit refreshed via reloadToken) even though
// Fluent's DetailsList caches the parent row and won't re-invoke onRenderRow.
const ChildCacheContext = React.createContext<Record<string, ChildEntry<Record<string, unknown>>>>({});

/**
 * The expanded child region. A context consumer (reads the cache) so it reflects live
 * child-data edits, and rendered for every EVER-expanded row (hidden while collapsed)
 * so the child grid stays mounted → its selection + edit state persist across collapse.
 */
function NestedChildRegion<T extends Record<string, unknown>, C extends Record<string, unknown>>(props: {
  parentKey: string;
  parent: T;
  nested: NestedConfig<T, C>;
  childMode: NestedConfig<T, C>['childSelectionMode'];
  isExpanded: boolean;
}): JSX.Element {
  const { parentKey, parent, nested, childMode, isExpanded } = props;
  const cache = React.useContext(ChildCacheContext);
  const entry = cache[parentKey] as ChildEntry<C> | undefined;
  return (
    <div
      onContextMenu={(e) => e.stopPropagation()}
      style={{
        display: isExpanded ? 'block' : 'none',
        padding: '8px 8px 8px 48px',
        background: '#faf9f8',
        borderBottom: '1px solid #edebe9',
      }}
    >
      {!entry || entry.loading ? (
        <Spinner label="Loading related records…" />
      ) : entry.error !== undefined ? (
        <span role="alert" data-gridkit-children-error="">{CHILDREN_LOAD_ERROR}</span>
      ) : (
        <DataGrid<C>
          items={entry.rows}
          columns={nested.childColumns}
          registry={nested.childRegistry}
          compact
          columnLayout="fixed"
          selectionMode={childMode}
          onSelectionChanged={
            nested.onChildSelectionChanged ? (sel) => nested.onChildSelectionChanged!(parent, sel) : undefined
          }
          editable={nested.childEditable}
          editTrigger={nested.childEditTrigger}
          onValueChange={
            nested.onChildValueChange ? (rk, fn, v, ov) => nested.onChildValueChange!(parent, rk, fn, v, ov) : undefined
          }
        />
      )}
    </div>
  );
}

/**
 * Inline nested grid: a chevron column expands each parent row to reveal its
 * child grid indented beneath (Fluent `onRenderRow`). Children resolve lazily on
 * first expand.
 *
 * Known limitation: an expanded row's height varies with its child grid, which
 * defeats Fluent v8 DetailsList row-height virtualization — fine for typical
 * subgrid sizes; for very large parent lists prefer side-panel / hover-callout.
 */
export function NestedInline<T extends Record<string, unknown>, C extends Record<string, unknown>>(props: {
  parentProps: NestedGridProps<T, C>;
  ctx: GridRenderContext<T>;
  getKeyFn: (it: T) => string;
}): JSX.Element {
  const { parentProps, ctx, getKeyFn } = props;
  const {
    items,
    columns,
    nested,
    selectionMode,
    isLoading,
    compact,
    alternateRowColors,
    pagination,
    onPageChange,
    aggregateItems,
    onSelectionChanged,
    rowCommands,
  } = parentProps;
  const { onItemContextMenu, contextMenuElement } = useRowContextMenu<T>(rowCommands);
  // Responsive shedding (see DataGrid): shed the parent data columns below `md` (opt-in;
  // identity no-op otherwise). Applied to the ColumnDef[] BEFORE the chevron is prepended,
  // so the `__expand` control column is never shed. Width via the sentinel below.
  const [rootRef, width] = useContainerWidth<HTMLDivElement>();
  const shedCols = useMemo(() => shedColumns(columns, width), [columns, width]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // Keys whose child grid has been expanded at least once. We keep those child grids
  // MOUNTED (hidden while collapsed) so their selection + inline-edit state survive a
  // collapse/re-expand instead of being destroyed on unmount. Trade-off: this set grows
  // unbounded (one hidden child grid per ever-expanded row), trading memory for state
  // persistence — for very large parent lists prefer the side-panel / hover-callout modes.
  const [mountedKeys, setMountedKeys] = useState<Set<string>>(new Set());
  const { ensure, cache } = useChildren<T, C>(nested.getChildren, nested.reloadToken);
  // Forward parent-row selection to the consumer (DataGrid does this; inline did
  // not). A ref keeps the once-created Selection's callback from going stale when
  // the prop changes (mirrors DataGrid's onSelectionChangedRef).
  const onSelectionChangedRef = useRef(onSelectionChanged);
  onSelectionChangedRef.current = onSelectionChanged;

  // 'requires-parent' gating: a parent's child grid is only selectable while the
  // parent row is selected. Needs a managed parent Selection (the parent grid
  // must be selectable). Tracks selected parent keys to re-gate children on change.
  const gating = nested.childSelectionGating ?? 'independent';
  const parentSelectable = mapSelectionMode(selectionMode) !== SelectionMode.none;
  const [selectedParentKeys, setSelectedParentKeys] = useState<Set<string>>(new Set());
  const selectionRef = useRef<Selection>();
  if (!selectionRef.current) {
    selectionRef.current = new Selection({
      getKey: (it: IObjectWithKey, index?: number) =>
        it == null ? `__shimmer_${index ?? 0}` : getKeyFn(it as unknown as T),
      onSelectionChanged: () => {
        const sel = selectionRef.current!.getSelection() as unknown as T[];
        setSelectedParentKeys(new Set(sel.map((it) => getKeyFn(it))));
        onSelectionChangedRef.current?.(sel);
      },
    });
  }
  // Surface the silent misconfiguration: gating needs a selectable parent grid.
  React.useEffect(() => {
    if (gating === 'requires-parent' && !parentSelectable && typeof console !== 'undefined') {
      console.warn(
        "[grid-kit] childSelectionGating 'requires-parent' has no effect: the parent grid is not selectable. Set the nested grid's selectionMode to 'single' or 'multiple'."
      );
    }
  }, [gating, parentSelectable]);

  const toggle = useCallback(
    (key: string, item: T) => {
      const willExpand = !expanded.has(key);
      if (willExpand) {
        ensure(key, item);
        // Mark the key as mounted (never unset) so its child grid stays alive.
        setMountedKeys((m) => (m.has(key) ? m : new Set(m).add(key)));
      }
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    },
    [ensure, expanded]
  );

  const dlColumns = useMemo<IColumn[]>(() => {
    const chevron: IColumn = {
      key: '__expand',
      name: '',
      fieldName: '__expand',
      minWidth: 32,
      maxWidth: 32,
      isResizable: false,
      onRender: (item?: T) => {
        if (!item) return null;
        const key = getKeyFn(item);
        const open = expanded.has(key);
        return (
          <IconButton
            iconProps={{ iconName: open ? 'ChevronDown' : 'ChevronRight' }}
            ariaLabel={open ? 'Collapse' : 'Expand'}
            styles={{ root: { height: 28, width: 28 } }}
            onClick={(e) => {
              e.stopPropagation();
              toggle(key, item);
            }}
          />
        );
      },
    };
    return [chevron, ...toDetailsListColumns(shedCols, ctx)];
  }, [shedCols, ctx, expanded, getKeyFn, toggle]);

  const onRenderRow = useCallback(
    (rowProps?: IDetailsRowProps, defaultRender?: (p?: IDetailsRowProps) => JSX.Element | null) => {
      if (!rowProps || !defaultRender) return null;
      const parent = rowProps.item as T;
      const key = getKeyFn(parent);
      // Tint the parent row only (not the expansion wrapper) — pass fresh styles.
      const row = alternateRowColors
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
      // Once expanded, keep the child grid mounted (just hide it while collapsed) so
      // its selection + inline edits survive collapse/re-expand.
      if (!mountedKeys.has(key)) return row;
      const isExpanded = expanded.has(key);
      // requires-parent: child selectable only while THIS parent row is selected.
      const childMode =
        gating === 'requires-parent' && !selectedParentKeys.has(key) ? 'none' : nested.childSelectionMode;
      // NestedChildRegion reads the child data from ChildCacheContext (so inline edits
      // show live despite Fluent's row caching) and is kept mounted while collapsed.
      // (It also stops right-click from bubbling to the parent SelectionZone — the child
      // <DataGrid> renders inside the parent row DOM and its rows carry
      // data-selection-index too, which would otherwise fire the PARENT rowCommands menu
      // for the wrong record.)
      return (
        <div>
          {row}
          <NestedChildRegion<T, C>
            parentKey={key}
            parent={parent}
            nested={nested}
            childMode={childMode}
            isExpanded={isExpanded}
          />
        </div>
      );
    },
    [expanded, mountedKeys, getKeyFn, nested, alternateRowColors, gating, selectedParentKeys]
  );

  // Parent-level footers (mirrors DataGrid): aggregate row when any parent column
  // declares an `aggregate`, then the pager. Aggregates over `aggregateItems`
  // (cross-page grand totals) when given, else the displayed parent rows. The
  // footer cells skip the selection checkbox + expand chevron so they line up
  // with the data columns.
  const hasAggregate = columns.some(declaresAggregate);
  const footerLeadingSpacer =
    (parentSelectable ? SELECTION_CHECKBOX_WIDTH : 0) + EXPAND_CHEVRON_WIDTH;

  return (
    <ChildCacheContext.Provider value={cache}>
      {/* Zero-height width sentinel (see DataGrid) — drives responsive column shedding. */}
      <div ref={rootRef} aria-hidden="true" style={{ height: 0 }} />
      <ShimmeredDetailsList
        items={items}
        columns={dlColumns}
        onRenderRow={onRenderRow}
        selectionMode={mapSelectionMode(selectionMode)}
        selection={parentSelectable ? selectionRef.current : undefined}
        enableShimmer={isLoading}
        layoutMode={DetailsListLayoutMode.justified}
        compact={compact}
        setKey="grid-kit-nested-inline"
        getKey={(it, index) => (it == null ? `__shimmer_${index ?? 0}` : getKeyFn(it as T))}
        onItemContextMenu={onItemContextMenu as (item?: unknown, index?: number, ev?: Event) => boolean | void}
        styles={getDetailsListStyles()}
        ariaLabelForGrid="Nested grid"
      />
      {contextMenuElement}
      {hasAggregate && (
        <GridAggregateFooter
          items={aggregateItems ?? items}
          columns={shedCols}
          leadingSpacer={footerLeadingSpacer}
        />
      )}
      {pagination && <GridPaginationFooter pagination={pagination} onPageChange={onPageChange} />}
    </ChildCacheContext.Provider>
  );
}
