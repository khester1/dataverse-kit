import React from 'react';
import { Text } from '@fluentui/react';
import { CellRendererProps } from '../types';
import { cellClass } from '../styles';

/**
 * Basic text cell renderer.
 * Displays text with optional truncation and tooltip.
 */
export function TextCell<T>({ value, column, item }: CellRendererProps<T>): JSX.Element {
  const displayValue = column.formatValue
    ? column.formatValue(value, item)
    : value;

  const textValue = displayValue !== null && displayValue !== undefined
    ? String(displayValue)
    : '-';

  return (
    <div className={cellClass}>
      <Text
        title={textValue !== '-' ? textValue : undefined}
        styles={{
          root: {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          },
        }}
      >
        {textValue}
      </Text>
    </div>
  );
}
