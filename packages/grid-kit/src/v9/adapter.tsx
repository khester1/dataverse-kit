/**
 * Adapter: grid-kit `ColumnDef[]` → Fluent UI v9 `TableColumnDefinition[]` (the v9
 * DataGrid columns model), the v9 counterpart of `toDetailsListColumns`. Each
 * column's `renderCell` reuses the SAME Fluent-free `buildCellProps` + render context
 * the v8 adapter uses and resolves a v9 read renderer from the registry.
 *
 * Sort is CONTROLLED (grid-kit's model): a sortable header calls `ctx.onSortChange`;
 * the grid never sorts in-memory (no v9 `useTableSort`), so a consumer that
 * re-queries stays authoritative — matching the v8 `DataGrid`.
 */
import React from 'react';
import { createTableColumn, TableCellLayout, type TableColumnDefinition } from '@fluentui/react-components';
import { ArrowSortUpRegular, ArrowSortDownRegular } from '@fluentui/react-icons';
import type { ColumnDef } from '../types';
import { buildCellProps, type GridRenderContext } from '../adapters/context';
import { computeFormattedValue } from '../core/formatters';
import { rendererFormatConfig } from '../core/displayText';
import type { GridCellProps } from '../types';
import { EditCellWrapper, EDIT_AFFORDANCE_ATTR } from './EditCellWrapper';
import { isEditableColumn } from './cells/registry';

/** A header cell that reflects (and toggles) the controlled sort for its column. */
function HeaderCell<T>({ column, ctx }: { column: ColumnDef<T>; ctx: GridRenderContext<T> }): JSX.Element {
  const sortable = column.isSortable && !!ctx.onSortChange;
  if (!sortable) return <>{column.name}</>;
  const active = ctx.sort?.fieldName === column.fieldName;
  const dir = active ? ctx.sort?.direction : undefined;
  const toggle = () => {
    const next = active && ctx.sort?.direction === 'asc' ? 'desc' : 'asc';
    ctx.onSortChange!(column.fieldName, next);
  };
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      }}
      style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      {column.name}
      {active && (dir === 'asc' ? <ArrowSortUpRegular /> : <ArrowSortDownRegular />)}
    </span>
  );
}

/**
 * A committed but unsaved edit is what the cell must READ. `buildCellProps` describes the ORIGINAL row —
 * `value`, the computed `formattedValue`, and the host-supplied `@OData…FormattedValue` all predate the
 * edit — so six of the seven v9 editors showed the old value again the moment the editor closed
 * (measured in Chrome: a choice changed Active → Inactive still read "Active"). ONE site, for every
 * editor: a dirty cell that is not editing reads its edited value, formatted per its type; the supplied
 * FormattedValue is dropped (it labels the old value), and so is a link/lookup's click, which would
 * open the ORIGINAL row's target. Editing cells are untouched (their editors read `editedValue`
 * themselves and report `value` as the original).
 * Known limits: a non-lookup column's `formatValue(value, item)` receives the edited value with the
 * original item, and a grid-level `formattedValueAccessor` is bypassed for a dirty cell.
 */
/** Renderers whose editor is live without `isEditing` (they read `editedValue` themselves). */
const ALWAYS_LIVE: ReadonlySet<string> = new Set(['toggle', 'boolean']);

/**
 * The date editor commits "YYYY-MM-DD". Formatted as-is, `new Date("2026-10-08")` is UTC MIDNIGHT — Oct 7
 * west of UTC (measured at UTC-7, `editedDate.tz.test.tsx`). Without an offset a date-TIME string is LOCAL,
 * so the day is pinned to local midnight. (Unedited date-only values from the server go through the same
 * dynamics-utils `formatDate` and carry that pre-existing shift — a known, separate defect.)
 */
