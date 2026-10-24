import React, { useCallback } from 'react';
import { Toggle } from '@fluentui/react';
import { CellRendererProps } from '../types';
import { cellClass } from '../styles';

/**
 * Toggle cell renderer.
 * Displays a toggle switch for boolean values.
 */
export function ToggleCell<T>({ item, value, column, itemKey }: CellRendererProps<T>): JSX.Element {
  const boolValue = Boolean(value);

  const handleChange = useCallback(
    (_event: React.MouseEvent<HTMLElement>, checked?: boolean) => {
      if (column.onToggleChange && column.fieldName) {
        column.onToggleChange(itemKey, column.fieldName, checked ?? false);
      }
    },
    [column, itemKey]
  );

  // Stop propagation to prevent row click when clicking toggle
  const handleClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
  }, []);

  return (
    <div className={cellClass} onClick={handleClick}>
      <Toggle
        checked={boolValue}
        onText={column.toggleOnText || 'Yes'}
        offText={column.toggleOffText || 'No'}
        onChange={handleChange}
        disabled={!column.editable}
        styles={{
          root: { margin: 0 },
        }}
      />
    </div>
  );
}
