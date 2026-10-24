import React from 'react';
import type { GridCellProps, GridCellRenderer } from '../types';
import { DroppableCell } from './DroppableCell';

/** Shape read off a `fileDrop` column's `rendererConfig`. */
export interface FileDropCellConfig {
  /** Allowed extensions (e.g. `['.pdf', '.png']`). */
  accept?: string[];
  /** Allow multiple files (default false). */
  multiple?: boolean;
  /**
   * Text shown in the cell. When omitted, the cell shows its own value (so a
   * status like "Uploaded" stays visible), falling back to "Drop file" when the
   * value is empty. Set `label` to force a fixed affordance regardless of value.
   */
  label?: string;
  /** Called with the dropped files + the row + the column field name. */
  onDrop?: (files: File[], item: unknown, fieldName: string) => void;
  /** Called when a drop is rejected. */
  onReject?: (reason: string, item: unknown, fieldName: string) => void;
}

/**
 * Grid-kit-native cell renderer for `rendererType: 'fileDrop'`. Renders the cell
 * as a droppable target; on drop it calls `rendererConfig.onDrop(files, item,
 * fieldName)`. Unlike the other built-ins it does NOT wrap a canonical renderer.
 */
export const FileDropCell: GridCellRenderer = (props: GridCellProps) => {
  const cfg = (props.column.rendererConfig ?? {}) as FileDropCellConfig;
  const field = props.column.fieldName;
  // Name(s) of the file(s) dropped on THIS cell, shown after a successful drop.
  const [dropped, setDropped] = React.useState<string | null>(null);
  // Dropped file name wins (so the drop is visibly acknowledged); else explicit
  // label; else the cell's value; else the drop hint. (formattedValue is '' — not
  // undefined — when the value is empty, so use `||`.)
  const text = dropped ?? cfg.label ?? (props.formattedValue || 'Drop file');
  return (
    <DroppableCell
      accept={cfg.accept}
      multiple={cfg.multiple}
      onDrop={(files) => {
        setDropped(files.map((f) => f.name).join(', '));
        cfg.onDrop?.(files, props.item, field);
      }}
      onReject={cfg.onReject ? (reason) => cfg.onReject!(reason, props.item, field) : undefined}
      style={{ justifyContent: 'center', cursor: 'copy', fontSize: 13, color: dropped ? '#323130' : '#605e5c' }}
    >
      <span
        title={dropped ?? undefined}
        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}
      >
        {dropped ? `📎 ${dropped}` : text}
      </span>
    </DroppableCell>
  );
};
