/**
 * The Fluent UI v9 grouped grid host — the v9 counterpart of the v8 `<GroupedGrid>`.
 * v9's DataGrid has NO native grouping primitive (unlike the v8 DetailsList `IGroup[]`),
 * so this buckets rows by `group.groupBy` (via the Fluent-free `bucketGroups`) and renders
 * a v9 `<Accordion>` — one collapsible `<AccordionItem>` per group, each hosting a v9
 * `<DataGrid>` over that group's row slice. Collapse/expand + count badges + per-group
 * select-all come from the Accordion + each group's own DataGrid for free.
 *
 * Selection is OWNED by the host (one set of row keys across every group; each group grid is
 * controlled with its share), so it survives a reload and is pruned when rows leave `items`; single
 * selection is one row across all groups. Expansion is controlled by group key for the same reason.
 * Per-group subtotals: computed from each group's rows (`group.showGroupAggregates`), or SUPPLIED and
 * authoritative (`groupAggregateResults` + `groupAggregateFormatted` — a server `groupby`, where the
 * group's rows on this page are not the group). Sort, row commands and row clicks reach every group
 * grid. The grand total is a headerless, row-less grid with the same columns, inside the scroller.
 * Group grids are not resizable (each has its own sizing state, so a drag could not keep them aligned).
 *
 * `look="ce"` is a different structure: ONE grid with interleaved group rows (`GroupedGridCe`).
 */
import React, { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Accordion, AccordionItem, AccordionHeader, AccordionPanel, tokens, type TableRowId } from '@fluentui/react-components';
import { ceForm } from '@dataverse-kit/design-tokens';
import type { ColumnDef } from '../../types';
import type { V9GroupedGridProps } from '../types';
import { defaultGetKey } from '../../adapters/context';
import { bucketGroups, BLANK_GROUP_KEY } from './buildGroups';
import { hasAggregate as declaresAggregate, aggregateList } from '../../core';
import type { AggregateFunction, AggregateValues } from '../../core';
import { DataGrid, DataGridInner } from './DataGrid';
import { CeGroupRow } from './ceGroupRow';
import type { RowExtension } from './rowExtension';
import { GridToolbar } from './GridToolbar';
import { GridPaginationFooter } from './footers';

export function GroupedGrid<T extends Record<string, unknown>>(props: V9GroupedGridProps<T>): JSX.Element {
  // Two structures, chosen once per mount by `look` (never switch it on a mounted grid).
  return props.look === 'ce' ? <GroupedGridCe<T> {...props} /> : <GroupedGridAccordion<T> {...props} />;
}

