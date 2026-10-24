import React from 'react';
import { useFileDrop, FileDropOptions } from './useFileDrop';

export interface DroppableCellProps extends FileDropOptions {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** `highlight` (outline + glow + tint) or `minimal` (tint only). Default `highlight`. */
  variant?: 'highlight' | 'minimal';
}

/**
 * Wraps any content as an HTML5 file-drop target with a drag-over highlight.
 * Use inside a custom cell renderer (or directly) to accept files dropped from
 * the OS onto a cell. The `fileDrop` registry cell type uses this internally.
 */
export const DroppableCell: React.FC<DroppableCellProps> = ({
  children,
  className,
  style,
  variant = 'highlight',
  ...opts
}) => {
  const { isDragOver, dragProps } = useFileDrop(opts);
  const active = isDragOver && !opts.disabled;
  return (
    <div
      {...dragProps}
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        height: '100%',
        width: '100%',
        borderRadius: 4,
        outline: active && variant === 'highlight' ? '2px solid #0078d4' : '2px solid transparent',
        background: active ? 'rgba(0,120,212,0.08)' : 'transparent',
        boxShadow: active && variant === 'highlight' ? '0 0 6px 1px rgba(0,120,212,0.4)' : 'none',
        transition: 'background 80ms ease-out, box-shadow 80ms ease-out, outline-color 80ms ease-out',
        ...style,
      }}
    >
      {children}
    </div>
  );
};
