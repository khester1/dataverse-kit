import React from 'react';
import { CellRendererProps } from '../types';
import {
  progressBarContainerClass,
  progressBarBackgroundClass,
  progressBarFillClass,
  progressBarLabelClass,
} from '../styles';

/**
 * Progress bar cell renderer.
 * Displays a horizontal progress bar with optional label.
 */
export function ProgressBarCell<T>({ value, column }: CellRendererProps<T>): JSX.Element {
  const numericValue = typeof value === 'number' ? value : 0;
  const maxValue = column.progressMax || 100;
  const percentage = Math.min(100, Math.max(0, (numericValue / maxValue) * 100));
  const progressColor = column.progressColor || '#0078d4';
  const showLabel = column.showProgressLabel !== false;

  return (
    <div className={progressBarContainerClass}>
      <div className={progressBarBackgroundClass}>
        <div
          className={progressBarFillClass}
          style={{
            width: `${percentage}%`,
            backgroundColor: progressColor,
          }}
        />
      </div>
      {showLabel && (
        <span className={progressBarLabelClass}>
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}
