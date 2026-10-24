/**
 * v9 footers — the Fluent UI v9 counterparts of `GridPaginationFooter` +
 * `GridAggregateFooter`. Presentational only: the pager renders the page indicator
 * + prev/next; the aggregate rows reuse the pure `computeAggregateRows` /
 * `computeFormattedValue` from `core/` — ONE row per declared function.
 *
 * Two aggregate renderers:
 *  - `GridAggregateRows` is mounted INSIDE a `<FluentDataGrid>` (after its body). Each cell
 *    is a real `DataGridCell` under `ColumnIdContextProvider`, so it takes the column's
 *    width from the grid's own sizing state — it stays aligned after a resize and scrolls
 *    horizontally with the body. Used by the flat `<DataGrid>` (and so every group grid).
 *  - `GridAggregateFooter` is a standalone flex row BELOW a grid — approximate alignment
 *    (equal flex). No grid-kit host uses it since 0.31 (the GroupedGrid grand total is now a
 *    headerless grid with the group grids' columns); kept exported for existing consumers.
 */
import React, { useMemo } from 'react';
import {
  Button,
  Text,
  TableRow,
  TableSelectionCell,
  DataGridCell,
  ColumnIdContextProvider,
  tokens,
  makeStyles,
} from '@fluentui/react-components';
import { ChevronLeftRegular, ChevronRightRegular } from '@fluentui/react-icons';
import type { ColumnDef, GridPaginationState } from '../../types';
import { computeAggregateRows, computeFormattedValue } from '../../core';
import type { AggregateResult, AggregateValues, AggregateFunction } from '../../core';

/** Presentational pager (consumer pre-slices `items` to the page). */
export const GridPaginationFooter: React.FC<{
  pagination: GridPaginationState;
  onPageChange?: (page: number) => void;
}> = ({ pagination, onPageChange }) => {
  const { currentPage, pageSize, totalItems } = pagination;
  const totalPages = Math.max(1, Math.ceil(totalItems / Math.max(1, pageSize)));
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, paddingTop: 8 }}>
      <Text size={200}>{`Page ${currentPage} of ${totalPages} · ${totalItems} item${totalItems === 1 ? '' : 's'}`}</Text>
      <Button
        appearance="subtle"
        size="small"
        icon={<ChevronLeftRegular />}
        disabled={currentPage <= 1}
        onClick={() => onPageChange?.(currentPage - 1)}
      >
        Previous
      </Button>
      <Button
        appearance="subtle"
        size="small"
        icon={<ChevronRightRegular />}
        iconPosition="after"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange?.(currentPage + 1)}
      >
        Next
      </Button>
    </div>
  );
};

const AGG_LABEL: Record<string, string> = { sum: '', avg: 'avg', count: 'count', min: 'min', max: 'max' };
/** Row-level accessible names (one footer row per function). */
const AGG_ROW_NAME: Record<AggregateFunction, string> = {
  sum: 'Total',
  avg: 'Average',
  count: 'Count',
  min: 'Minimum',
  max: 'Maximum',
};

function aggregateCellText<T extends Record<string, unknown>>(
  col: ColumnDef<T>,
  agg: AggregateResult | undefined,
): string {
  if (!agg) return '';
  let text = '';
  if (col.aggregateFormat) {
    text = col.aggregateFormat(agg.value, agg.fn);
    // ★ A consumer format that renders a value as EMPTY means blank — not a bare "avg" label.
    //   (0.22.0 blanked a null only when NO format was supplied, so a formatted grid showed "avg"
    //   with nothing after it while its totals were still loading.)
    if (!text) return '';
  } else if (agg.value === null) {
    // Blank means blank — not a bare "avg" label with nothing after it.
    return '';
  } else if (agg.fn === 'count') {
    text = String(agg.value);
  } else {
    const cfg = (col.rendererConfig ?? {}) as { currencyCode?: string; locale?: string };
    text = computeFormattedValue(agg.value, col.rendererType, { currencyCode: cfg.currencyCode, locale: cfg.locale });
  }
  return `${AGG_LABEL[agg.fn]} ${text}`.trim();
}

/** Spread-only style: an explicit `style: undefined` would wipe a resizable cell's width. */
function cellStyleProps(
  cellStyle: ((key: string) => React.CSSProperties | undefined) | undefined,
  key: string,
): { style?: React.CSSProperties } {
  const style = cellStyle?.(key);
  return style ? { style } : {};
}

/** A plain `TableRow` carries Fluent's `rootInteractive` :hover/:active backgrounds; a total
 *  row is not interactive, so hold its background steady. */
const useFooterRowStyles = makeStyles({
  root: {
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
    ':hover': { backgroundColor: tokens.colorNeutralBackground2 },
    ':active': { backgroundColor: tokens.colorNeutralBackground2 },
  },
});

/**
 * Aggregate footer rows mounted INSIDE a `<FluentDataGrid>` — one row per function. A
 * plain `TableRow` (not `DataGridRow`, whose selection cell is a live checkbox that would
 * toggle row `''`), with an INVISIBLE leading `TableSelectionCell` when the grid is
 * selectable so the columns line up, and a `DataGridCell focusMode="none"` per column so
 * the footer takes no tab stop. Sticky to the bottom of the scroll container when `sticky`.
 *
 * ★ Being inside the grid makes the footer the LAST `[role="row"]`, which is the row Fluent's
 *   Ctrl+End targets — and it has nothing focusable. The host's `onKeyDown` redirects Ctrl+End
 *   to the last BODY row (see `DataGrid.tsx`).
 */
