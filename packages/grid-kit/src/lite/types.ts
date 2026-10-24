/**
 * Types for the LITE table host — the semantic `<table>` skin.
 *
 * ★★ Deliberately structural, not tied to `ColumnDef`/`GridRenderContext`. A lite consumer has
 * already decided it does not want the DataGrid machinery; making it construct DataGrid types to
 * render a `<td>` would hand back the weight it came here to avoid.
 */
import type * as React from 'react';

export interface LiteColumn {
  /** Logical name. Used as the cell key and to look the value up on the row. */
  readonly name: string;
  /** Header text. */
  readonly displayName: string;
  /**
   * ★ The primary column gets the open-the-record affordance when `onOpen` is supplied.
   * Optional: a table with no primary column simply renders text everywhere.
   */
  readonly isPrimary?: boolean;
}

export interface LiteRow {
  /** Record id — the row key, and what `onOpen` is called with. */
  readonly id: string;
  /** Pre-formatted display strings, keyed by column name. */
  readonly cells: Readonly<Record<string, string>>;
}

export interface LiteCellContext<C extends LiteColumn, R extends LiteRow> {
  readonly row: R;
  readonly column: C;
  /** Column position — the disambiguator when a view carries the same column twice. */
  readonly index: number;
  /** `row.cells[column.name] ?? ''`, resolved for you. */
  readonly text: string;
}

/** Griffel class hooks, so each control keeps its own styling. */
export interface LiteTableClasses {
  readonly table?: string;
  readonly th?: string;
  readonly tr?: string;
  readonly td?: string;
}

export interface LiteTableProps<C extends LiteColumn = LiteColumn, R extends LiteRow = LiteRow> {
  readonly columns: readonly C[];
  readonly rows: readonly R[];
  readonly classes?: LiteTableClasses;
  /** Opens a record from the primary column. Omit and the primary column renders as plain text. */
  readonly onOpen?: (rowId: string) => void;
  /** Replace the default cell body entirely (badges, editors, hover cards…). */
  readonly renderCell?: (ctx: LiteCellContext<C, R>) => React.ReactNode;
  /**
   * The class for ONE body `<td>`, when a uniform `classes.td` cannot say it — `choice-grid`'s
   * editable cells need `overflow: visible` so the badge's focus ring is not clipped, while its
   * text cells need `overflow: hidden` to ellipsise. Two opposite requirements in one table.
   *
   * ★ Return `undefined` and the cell falls back to `classes.td`; return a class and it REPLACES
   * `classes.td` rather than adding to it, which is the same rule `leading.cellClassName` follows.
   * A caller that wants both composes them itself (`mergeClasses(td, extra)`), so there is exactly
   * one place the final class is decided.
   */
  readonly cellClassName?: (ctx: LiteCellContext<C, R>) => string | undefined;
  /**
   * An extra leading column — `ordering-grid`'s drag handle. Both halves are required together so
   * the header and body cannot drift out of alignment.
   */
  readonly leading?: {
    readonly header: React.ReactNode;
    readonly cell: (row: R, index: number) => React.ReactNode;
    readonly headerClassName?: string;
    readonly cellClassName?: string;
  };
  /** Props spread onto each body `<tr>` — `ordering-grid`'s drag handlers and drop-target classes. */
  readonly rowProps?: (row: R, index: number) => React.HTMLAttributes<HTMLTableRowElement>;
  /** A trailing `<tr>` appended inside `<tbody>` — `inline-create-grid`'s draft row. */
  readonly footerRow?: React.ReactNode;
  /** Accessible name for the table. */
  readonly ariaLabel?: string;
}
