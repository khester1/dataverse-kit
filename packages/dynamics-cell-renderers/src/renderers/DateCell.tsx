import React from 'react';
import { Text } from '@fluentui/react';
import { CellRendererProps } from '../types';
import { cellClass } from '../styles';
import { formatDate, formatDateTime } from '@khester/dynamics-utils';

/**
 * Date cell renderer.
 * Displays formatted date or datetime values.
 */
export function DateCell<T>({ value, column, item }: CellRendererProps<T>): JSX.Element {
  const stringValue = value !== null && value !== undefined ? String(value) : null;
  const locale = column.locale || 'en-US';

  let displayValue: string;

  if (column.formatValue) {
    displayValue = column.formatValue(value, item);
  } else if (stringValue) {
    displayValue = column.fieldType === 'datetime'
      ? formatDateTime(stringValue, locale)
      : formatDate(stringValue, locale);
  } else {
    displayValue = '-';
  }

  return (
    <div className={cellClass}>
      <Text title={displayValue !== '-' ? displayValue : undefined}>
        {displayValue}
      </Text>
    </div>
  );
}