export function GridAggregateRows<T extends Record<string, unknown>>(props: {
  items: ReadonlyArray<T>;
  columns: ColumnDef<T>[];
  selectable?: boolean;
  aggregateResults?: AggregateValues;
  /** Stick to the bottom of the grid's scroll container. Only meaningful when the grid has a
   *  bounded `height`; otherwise the nearest scroller is the page or an outer host. */
  sticky?: boolean;
  /** Per-column cell style from the host's non-resizable `columnFill` (never set when resizable). */
  cellStyle?: (columnKey: string) => React.CSSProperties | undefined;
  /** A trailing non-data column (the "⋯" row-commands column): one empty cell per footer row,
   *  under its column id, so the totals stay aligned with the header. */
  trailingColumnId?: string;
  /** A leading non-data column (GroupedGrid `look="ce"`'s "Group by"): one empty cell per footer row. */
  leadingColumnId?: string;
  /** The select cell's style when the host narrows it (the nested look). */
  selectCellStyle?: React.CSSProperties;
}): JSX.Element | null {
  const { items, columns, selectable, aggregateResults, sticky, cellStyle, trailingColumnId, leadingColumnId, selectCellStyle } = props;
  const rowClass = useFooterRowStyles().root;
  const rows = useMemo(
    () => computeAggregateRows(items, columns, aggregateResults),
    [items, columns, aggregateResults],
  );
  if (rows.length === 0) return null;
  return (
    <div
      role="rowgroup"
      data-gridkit-aggregate-footer=""
      style={{
        background: tokens.colorNeutralBackground2,
        ...(sticky ? { position: 'sticky' as const, bottom: 0, zIndex: 1 } : {}),
      }}
    >
      {rows.map((r) => (
        <TableRow
          key={r.fn}
          as="div"
          data-aggregate-fn={r.fn}
          aria-label={AGG_ROW_NAME[r.fn]}
          className={rowClass}
        >
          {/* ★ NOT `invisible`: in Fluent that is `opacity: 0` only — the checkbox stays
              focusable and clickable. Dropping the indicator slot keeps the cell's width. */}
          {selectable ? (
            <TableSelectionCell as="div" checkboxIndicator={null} role="presentation" aria-hidden="true" {...(selectCellStyle ? { style: selectCellStyle } : {})} />
          ) : null}
          {leadingColumnId !== undefined && (
            <ColumnIdContextProvider value={leadingColumnId}>
              <DataGridCell focusMode="none" aria-hidden="true" {...cellStyleProps(cellStyle, leadingColumnId)} />
            </ColumnIdContextProvider>
          )}
          {columns.map((col) => {
            const label = aggregateCellText(col, r.cells[col.fieldName]);
            return (
              <ColumnIdContextProvider key={col.key} value={col.key}>
                {/* ★ No sizing-affecting style on the cell in a RESIZABLE grid: useDataGridCell
                    spreads `...props` AFTER the sizing props, so a style would REPLACE the column
                    width. `cellStyle` is only ever set for a non-resizable grid. Style the span. */}
                <DataGridCell focusMode="none" title={label || undefined} {...cellStyleProps(cellStyle, col.key)}>
                  <span
                    style={{
                      flex: '1 1 auto',
                      minWidth: 0,
                      textAlign: 'right',
                      fontWeight: 600,
                      fontSize: tokens.fontSizeBase200,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {label}
                  </span>
                </DataGridCell>
              </ColumnIdContextProvider>
            );
          })}
          {trailingColumnId !== undefined && (
            <ColumnIdContextProvider value={trailingColumnId}>
              <DataGridCell focusMode="none" aria-hidden="true" {...cellStyleProps(cellStyle, trailingColumnId)} />
            </ColumnIdContextProvider>
          )}
        </TableRow>
      ))}
    </div>
  );
}

/**
 * Footer rows of per-column aggregates, mounted BELOW a v9 grid (one row per function).
 * `leadingSpacer` offsets a leading selection column so the cells align APPROXIMATELY
 * with the body (equal flex) — prefer `GridAggregateRows` wherever there is one grid.
 */
export function GridAggregateFooter<T extends Record<string, unknown>>(props: {
  items: ReadonlyArray<T>;
  columns: ColumnDef<T>[];
  leadingSpacer?: number;
  aggregateResults?: AggregateValues;
}): JSX.Element | null {
  const { items, columns, leadingSpacer, aggregateResults } = props;
  const rows = useMemo(
    () => computeAggregateRows(items, columns, aggregateResults),
    [items, columns, aggregateResults],
  );
  if (rows.length === 0) return null;
  return (
    <div role="rowgroup" data-gridkit-aggregate-footer="">
      {rows.map((r) => (
        <div
          key={r.fn}
          role="row"
          data-aggregate-fn={r.fn}
          aria-label={AGG_ROW_NAME[r.fn]}
          style={{ display: 'flex', alignItems: 'center', borderTop: '1px solid #edebe9', background: '#faf9f8', minHeight: 32 }}
        >
          {leadingSpacer ? <div role="presentation" style={{ width: leadingSpacer, flexShrink: 0 }} /> : null}
          {columns.map((col) => {
            const label = aggregateCellText(col, r.cells[col.fieldName]);
            return (
              <div
                key={col.key}
                role="gridcell"
                title={label || undefined}
                style={{
                  // The v9 DataGrid gives every column `flex: 1 1 0` (equal widths), so the
                  // footer cells match with the same flex — each sits under its column.
                  flex: '1 1 0',
                  minWidth: 0,
                  padding: '4px 8px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#323130',
                  // Right-aligned to match the (right-aligned) numeric body cells.
                  textAlign: 'right',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
