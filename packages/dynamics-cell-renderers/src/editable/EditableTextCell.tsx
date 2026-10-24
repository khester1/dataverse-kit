import React, { useState, useCallback, useEffect, useRef } from 'react';
import { TextField, mergeStyles } from '@fluentui/react';
import { CellRendererProps, IReusableColumn } from '../types';
import {
  editableCellClass,
  editableCellInputWrapperClass,
  dirtyCellIndicatorClass,
  errorCellIndicatorClass,
  cellErrorTextClass,
} from '../styles';

/**
 * Extended props for editable text cell.
 */
export interface EditableTextCellProps<T> extends CellRendererProps<T> {
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

// Styles for the text field in edit mode
const textFieldStyles = {
  root: {
    width: '100%',
  },
  fieldGroup: {
    height: 28,
    minHeight: 28,
    border: 'none',
    backgroundColor: 'transparent',
    selectors: {
      ':hover': {
        border: '1px solid #c8c6c4',
        backgroundColor: 'white',
      },
      ':focus-within': {
        border: '1px solid #0078d4',
        backgroundColor: 'white',
      },
    },
  },
  field: {
    fontSize: 13,
    padding: '0 8px',
  },
};

const textFieldErrorStyles = {
  ...textFieldStyles,
  fieldGroup: {
    ...textFieldStyles.fieldGroup,
    border: '1px solid #d13438',
    selectors: {
      ':hover': {
        border: '1px solid #d13438',
        backgroundColor: 'white',
      },
      ':focus-within': {
        border: '1px solid #d13438',
        backgroundColor: 'white',
      },
    },
  },
};

const readOnlyClass = mergeStyles({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: 13,
});

/**
 * Editable text cell renderer.
 * Displays as text in read mode, as TextField in edit mode.
 * Shows blue indicator when dirty, red indicator when has validation error.
 */
export function EditableTextCell<T extends { key: string }>({
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
}: EditableTextCellProps<T>): JSX.Element {
  const fieldName = column.fieldName || column.key;
  const currentValue = editedValue !== undefined ? editedValue : value;
  const stringValue = currentValue !== null && currentValue !== undefined
    ? String(currentValue)
    : '';

  // Local state for immediate input feedback
  const [localValue, setLocalValue] = useState(stringValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync local value when props change
  useEffect(() => {
    setLocalValue(stringValue);
  }, [stringValue]);

  // Handle input change
  const handleChange = useCallback(
    (_: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) => {
      const val = newValue ?? '';
      setLocalValue(val);

      // Validate if column has validate function
      const col = column as IReusableColumn<T> & { validate?: (value: unknown, rowKey: string) => string | undefined };
      if (col.validate && onValidationError) {
        const error = col.validate(val, itemKey);
        onValidationError(itemKey, fieldName, error);
      }

      // Notify parent of change
      onValueChange(itemKey, fieldName, val || null, value);
    },
    [column, fieldName, itemKey, value, onValueChange, onValidationError]
  );

  // Handle blur - final validation
  const handleBlur = useCallback(() => {
    const col = column as IReusableColumn<T> & { validate?: (value: unknown, rowKey: string) => string | undefined };
    if (col.validate && onValidationError) {
      const error = col.validate(localValue, itemKey);
      onValidationError(itemKey, fieldName, error);
    }
  }, [column, fieldName, itemKey, localValue, onValidationError]);

  // If not in edit mode, show read-only text
  if (!isEditMode) {
    const displayValue = column.formatValue
      ? column.formatValue(value, item)
      : stringValue || '-';

    return (
      <div className={editableCellClass}>
        <span className={readOnlyClass} title={displayValue !== '-' ? displayValue : undefined}>
          {displayValue}
        </span>
      </div>
    );
  }

  // Determine indicator class
  let indicatorClass = '';
  if (errorMessage) {
    indicatorClass = errorCellIndicatorClass;
  } else if (isDirty) {
    indicatorClass = dirtyCellIndicatorClass;
  }

  const wrapperClass = mergeStyles(editableCellInputWrapperClass, indicatorClass);

  return (
    <div className={editableCellClass}>
      <div className={wrapperClass}>
        <TextField
          componentRef={inputRef as React.RefObject<any>}
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          borderless
          styles={errorMessage ? textFieldErrorStyles : textFieldStyles}
          ariaLabel={`${column.name} for ${item.key}`}
        />
        {errorMessage && (
          <span className={cellErrorTextClass} title={errorMessage}>
            {errorMessage}
          </span>
        )}
      </div>
    </div>
  );
}
