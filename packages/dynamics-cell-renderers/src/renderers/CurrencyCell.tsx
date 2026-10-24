import React from 'react';
import { Text } from '@fluentui/react';
import { CellRendererProps } from '../types';
import { cellClass, currencyCellClass } from '../styles';
import { formatCurrency } from '@khester/dynamics-utils';

/**
 * Currency cell renderer.
 * Displays formatted currency values with locale support.
 */
export function CurrencyCell<T>({ value, column, item }: CellRendererProps<T>): JSX.Element {
  const numericValue = typeof value === 'number' ? value : null;

  const displayValue = column.formatValue
    ? column.formatValue(value, item)
    : numericValue !== null
      ? formatCurrency(numericValue, column.currencyCode || 'USD', column.locale || 'en-US')
      : '-';

  return (
    <div className={cellClass}>
      <Text className={currencyCellClass} title={displayValue}>
        {displayValue}
      </Text>
    </div>
  );
}
