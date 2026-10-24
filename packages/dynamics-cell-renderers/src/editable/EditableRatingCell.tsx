import React, { useCallback } from 'react';
import { Icon, mergeStyles } from '@fluentui/react';
import { CellRendererProps, IReusableColumn } from '../types';
import { RatingCell } from '../renderers/RatingCell';
import { EMOJI_SETS, EMOJI_COLORS, clampFaceCount } from '../renderers/emojiRating';
import {
  editableCellClass,
  editableCellInputWrapperClass,
  dirtyCellIndicatorClass,
  errorCellIndicatorClass,
  cellErrorTextClass,
} from '../styles';

/**
 * Extended props for the editable rating cell.
 */
export interface EditableRatingCellProps<T> extends CellRendererProps<T> {
  /** Whether the grid is in edit mode */
  isEditMode: boolean;
  /** Whether this cell has been modified */
  isDirty: boolean;
  /** Current edited value (if different from original) */
  editedValue?: unknown;
  /** Callback when value changes */
  onValueChange: (rowKey: string, fieldName: string, value: unknown, originalValue: unknown) => void;
  /** Validation error message */
  errorMessage?: string;
  /** Callback when validation error changes */
  onValidationError?: (rowKey: string, fieldName: string, error: string | undefined) => void;
}

const btnBaseStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  margin: 0,
  cursor: 'pointer',
  lineHeight: 1,
};
const starBtnStyle: React.CSSProperties = { ...btnBaseStyle, fontSize: 16 };

/**
 * Editable rating cell renderer.
 * Read mode delegates to `RatingCell` (stars or a single sentiment emoji);
 * edit mode renders clickable stars / faces (click to set, click the selected
 * one again to clear, arrow keys to adjust). Shows blue indicator when dirty,
 * red when it has a validation error.
 *
 * NOTE: `ratingStyle: 'emoji'` renders Fluent `<Icon>`s — the host must have
 * called `initializeIcons()`.
 */
export function EditableRatingCell<T extends { key: string }>({
  item,
  column,
  value,
  itemKey,
  isEditMode,
  isDirty,
  editedValue,
  onValueChange,
  errorMessage,
  onValidationError,
}: EditableRatingCellProps<T>): JSX.Element {
  const fieldName = column.fieldName || column.key;

  const isEmoji = column.ratingStyle === 'emoji';
  const count = isEmoji
    ? clampFaceCount(column.ratingFaceCount, column.ratingMax)
    : column.ratingMax && column.ratingMax > 0
    ? Math.floor(column.ratingMax)
    : 5;

  const current = editedValue !== undefined ? editedValue : value;
  const rawCurrent = typeof current === 'number' ? current : Number(current);
  const selected = Number.isFinite(rawCurrent) ? Math.min(count, Math.max(0, Math.round(rawCurrent))) : 0;

  const commit = useCallback(
    (n: number): void => {
      const next = n <= 0 ? null : n;
      const col = column as IReusableColumn<T> & {
        validate?: (v: unknown, rowKey: string) => string | undefined;
      };
      if (col.validate && onValidationError) {
        onValidationError(itemKey, fieldName, col.validate(next, itemKey));
      }
      onValueChange(itemKey, fieldName, next, value);
    },
    [column, fieldName, itemKey, value, onValueChange, onValidationError]
  );

  // Read mode → shared display (stars or single sentiment face).
  if (!isEditMode) {
    return <RatingCell item={item} column={column} value={value} itemKey={itemKey} />;
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      commit(Math.min(count, selected + 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      commit(Math.max(0, selected - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      commit(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      commit(count);
    }
  };

  let indicatorClass = '';
  if (errorMessage) indicatorClass = errorCellIndicatorClass;
  else if (isDirty) indicatorClass = dirtyCellIndicatorClass;
  const wrapperClass = mergeStyles(editableCellInputWrapperClass, indicatorClass);

  const buttons: JSX.Element[] = [];
  for (let i = 1; i <= count; i++) {
    // Click the currently-selected value again to clear it.
    const onClick = (): void => commit(i === selected ? 0 : i);
    if (isEmoji) {
      const set = EMOJI_SETS[count];
      const isSel = i === selected;
      const useColor = column.ratingUseSentimentColor !== false;
      const color = isSel
        ? useColor
          ? EMOJI_COLORS[count][i - 1]
          : column.ratingColor || '#0078d4'
        : '#c8c6c4';
      buttons.push(
        <button
          key={i}
          type="button"
          onClick={onClick}
          title={set.labels[i - 1]}
          aria-label={set.labels[i - 1]}
          aria-hidden
          tabIndex={-1}
          style={btnBaseStyle}
        >
          <Icon iconName={set.icons[i - 1]} style={{ color, fontSize: 18 }} />
        </button>
      );
    } else {
      const filledColor = column.ratingColor || '#ffb900';
      buttons.push(
        <button
          key={i}
          type="button"
          onClick={onClick}
          aria-label={`${i} of ${count}`}
          aria-hidden
          tabIndex={-1}
          style={{ ...starBtnStyle, color: i <= selected ? filledColor : '#c8c6c4' }}
        >
          ★
        </button>
      );
    }
  }

  return (
    <div className={editableCellClass}>
      <div className={wrapperClass}>
        <div
          role="slider"
          aria-valuemin={0}
          aria-valuemax={count}
          aria-valuenow={selected}
          aria-label={`${column.name} for ${item.key}`}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          style={{ display: 'flex', gap: 2, alignItems: 'center' }}
        >
          {buttons}
        </div>
        {errorMessage && (
          <span className={cellErrorTextClass} title={errorMessage}>
            {errorMessage}
          </span>
        )}
      </div>
    </div>
  );
}
