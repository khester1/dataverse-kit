import React, { useCallback } from 'react';
import { CellRendererProps } from '../types';
import { cellClass, linkCellClass } from '../styles';

/**
 * Link cell renderer.
 * Displays a clickable link with hover underline.
 */
export function LinkCell<T>({ item, value, column }: CellRendererProps<T>): JSX.Element {
  const displayValue = column.formatValue
    ? column.formatValue(value, item)
    : value;

  const textValue = displayValue !== null && displayValue !== undefined
    ? String(displayValue)
    : '(No Name)';

  const handleClick = useCallback(() => {
    if (column.onLinkClick) {
      column.onLinkClick(item);
    }
  }, [column, item]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if ((event.key === 'Enter' || event.key === ' ') && column.onLinkClick) {
        event.preventDefault();
        column.onLinkClick(item);
      }
    },
    [column, item]
  );

  return (
    <div className={cellClass}>
      <span
        className={linkCellClass}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        title={textValue}
      >
        {textValue}
      </span>
    </div>
  );
}
