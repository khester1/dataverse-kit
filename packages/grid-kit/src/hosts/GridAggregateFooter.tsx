import React, { useMemo } from 'react';
import { Stack } from '@fluentui/react';
import type { ColumnDef } from '../types';
import { computeAggregates, computeFormattedValue } from '../core';
import type { AggregateResult } from '../core';

const AGG_LABEL: Record<string, string> = {
  sum: '',
  avg: 'avg',
  count: 'count',
  min: 'min',
  max: 'max',
};

/**
 * Measured per-column widths (keyed by `col.key`) supplied via context so that
 * subtotal rows rendered inside Fluent's group footer — which Fluent does NOT
 * re-render on parent updates — still pick up widths that arrive after first paint.
 * A context consumer re-renders when the value changes regardless of intermediate
 * memoization, which the `columnWidths` prop path cannot guarantee there.
 */
export const ColumnWidthsContext = React.createContext<Record<string, number>>({});

/** Format one aggregate cell: `<label> <value>` (currency sum → currency, etc.). */
function aggregateCellText<T extends Record<string, unknown>>(
  col: ColumnDef<T>,
  agg: AggregateResult | undefined
): string {
  if (!agg) return '';
  let text = '';
  if (col.aggregateFormat) {
    text = col.aggregateFormat(agg.value, agg.fn);
  } else if (agg.value === null) {
    text = '';
  } else if (agg.fn === 'count') {
    text = String(agg.value);
  } else {
    const cfg = (col.rendererConfig ?? {}) as { currencyCode?: string; locale?: string };
    text = computeFormattedValue(agg.value, col.rendererType, {
      currencyCode: cfg.currencyCode,
      locale: cfg.locale,
    });
  }
  return `${AGG_LABEL[agg.fn]} ${text}`.trim();
}

/**
 * Presentational aggregate row: one cell per column (text only for columns that
 * declared an `aggregate`), constrained to each column's min/max width and offset
 * by `leadingSpacer`. Shared by the grid footer and per-group subtotal footers.
 *
 * Column alignment vs the DetailsList's justified layout is approximate (a known
 * visual limitation); `leadingSpacer` offsets leading control columns (selection
 * checkbox, group-expand chevron).
 */
export function AggregateRow<T extends Record<string, unknown>>(props: {
  columns: ColumnDef<T>[];
  aggregates: Record<string, AggregateResult>;
  /** Left offset (px) to align with leading control columns. */
  leadingSpacer?: number;
  /** Row background tint (footer vs. group subtotal). */
  background?: string;
  /**
   * Exact per-column pixel widths (keyed by `col.key`) — the DetailsList's
   * `calculatedWidth` from its justified layout. When supplied, each cell is pinned
   * to that width (pixel-perfect alignment). Without it, cells fall back to a
   * flex-basis stretch (used by group-subtotal rows, which have no calculatedWidth).
   */
  columnWidths?: Record<string, number>;
}): JSX.Element {
  const { columns, aggregates, leadingSpacer, background } = props;
  // Prefer an explicit prop (the flat footer's calculatedWidth); else measured
  // widths from context (group subtotals — Fluent won't re-render them on a prop
  // change, but a context consumer re-renders when the value updates).
  const ctxWidths = React.useContext(ColumnWidthsContext);
  const columnWidths = props.columnWidths ?? ctxWidths;
  return (
    <Stack
      horizontal
      verticalAlign="center"
      role="row"
      styles={{ root: { borderTop: '1px solid #edebe9', background: background ?? '#faf9f8', minHeight: 32 } }}
    >
      {leadingSpacer ? <div role="presentation" style={{ width: leadingSpacer, flexShrink: 0 }} /> : null}
      {columns.map((col) => {
        const label = aggregateCellText(col, aggregates[col.fieldName]);
        const pinned = columnWidths?.[col.key];
        // Pixel-pin to the body's calculatedWidth when available (perfect
        // alignment); else stretch from minWidth (group-subtotal fallback).
        const sizing: React.CSSProperties =
          pinned !== undefined
            ? { width: pinned, minWidth: pinned, maxWidth: pinned, flexShrink: 0 }
            : { flexBasis: col.minWidth ?? 100, flexGrow: 1, flexShrink: 1, minWidth: 0, maxWidth: col.maxWidth };
        return (
          <div
            key={col.key}
            role="gridcell"
            title={label || undefined}
            style={{
              ...sizing,
              padding: '4px 8px',
              fontSize: 12,
              fontWeight: 600,
              color: '#323130',
              // Left-aligned to match the body cells (currency/number read cells are
              // left-aligned in the DetailsList) and to keep subtotal + grand-total
              // consistent regardless of container width.
              textAlign: 'left',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </div>
        );
      })}
    </Stack>
  );
}

/**
 * Footer row of per-column aggregates, rendered as a sibling Stack BELOW the
 * DetailsList (Fluent v8 has no first-class footer-row API; mirrors how
 * GridPaginationFooter mounts).
 *
 * Aggregates over exactly the `items` passed — the displayed (filtered) page by
 * default, or the full dataset when the host is given `aggregateItems` (cross-page
 * grand totals). `leadingSpacer` offsets a leading selection-check column.
 */
export function GridAggregateFooter<T extends Record<string, unknown>>(props: {
  items: ReadonlyArray<T>;
  columns: ColumnDef<T>[];
  /** Left offset (px) to align with a leading control column (e.g. selection checkbox). */
  leadingSpacer?: number;
  /** Exact per-column widths (keyed by `col.key`) for pixel-perfect alignment. */
  columnWidths?: Record<string, number>;
}): JSX.Element {
  const { items, columns, leadingSpacer, columnWidths } = props;
  const aggregates = useMemo(() => computeAggregates(items, columns), [items, columns]);
  return <AggregateRow columns={columns} aggregates={aggregates} leadingSpacer={leadingSpacer} columnWidths={columnWidths} />;
}
