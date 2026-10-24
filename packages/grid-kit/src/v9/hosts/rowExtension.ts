/**
 * INTERNAL (not barrel-exported): how a v9 host adds rows and a leading column to the ONE
 * `DataGridInner` it renders — the grouped look's group rows today, the nested look's detail rows
 * next. Kept out of `v9/types.ts`, which is the public type surface.
 *
 * ★ Extra rows are plain `TableRow` / `TableCell` / `DataGridCell` (never `DataGridRow` /
 *   `DataGridSelectionCell`): Fluent's body wraps everything a row render returns in THAT item's
 *   `TableRowIdContextProvider`, so a `DataGridRow` there would select the neighbouring item.
 *   (`DataGridCell` reads only the column id — measured on @fluentui/react-table 9.19 — so it is
 *   safe, and it is what gives an extra row's cells the grid's column sizing.)
 */
import { createContext, useContext, type CSSProperties, type ReactNode } from 'react';
import type { TableColumnId, TableRowId } from '@fluentui/react-components';

/** A column rendered BEFORE the data columns (after the selection column). */
export interface LeadingColumn<T> {
  columnId: string;
  /** RENDERED width in px (content + the cells' 16px horizontal padding, unless `flush`). */
  width: number;
  /** No horizontal cell padding: the content (an expander button) fills the column's width. */
  flush?: boolean;
  renderHeader: () => ReactNode;
  /** The header cell's accessible name when `renderHeader` draws nothing (an expander column). */
  headerAriaLabel?: string;
  /** The leading cell of a DATA row (an extra row renders its own). */
  renderCell: (item: T) => ReactNode;
}

export interface RowExtension<T> {
  /** Rendered BEFORE the item's data row (a group header). Evaluated before `hidden`. */
  before?: (item: T) => ReactNode;
  /** True → the item's data row (and its `after`) is not rendered; `before` still is. */
  hidden?: (item: T) => boolean;
  /** Rendered AFTER the item's data row (a detail row). */
  after?: (item: T) => ReactNode;
  leadingColumn?: LeadingColumn<T>;
  /**
   * Extra class on an item's DATA row (e.g. the nested look's top rule on every row after the first).
   * `isFirst`: this is the first row the grid DISPLAYS — not `items[0]`, which a filter can remove.
   */
  rowClassName?: (item: T, isFirst: boolean) => string | undefined;
  /**
   * The select column's width in px (Fluent's is 44). The nested look splits the stock 44px select
   * cell into this checkbox zone + a `leadingColumn` expander, so data columns start where they do
   * on a flat grid. Applied to every row's select cell — header, data, footer and extra rows.
   */
  selectCellWidth?: number;
  /**
   * Controlled selection — set when an extra row selects many items at once (a group checkbox).
   * `onChange` is the ONE emission path: Fluent's own toggles are routed through it too.
   */
  selection?: { selected: ReadonlySet<TableRowId>; onChange: (next: Set<TableRowId>) => void };
  /**
   * No header row. The default-look GroupedGrid renders its GRAND total as a headerless, row-less
   * DataGrid with the group grids' exact columns, so its cells line up with theirs by construction.
   */
  hideHeader?: boolean;
}

/** What an extra row needs from the grid it sits in, to line its cells up with the columns. */
export interface ExtraRowContextValue {
  /** Every column after the selection column, in order (leading, data, trailing "⋯"). */
  columnIds: string[];
  leadingColumnId?: string;
  /** The same spread the grid puts on its header/body cells (non-resizable fixed/fill widths). */
  cellProps: (columnId: TableColumnId) => { style?: CSSProperties };
  /** The grid shows a selection column. */
  selectable: boolean;
  /** The select cell's style + class when `selectCellWidth` narrows it (for extra rows' select cells). */
  selectCellStyle?: CSSProperties;
  selectCellClassName?: string;
  multiselect: boolean;
  ce: boolean;
}

export const ExtraRowContext = createContext<ExtraRowContextValue | undefined>(undefined);

export function useExtraRowContext(): ExtraRowContextValue {
  const v = useContext(ExtraRowContext);
  if (!v) throw new Error('grid-kit: an extra row must render inside DataGridInner');
  return v;
}
