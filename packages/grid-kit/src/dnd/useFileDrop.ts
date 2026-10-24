import { useCallback, useRef, useState } from 'react';
import type { DragEvent } from 'react';

export interface FileDropOptions {
  /** Called with the accepted dropped files. */
  onDrop: (files: File[]) => void;
  /** Allowed file extensions (e.g. `['.pdf', '.png']`). Empty/undefined = any. */
  accept?: string[];
  /** Allow multiple files (default false → only the first accepted file). */
  multiple?: boolean;
  /** Disable the drop target. */
  disabled?: boolean;
  /** Called when a drop is rejected (wrong type / no files). */
  onReject?: (reason: string) => void;
}

export interface FileDropProps {
  onDragEnter: (e: DragEvent) => void;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
}

function normalizeExt(ext: string): string {
  const e = ext.toLowerCase();
  return e.startsWith('.') ? e : `.${e}`;
}

/**
 * Whether a file name matches an accept list of extensions (case-insensitive,
 * leading dot optional). Empty/undefined accept = anything. Exported for reuse
 * in custom drop targets.
 */
export function isFileAccepted(name: string, accept?: string[]): boolean {
  if (!accept || accept.length === 0) return true;
  const lower = name.toLowerCase();
  return accept.some((ext) => lower.endsWith(normalizeExt(ext)));
}

/**
 * HTML5 file-drop behavior for a grid cell or row. Tracks drag depth (so the
 * highlight doesn't flicker over child elements), validates the dropped files
 * against `accept`, and exposes the drag-over state + the handler props to spread
 * onto a wrapper element. Pure HTML5 — no drag library.
 */
export function useFileDrop(opts: FileDropOptions): { isDragOver: boolean; dragProps: FileDropProps } {
  const { onDrop, accept, multiple = false, disabled, onReject } = opts;
  const [isDragOver, setIsDragOver] = useState(false);
  const depth = useRef(0);

  const onDragEnter = useCallback(
    (e: DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      depth.current += 1;
      setIsDragOver(true);
    },
    [disabled]
  );

  const onDragOver = useCallback(
    (e: DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
    },
    [disabled]
  );

  const onDragLeave = useCallback(
    (e: DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setIsDragOver(false);
    },
    [disabled]
  );

  const onDropHandler = useCallback(
    (e: DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      depth.current = 0;
      setIsDragOver(false);
      const all = Array.from(e.dataTransfer.files ?? []);
      if (all.length === 0) return;
      const valid = all.filter((f) => isFileAccepted(f.name, accept));
      if (valid.length === 0) {
        onReject?.(accept && accept.length ? `Only ${accept.join(', ')} files are allowed.` : 'File not allowed.');
        return;
      }
      onDrop(multiple ? valid : [valid[0]]);
    },
    [disabled, accept, multiple, onDrop, onReject]
  );

  return {
    isDragOver,
    dragProps: { onDragEnter, onDragOver, onDragLeave, onDrop: onDropHandler },
  };
}
