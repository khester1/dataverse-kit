import React from 'react';
import { CellRendererProps } from '../types';
import { cellClass, coloredBadgeClass } from '../styles';
import { getContrastColor, normalizeHexColor } from '@khester/dynamics-utils';

/**
 * Colored cell renderer.
 * Displays text with a colored background based on value.
 */
export function ColoredCell<T>({ item, value, column }: CellRendererProps<T>): JSX.Element {
  // Get display text
  const displayValue = column.formatValue
    ? column.formatValue(value, item)
    : value !== null && value !== undefined
      ? String(value)
      : '-';

  if (displayValue === '-') {
    return <div className={cellClass}>-</div>;
  }

  // Get background color
  let backgroundColor: string | undefined;

  if (column.getBackgroundColor && value !== null && value !== undefined) {
    backgroundColor = column.getBackgroundColor(value as string | number);
  } else if (column.colorMap && value !== null && value !== undefined) {
    const key = typeof value === 'number' ? value : String(value);
    backgroundColor = column.colorMap[key];
  }

  // If no color mapping, render as plain text
  if (!backgroundColor) {
    return (
      <div className={cellClass}>
        {displayValue}
      </div>
    );
  }

  const normalizedBg = normalizeHexColor(backgroundColor);
  const textColor = getContrastColor(normalizedBg);

  return (
    <div className={cellClass}>
      <span
        className={coloredBadgeClass}
        style={{
          backgroundColor: normalizedBg,
          color: textColor,
        }}
      >
        {displayValue}
      </span>
    </div>
  );
}
