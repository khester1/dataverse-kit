import React from 'react';
import { Text } from '@fluentui/react';
import { CellRendererProps } from '../types';
import { cellClass } from '../styles';
import { formatNumber } from '@khester/dynamics-utils';

/**
 * Number cell renderer.
 * Displays formatted numeric values with locale support.
 */
export function NumberCell<T>({ value, column, item }: CellRendererProps<T>): JSX.Element {
  const numericValue = typeof value === 'number' ? value : null;
  const locale = column.locale || 'en-US';

  const displayValue = column.formatValue
    ? column.formatValue(value, item)
    : numericValue !== null
      ? formatNumber(numericValue, locale)
      : '-';

  return (
    <div className={cellClass}>
      <Text
        title={displayValue !== '-' ? displayValue : undefined}
        styles={{
          root: {
            textAlign: 'right',
            width: '100%',
          },
        }}
      >
        {displayValue}
      </Text>
    </div>
  );
}
