import React, { useMemo } from 'react';
import type { ColumnDef, NestedGridProps } from '../../types';
import { useEditState } from '../useEditState';
import { useGridContext } from '../useGridContext';
import { DataGrid } from '../DataGrid';
import { NestedInline } from './NestedInline';
import { NestedCardParent } from './NestedCardParent';
import { NestedTriggerCell } from './NestedTriggerCell';

/**
 * Nested / expandable grid host. Dispatch order:
 * 1. `parentLayout === 'cards'` — each parent is a card that expands in place
 *    (`<NestedCardParent>`); `mode` is ignored.
 * Otherwise, parents are rows and child records surface per `nested.mode`:
 * - `inline`        — chevron expands the child grid under the row
 * - `side-panel`    — a trigger opens a Fluent Panel with the child grid
 * - `hover-callout` — a count badge shows a compact callout of top-N rows
 * - `detail-pane`   — falls back to `side-panel` here (use `<FocusedViewGrid>`
 *                     for true master-detail with a detail-pane child)
 *
 * grid-kit never fetches — `nested.getChildren(parent)` (sync or async) owns it.
 */
export function NestedGrid<
  T extends Record<string, unknown> = Record<string, unknown>,
  C extends Record<string, unknown> = Record<string, unknown>,
>(props: NestedGridProps<T, C>): JSX.Element {
  const { columns, nested } = props;
  const edit = useEditState();
  const { getKeyFn, ctx } = useGridContext<T>(props, edit);

  // Append a trigger column for the non-inline modes (its cell manages its own
  // panel/callout). Built before any early return to keep hook order stable.
  const triggeredColumns = useMemo<ColumnDef<T>[]>(() => {
    const trigger: ColumnDef<T> = {
      key: '__nested',
      fieldName: '__nested',
      name: 'Related',
      rendererType: 'text',
      minWidth: 160,
      onRender: (item) => <NestedTriggerCell<T, C> parent={item} nested={nested} />,
    };
    return [...columns, trigger];
  }, [columns, nested]);

  // Card parents win over `mode`: each parent renders as a card that expands in place.
  if (nested.parentLayout === 'cards') {
    return <NestedCardParent<T, C> parentProps={props} ctx={ctx} getKeyFn={getKeyFn} />;
  }

  if (nested.mode === 'inline') {
    return <NestedInline<T, C> parentProps={props} ctx={ctx} getKeyFn={getKeyFn} />;
  }

  // side-panel, hover-callout (and detail-pane fallback) → DataGrid + trigger column
  return <DataGrid<T> {...props} columns={triggeredColumns} />;
}