function localDay(v: unknown): unknown {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T00:00` : v;
}

/**
 * Fill the cell (an editable cell's click target is the whole cell, not its text). The gridcell is a flex
 * row with `align-items: center`, so the layout also needs `align-self: stretch` for these heights to have
 * a definite parent (a stretched flex item's size is definite for its children's percentages).
 */
const FILL: React.CSSProperties = { width: '100%', height: '100%', minWidth: 0 };
/** The layout itself: NO explicit height — `height: 100%` of the gridcell (indefinite) overrode the
 *  stretch and collapsed to 0 (measured), while an auto height lets `align-self: stretch` size it. */
const STRETCH: React.CSSProperties = { width: '100%', minWidth: 0, alignSelf: 'stretch' };

/**
 * The column, minus what reads the ORIGINAL row: a link/lookup's click (it opens the original record) and —
 * for a lookup — `displayField` and `formatValue`, which resolve the name from `props.item`. A committed
 * lookup is `{ id, name }` (or `null`), and `LookupCell` reads its `name`.
 */
function withoutOriginalRowReaders<T>(column: GridCellProps<T>['column']): GridCellProps<T>['column'] {
  let next = column.onLinkClick ? { ...column, onLinkClick: undefined } : column;
  if (column.rendererType === 'lookup' && column.rendererConfig) {
    const { displayField, lookupDisplayField, formatValue, ...rest } = column.rendererConfig as Record<string, unknown>;
    void displayField;
    void lookupDisplayField;
    void formatValue;
    next = { ...next, rendererConfig: rest };
  }
  return next;
}

function showEditedValue<T>(props: GridCellProps<T>): GridCellProps<T> {
  if (props.isEditing || !props.isDirty || props.editedValue === undefined) return props;
  const column = props.column;
  // ★ A toggle is LIVE outside edit mode and already reads `editedValue` itself; folding the edit into
  //   its `value` made its next change report the previous EDIT as `originalValue` (review of #452).
  if (ALWAYS_LIVE.has(column.rendererType)) return props;
  const edited = props.editedValue;
  return {
    ...props,
    value: edited,
    formattedValue:
      column.rendererType === 'lookup'
        ? ((edited as { name?: string } | null)?.name ?? '')
        : computeFormattedValue(localDay(edited), column.rendererType, rendererFormatConfig(column)),
    suppliedFormattedValue: undefined,
    column: withoutOriginalRowReaders(column),
  };
}

export function toDataGridColumns<T extends Record<string, unknown>>(
  columns: ColumnDef<T>[],
  ctx: GridRenderContext<T>,
): TableColumnDefinition<T>[] {
  return columns.map((column) =>
    createTableColumn<T>({
      columnId: column.key,
      renderHeaderCell: () => <HeaderCell column={column} ctx={ctx} />,
      renderCell: (item) => {
        // Escape hatch: fully custom render bypasses the registry.
        if (column.onRender) return <TableCellLayout>{column.onRender(item) as React.ReactNode}</TableCellLayout>;
        const props = showEditedValue(buildCellProps(column, item, ctx));
        const Renderer = ctx.registry.resolve(column, !!ctx.editable);
        const cell = <Renderer {...props} />;

        // Per-cell click-to-edit affordance: editable columns enter edit mode on
        // click (one cell at a time, gated by isEditing) and exit on Enter/Escape/
        // blur (EditCellWrapper). With editTrigger 'always' (or non-editable columns)
        // the cell renders plainly (the edit renderer shows every editor at once).
        const editableColumn = isEditableColumn(column as ColumnDef, ctx.registry.get(column.rendererType), !!ctx.editable);
        const isEditableCell = editableColumn && (ctx.editTrigger ?? 'click') === 'click';

        let rendered: React.ReactNode;
        if (!isEditableCell) {
          rendered = cell;
        } else if (props.isEditing) {
          rendered = <EditCellWrapper onExit={() => props.onEditEnd?.()}>{cell}</EditCellWrapper>;
        } else {
          rendered = (
            <div
              role="button"
              tabIndex={0}
              {...{ [EDIT_AFFORDANCE_ATTR]: '' }}
              title="Click to edit"
              style={{ height: '100%', width: '100%', cursor: 'text', display: 'flex', alignItems: 'center' }}
              // stopPropagation so entering edit doesn't also toggle the row's
              // selection / active-row handlers on the v9 DataGridRow.
              onClick={(e) => {
                e.stopPropagation();
                props.onEditStart?.();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'F2') {
                  e.preventDefault();
                  e.stopPropagation();
                  props.onEditStart?.();
                }
              }}
            >
              {cell}
            </div>
          );
        }
        // `truncate` on READ-ONLY cells: Fluent's cell is a flex container, so without it the layout's
        // content span grows to its text (min-width: auto) and a long value runs into the next
        // column — the cells' own ellipsis never fires (found by the ce-parity "Details beside a
        // grid" recipe). NOT on editable columns: truncate is overflow:hidden on the layout, which
        // would clip EditShell's dirty/error accent (drawn into the cell padding) and its error
        // message (hung below the cell). The `onRender` escape hatch above is not truncated either
        // — custom content owns its own overflow.
        // ★ An EDITABLE cell's layout fills the cell: TableCellLayout's content/main slots shrink to their
        //   text, so the click-to-edit affordance was only as wide as the value — and 0×0 on an EMPTY cell,
        //   which look="ce" leaves blank (MEASURED in Chrome: 79 of 324px for "Contoso Ltd", 0×0 empty, so
        //   an empty editable cell could not be entered at all).
        return editableColumn ? (
          <TableCellLayout truncate={false} style={STRETCH} content={{ style: FILL }} main={{ style: FILL }}>
            {rendered}
          </TableCellLayout>
        ) : (
          <TableCellLayout truncate>{rendered}</TableCellLayout>
        );
      },
    }),
  );
}
