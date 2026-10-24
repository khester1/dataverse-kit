/**
 * Adapter: grid-kit `ColumnDef[]` → Fluent v8 `IColumn[]` whose `onRender`
 * resolves a renderer from the registry and returns it as a JSX ELEMENT
 * (`<Renderer …/>`) — never a function call, so editable cells' hooks stay legal.
 *
 * This is the PCF DetailsList path AND the internal `<DataGrid>` path.
 */
import React from 'react';
import type { IColumn } from '@fluentui/react';
import type { ColumnDef } from '../types';
import { buildCellProps, GridRenderContext } from './context';
import { EditCellWrapper } from './EditCellWrapper';
import { CalloutCell } from './CalloutCell';

/** Wrap a rendered cell in a hover-preview callout when the column declares `calloutContent`. */
function withCallout<T>(column: ColumnDef<T>, item: T, rendered: React.ReactNode): React.ReactNode {
  if (!column.calloutContent) return rendered;
  return (
    <CalloutCell
      renderContent={() => column.calloutContent!(item)}
      dismissMode={column.dismissMode}
      timeoutDuration={column.timeoutDuration}
    >
      {rendered}
    </CalloutCell>
  );
}

export function toDetailsListColumns<T>(columns: ColumnDef<T>[], ctx: GridRenderContext<T>): IColumn[] {
  return columns.map((column): IColumn => {
    const sortable = column.isSortable && !!ctx.onSortChange;

    return {
      key: column.key,
      name: column.name,
      fieldName: column.fieldName,
      minWidth: column.minWidth ?? 100,
      maxWidth: column.maxWidth,
      isResizable: column.isResizable ?? true,
      isSorted: ctx.sort?.fieldName === column.fieldName,
      isSortedDescending: ctx.sort?.fieldName === column.fieldName && ctx.sort?.direction === 'desc',
      columnActionsMode: sortable ? undefined : 0, // 0 = disabled when not sortable
      onColumnClick: sortable
        ? () => {
            const nextDir =
              ctx.sort?.fieldName === column.fieldName && ctx.sort?.direction === 'asc' ? 'desc' : 'asc';
            ctx.onSortChange!(column.fieldName, nextDir);
          }
        : undefined,
      onRender: (item?: T) => {
        if (item === undefined || item === null) return null;
        // Escape hatch: fully custom render bypasses the registry.
        if (column.onRender) return column.onRender(item) as React.ReactNode;
        const props = buildCellProps(column, item, ctx);
        const Renderer = ctx.registry.resolve(column, !!ctx.editable);
        const cell = <Renderer {...props} />;

        // Per-cell click-to-edit affordance: editable columns enter edit mode on
        // click (one cell at a time) and exit on Enter/Escape/blur. Only cell
        // types that actually have an edit renderer get the affordance — toggle/
        // boolean are already interactive in read mode and ignore edit state.
        // With editTrigger 'always' (or non-editable columns) the cell renders plainly.
        const isEditableCell =
          !!ctx.editable &&
          !!column.editorType &&
          column.editorType !== 'none' &&
          !column.isLocked &&
          !!ctx.registry.get(column.rendererType)?.edit &&
          (ctx.editTrigger ?? 'click') === 'click';

        // Resolve the cell to its rendered form (plain / editing / click-to-edit),
        // then apply the hover-preview callout once so it composes with any path.
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
              title="Click to edit"
              style={{ height: '100%', cursor: 'text', display: 'flex', alignItems: 'center' }}
              onClick={() => props.onEditStart?.()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'F2') props.onEditStart?.();
              }}
            >
              {cell}
            </div>
          );
        }
        return withCallout(column, item, rendered);
      },
    };
  });
}