function GroupedGridAccordion<T extends Record<string, unknown>>(props: V9GroupedGridProps<T>): JSX.Element {
  const {
    items,
    columns,
    group,
    registry,
    selectionMode = 'none',
    onSelectionChanged,
    isLoading,
    aggregateItems,
    aggregateResults,
    groupAggregateResults,
    groupAggregateFormatted,
    toolbar,
    pagination,
    onPageChange,
    compact,
    navigateTo,
    getKey,
    height,
    columnFill,
    sort,
    onSortChange,
    rowCommands,
    rowCommandsDisplay,
    onActiveItemChanged,
    onRowNavigate,
  } = props;
  const getKeyFn = getKey ?? defaultGetKey;

  const groups = useMemo(() => bucketGroups(items, group), [items, group]);

  const hasAggregate = columns.some(declaresAggregate);
  const footerItems = aggregateItems ?? items;
  // Per-group subtotals render when the consumer SUPPLIES them (`groupAggregateResults`) or opts into
  // row-computed ones (`showGroupAggregates`). Otherwise each group grid gets the columns with
  // `aggregate` stripped, so it renders no footer of its own (the grand total still shows).
  const showSubtotals = !!groupAggregateResults || !!group.showGroupAggregates;
  const strippedColumns = useMemo<ColumnDef<T>[]>(
    () => columns.map((c) => (declaresAggregate(c) ? { ...c, aggregate: undefined } : c)),
    [columns],
  );
  // ★ Authoritative per-group values: every declared (field, fn) starts NULL (blank) and only what the
  //   consumer supplied is laid over it, so nothing is ever computed from a group's rows — which on a
  //   paged grid are only this page's share of the group (and may be display strings).
  const resultsFor = useMemo(() => {
    if (!groupAggregateResults) return undefined;
    const blank: AggregateValues = {};
    for (const c of columns) {
      const fns = aggregateList(c);
      // MERGE: two columns may aggregate one field with different functions.
      if (fns.length) blank[c.fieldName] = { ...blank[c.fieldName], ...Object.fromEntries(fns.map((fn) => [fn, null])) };
    }
    return (key: string): AggregateValues => {
      const given = groupAggregateResults[key] ?? {};
      return Object.fromEntries(Object.entries(blank).map(([f, fns]) => [f, { ...fns, ...pickDefined(given[f]) }]));
    };
  }, [groupAggregateResults, columns]);
  // Per-group display strings: each group's columns get an `aggregateFormat` that reads THIS group's
  // entry (missing → blank), never the consumer's own closure (which may format the grand total).
  const columnsFor = useMemo(() => {
    if (!showSubtotals) return () => strippedColumns;
    if (!groupAggregateFormatted) {
      if (!groupAggregateResults) return () => columns;
      // Results without strings: the column's format renders a SUPPLIED value, but an absent one (the
      // overlaid null) stays blank — a format like `v => fmt(v ?? 0)` would print "0" for a group the
      // consumer never sent.
      const nullBlank = columns.map((c) =>
        declaresAggregate(c) && c.aggregateFormat
          ? { ...c, aggregateFormat: (v: number | null, fn: AggregateFunction) => (v === null ? '' : c.aggregateFormat!(v, fn)) }
          : c,
      );
      return () => nullBlank;
    }
    const cache = new Map<string, ColumnDef<T>[]>();
    return (key: string): ColumnDef<T>[] => {
      let cols = cache.get(key);
      if (!cols) {
        const byField = groupAggregateFormatted[key] ?? {};
        cols = columns.map((c) =>
          declaresAggregate(c) ? { ...c, aggregateFormat: (_v: number | null, fn: AggregateFunction) => byField[c.fieldName]?.[fn] ?? '' } : c,
        );
        cache.set(key, cols);
      }
      return cols;
    };
  }, [showSubtotals, groupAggregateFormatted, groupAggregateResults, columns, strippedColumns]);

  // Expansion is CONTROLLED by group key and held here, so it survives the Accordion remounting on
  // every reload (`isLoading`). Only the user's flips are stored: a group that appears later takes the
  // default rather than whatever state an old group with another key had.
  const openByDefault = group.collapsedByDefault !== true;
  const [flipped, setFlipped] = useState<ReadonlySet<string>>(() => new Set());
  const openItems = useMemo(() => groups.filter((g) => openByDefault !== flipped.has(g.key)).map((g) => g.key), [groups, openByDefault, flipped]);
  const onToggle = useCallback((_e: unknown, data: { value: unknown }) => {
    const key = String(data.value);
    setFlipped((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }, []);

  // Selection is OWNED here (one set of row keys across every group), and each group grid is controlled
  // with its share. A group grid's own uncontrolled state would reset when the Accordion remounts on a
  // reload while this host still reported the old rows, and could not be pruned when rows leave `items`.
  const [selected, setSelected] = useState<ReadonlySet<TableRowId>>(() => new Set());
  const emit = useCallback(
    (next: ReadonlySet<TableRowId>) => {
      setSelected(next);
      onSelectionChanged?.(items.filter((it) => next.has(getKeyFn(it))));
    },
    [items, getKeyFn, onSelectionChanged],
  );
  // Prune keys whose row has left `items` (a new page, a refresh). Skipped while loading — `items` may
  // be a placeholder then. Emitted once, only when something was dropped.
  useEffect(() => {
    if (isLoading || selected.size === 0) return;
    const present = new Set(items.map((it) => getKeyFn(it)));
    if ([...selected].every((k) => present.has(k as string))) return;
    emit(new Set([...selected].filter((k) => present.has(k as string))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, isLoading]);
  const groupKeys = useMemo(() => new Map(groups.map((g) => [g.key, new Set<TableRowId>(g.items.map((it) => getKeyFn(it)))])), [groups, getKeyFn]);
  const selectionFor = (key: string): RowExtension<T>['selection'] => {
    const own = groupKeys.get(key) ?? new Set<TableRowId>();
    return {
      selected: new Set([...selected].filter((k) => own.has(k))),
      onChange: (next) => {
        // Single selection is ONE row across all groups: a pick in this group replaces the rest.
        if (selectionMode === 'single') return emit(new Set(next));
        const merged = new Set([...selected].filter((k) => !own.has(k)));
        next.forEach((k) => merged.add(k));
        emit(merged);
      },
    };
  };

  const rootStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    ...(height !== undefined ? { height, minHeight: 0 } : {}),
  };
  // Everything a group grid and the grand-total grid must agree on for their columns to line up.
  const shared = { registry, compact, getKey: getKeyFn, columnFill, selectionMode, rowCommands, rowCommandsDisplay } as const;

  return (
    <div style={rootStyle}>
      {toolbar && <GridToolbar config={toolbar} />}
      <div data-gridkit-group-scroller="" style={height !== undefined ? { flex: 1, minHeight: 0, overflow: 'auto' } : undefined}>
        {isLoading ? (
          <DataGrid items={[]} columns={columns} isLoading />
        ) : (
          <Accordion multiple collapsible openItems={openItems} onToggle={onToggle}>
            {groups.map((g) => (
              <AccordionItem key={g.key} value={g.key} data-gridkit-group-key={g.key}>
                <AccordionHeader>{g.label}</AccordionHeader>
                <AccordionPanel>
                  <DataGridInner<T>
                    {...shared}
                    items={g.items}
                    columns={columnsFor(g.key)}
                    navigateTo={navigateTo}
                    sort={sort}
                    onSortChange={onSortChange}
                    onActiveItemChanged={onActiveItemChanged}
                    onRowNavigate={onRowNavigate}
                    {...(resultsFor ? { aggregateResults: resultsFor(g.key) } : {})}
                    {...(selectionMode !== 'none' ? { rowExtension: { selection: selectionFor(g.key) } } : {})}
                    aria-label={g.label}
                  />
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        )}
        {hasAggregate && (
          // The GRAND total: a headerless, row-less grid with the group grids' exact columns,
          // selection cell, "⋯" column and fill — so its cells line up with theirs by construction.
          // Inset like an AccordionPanel; inside the scroller, stuck to its bottom. Rendered while
          // loading too: a reload must not drop (or jump) a server total.
          <div
            data-gridkit-grand-total=""
            style={{
              // PADDING on a painted wrapper, not margin: a margin gutter is transparent, and the
              // group headers would scroll visibly through it beside the sticky total.
              paddingLeft: tokens.spacingHorizontalM,
              paddingRight: tokens.spacingHorizontalM,
              backgroundColor: tokens.colorNeutralBackground1,
              ...(height !== undefined ? { position: 'sticky', bottom: 0, zIndex: 2 } : {}),
            }}
          >
            <DataGridInner<T>
              {...shared}
              items={[]}
              columns={columns}
              aggregateItems={footerItems}
              aggregateResults={aggregateResults}
              rowExtension={GRAND_TOTAL_EXTENSION as RowExtension<T>}
              aria-label="Grand total"
            />
          </div>
        )}
      </div>
      {pagination && <GridPaginationFooter pagination={pagination} onPageChange={onPageChange} />}
    </div>
  );
}

const GRAND_TOTAL_EXTENSION: RowExtension<Record<string, unknown>> = { hideHeader: true };

/** Only the functions a consumer actually supplied (`undefined` must not overwrite the blank `null`). */
function pickDefined(v: Partial<Record<AggregateFunction, number | null>> | undefined): Partial<Record<AggregateFunction, number | null>> {
  if (!v) return {};
  return Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined)) as Partial<Record<AggregateFunction, number | null>>;
}

// ── look="ce" ────────────────────────────────────────────────────────────────────────────────────
const GG = ceForm.groupedGrid;
/** The leading "Group by" column's id (never a field name: it is not data). */
const GROUP_BY_COLUMN_ID = '__gridkit_groupby';

interface CeGroup<T> {
  key: string;
  /** The ONE text run: "Label (n)" (or "Label" when `showCount: false`). */
  label: string;
  /** Sort key: the label without its count. */
  sortLabel: string;
  /** The group's raw value (a number sorts by value). */
  value: unknown;
  items: T[];
  keys: string[];
}

let warnedSubtotals = false;
let warnedSuppliedSubtotals = false;

/**
 * GroupedGrid `look="ce"`: ONE `DataGrid look="ce"` fed the rows flattened in group order, with a
 * group row (`CeGroupRow`) before each group's first row and the rows of a collapsed group hidden.
 * Fluent never reorders (sort is controlled), so the group order here IS the rendered order.
 */
function GroupedGridCe<T extends Record<string, unknown>>(props: V9GroupedGridProps<T>): JSX.Element {
  // The per-group subtotal props are default-look only: kept out of the spread into the one grid.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { items, columns, group, selectionMode = 'none', onSelectionChanged, getKey, groupAggregateResults: _r, groupAggregateFormatted: _f, ...rest } = props;
  const getKeyFn = getKey ?? defaultGetKey;
  if ((props.groupAggregateResults || props.groupAggregateFormatted) && !warnedSuppliedSubtotals) {
    warnedSuppliedSubtotals = true;
    console.warn('grid-kit: GroupedGrid look="ce" has no per-group footers — groupAggregateResults / groupAggregateFormatted are ignored; the overall aggregate row still shows.');
  }
  if (group.showGroupAggregates && !warnedSubtotals) {
    warnedSubtotals = true;
    console.warn('grid-kit: GroupedGrid look="ce" does not render per-group subtotals (group.showGroupAggregates is ignored); the overall aggregate row still shows.');
  }

  // Bucket with the drift-guarded helper (counts OFF, so the label is the bare label), then apply the
  // measured ce rules: "(blank)" lowercase, groups ordered by label, label + count as one run.
  const groups = useMemo<CeGroup<T>[]>(() => {
    const showCount = group.showCount !== false;
    const out = bucketGroups(items, { ...group, showCount: false }).map((g) => {
      const base = !group.getGroupLabel && g.key === BLANK_GROUP_KEY ? GG.blankLabel : g.label;
      return {
        key: g.key,
        label: showCount ? `${base} (${g.count})` : base,
        sortLabel: base,
        value: g.items[0]?.[group.groupBy],
        items: g.items,
        keys: g.items.map((it) => getKeyFn(it)),
      };
    });
    // ORDER (measured 2026-10-02 on System Jobs, read-only — the grid's own aggregate FetchXML):
    // text/choice groups arrive from the SERVER in label order (a choice column's values 13, 57, 54,
    // 69, 1, 330, 65 came back alphabetical by label); a NUMERIC group query carries no <order>, and
    // its order matched neither value nor label — undefined. So: labels by locale, numbers by value
    // (a deterministic choice where the stock grid has none), the empty-value group first (as the
    // org's "(blank)" was).
    return out.sort((a, b) => {
      const blankA = a.key === BLANK_GROUP_KEY;
      const blankB = b.key === BLANK_GROUP_KEY;
      if (blankA !== blankB) return blankA ? -1 : 1;
      if (typeof a.value === 'number' && typeof b.value === 'number') return a.value - b.value;
      return a.sortLabel.localeCompare(b.sortLabel);
    });
  }, [items, group, getKeyFn]);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const { groupOf, firstOf } = useMemo(() => {
    const groupOf = new Map<string, CeGroup<T>>();
    const firstOf = new Map<string, number>();
    groups.forEach((g, i) => {
      g.keys.forEach((k) => groupOf.set(k, g));
      firstOf.set(g.keys[0], i);
    });
    return { groupOf, firstOf };
  }, [groups]);

  // Expansion: the groups the user flipped from the default, so a group that appears later (new data)
  // takes the default rather than an arbitrary state. The stock grid starts ALL collapsed.
  const openByDefault = group.collapsedByDefault === false;
  const [flipped, setFlipped] = useState<ReadonlySet<string>>(() => new Set());
  const isOpen = useCallback((key: string) => openByDefault !== flipped.has(key), [openByDefault, flipped]);
  const toggle = useCallback((key: string) => {
    setFlipped((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }, []);

  // Selection is CONTROLLED here: a group checkbox selects many rows at once, and Fluent's own toggles
  // (rows, select-all) arrive through the same `onChange` — one emission path.
  const [selected, setSelected] = useState<ReadonlySet<TableRowId>>(() => new Set());
  const emit = useCallback(
    (next: Set<TableRowId>) => {
      setSelected(next);
      onSelectionChanged?.(flat.filter((it) => next.has(getKeyFn(it))));
    },
    [flat, getKeyFn, onSelectionChanged],
  );
  const groupChecked = (g: CeGroup<T>): boolean | 'mixed' => {
    const n = g.keys.filter((k) => selected.has(k)).length;
    return n === 0 ? false : n === g.keys.length ? true : 'mixed';
  };
  const toggleGroupSelection = (g: CeGroup<T>): void => {
    const next = new Set(selected);
    if (groupChecked(g) === true) g.keys.forEach((k) => next.delete(k));
    else g.keys.forEach((k) => next.add(k));
    emit(next);
  };

  const groupedName = columns.find((c) => c.fieldName === group.groupBy)?.name ?? group.groupBy;
  const ext: RowExtension<T> = {
    leadingColumn: {
      columnId: GROUP_BY_COLUMN_ID,
      width: GG.groupByColumnWidth,
      renderHeader: () => `${GG.groupByHeaderPrefix}${groupedName}`,
      // A data row's Group-by cell is empty (measured).
      renderCell: () => null,
    },
    before: (item) => {
      const i = firstOf.get(getKeyFn(item));
      if (i === undefined) return null;
      const g = groups[i];
      return (
        <CeGroupRow
          label={g.label}
          expanded={isOpen(g.key)}
          onToggle={() => toggle(g.key)}
          first={i === 0}
          checked={groupChecked(g)}
          onCheck={() => toggleGroupSelection(g)}
        />
      );
    },
    hidden: (item) => {
      const g = groupOf.get(getKeyFn(item));
      return g ? !isOpen(g.key) : false;
    },
    ...(selectionMode !== 'none' ? { selection: { selected, onChange: emit } } : {}),
  };

  return (
    <DataGridInner<T>
      {...rest}
      look="ce"
      items={flat}
      columns={columns}
      getKey={getKeyFn}
      selectionMode={selectionMode}
      rowExtension={ext}
      aria-label={props['aria-label'] ?? 'Grouped grid'}
    />
  );
}
