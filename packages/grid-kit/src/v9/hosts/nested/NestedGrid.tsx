/**
 * The Fluent UI v9 nested / expandable grid host — the v9 counterpart of the v8
 * `<NestedGrid>`. Dispatches on `nested.mode`:
 * - `inline`        — a manual v9 `<Table>` whose chevron expands a child grid under
 *                     the parent row (`<NestedInline>`; v9 has no row-expansion primitive)
 * - `side-panel`    — a trigger opens a v9 `OverlayDrawer` with the child grid
 * - `hover-callout` — a count badge shows a v9 `Popover` preview of the top-N rows
 * - `detail-pane`   — falls back to `side-panel` (use `<FocusedViewGrid>` for a true
 *                     inline master-detail pane)
 *
 * grid-kit never fetches — `nested.getChildren(parent)` owns it. NOTE: `parentLayout:
 * 'cards'` is a follow-on v9 increment (renders as expandable rows for now).
 */
import React, { useMemo } from 'react';
import type { ColumnDef } from '../../../types';
import type { V9NestedGridProps } from '../../types';
import { DataGrid } from '../DataGrid';
import { NestedInline } from './NestedInline';
import { NestedTriggerCell } from './NestedTriggerCell';
import { NestedInlineCe } from './NestedInlineCe';

export function NestedGrid<
  T extends Record<string, unknown> = Record<string, unknown>,
  C extends Record<string, unknown> = Record<string, unknown>,
>(props: V9NestedGridProps<T, C>): JSX.Element {
  const { columns, nested, look } = props;

  // Non-inline modes: append a trigger column whose cell manages its own drawer/popover.
  const triggeredColumns = useMemo<ColumnDef<T>[]>(
    () => [
      ...columns,
      {
        key: '__nested',
        fieldName: '__nested',
        name: 'Related',
        rendererType: 'text',
        minWidth: 160,
        // The drawer's child grid takes the parent's look (a host that renders a child grid passes
        // its own `look` explicitly — never inherited by accident, never dropped).
        onRender: (item) => <NestedTriggerCell<T, C> parent={item} nested={nested} look={look} />,
      },
    ],
    [columns, nested, look],
  );

  if (nested.mode === 'inline') {
    // look="ce": the measured stock grid with Child items (one DataGrid); default: the manual Table.
    return props.look === 'ce' ? <NestedInlineCe<T, C> {...props} /> : <NestedInline<T, C> {...props} />;
  }
  // side-panel / hover-callout / detail-pane(→ side-panel) → a v9 DataGrid + trigger column.
  return <DataGrid<T> {...props} columns={triggeredColumns} />;
}
