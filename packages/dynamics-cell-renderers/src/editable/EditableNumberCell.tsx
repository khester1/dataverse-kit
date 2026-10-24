import React, { useState, useCallback, useEffect, useRef } from 'react';
import { TextField, mergeStyles } from '@fluentui/react';
import { CellRendererProps, IReusableColumn } from '../types';
import {
  editableCellClass,
  editableCellInputWrapperClass,
  dirtyCellIndicatorClass,
  errorCellIndicatorClass,
  cellErrorTextClass,
  currencyCellClass,
} from '../styles';
import { formatCurrency, formatNumber } from '@khester/dynamics-utils';

/**
 * Extended props for editable number cell.
 */
export interface EditableNumberCellProps<T> extends CellRendererProps<T> {
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
  /** Whether to format as currency */
  isCurrency?: boolean;
}

// Styles for the number input in edit mode
const numberFieldStyles = {
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
    textAlign: 'right',
  },
};

const numberFieldErrorStyles = {
  ...numberFieldStyles,
  fieldGroup: {
    ...numberFieldStyles.fieldGroup,
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
  textAlign: 'right',
  width: '100%',
});

/**
 * Parse a string to a number, handling currency formats.
 */
function parseNumericValue(value: string): number | null {
  if (!value || value.trim() === '') return null;

  // Remove currency symbols, thousands separators, and whitespace
  const cleaned = value.replace(/[$\u20ac\u00a3\u00a5,\s]/g, '');

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Editable number cell renderer.
 * Displays formatted number/currency in read mode, as TextField in edit mode.
 * Shows blue indicator when dirty, red indicator when has validation error.
 */
export function EditableNumberCell<T extends { key: string }>({
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
  isCurrency = false,
}: EditableNumberCellProps<T>): JSX.Element {
  const fieldName = column.fieldName || column.key;
  const currentValue = editedValue !== undefined ? editedValue : value;
  const numericValue = typeof currentValue === 'number' ? currentValue : null;

  // For edit mode, show raw number
  const editDisplayValue = numericValue !== null ? String(numericValue) : '';

  // Local state for immediate input feedback
  const [localValue, setLocalValue] = useState(editDisplayValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync local value when props change
  useEffect(() => {
    setLocalValue(editDisplayValue);
  }, [editDisplayValue]);

  // Handle input change
  const handleChange = useCallback(
    (_: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) => {
      const val = newValue ?? '';
      setLocalValue(val);

      // Parse to number
      const parsedValue = parseNumericValue(val);

      // Validate if column has validate function
      const col = column as IReusableColumn<T> & { validate?: (value: unknown, rowKey: string) => string | undefined };
      if (col.validate && onValidationError) {
        const error = col.validate(parsedValue, itemKey);
        onValidationError(itemKey, fieldName, error);
      }

      // Notify parent of change
      onValueChange(itemKey, fieldName, parsedValue, value);
    },
    [column, fieldName, itemKey, value, onValueChange, onValidationError]
  );

  // Handle blur - validate and format
  const handleBlur = useCallback(() => {
    const parsedValue = parseNumericValue(localValue);

    const col = column as IReusableColumn<T> & { validate?: (value: unknown, rowKey: string) => string | undefined };
    if (col.validate && onValidationError) {
      const error = col.validate(parsedValue, itemKey);
      onValidationError(itemKey, fieldName, error);
    }

    // Update local value to show the parsed number
    if (parsedValue !== null) {
      setLocalValue(String(parsedValue));
    } else if (localValue.trim() === '') {
      setLocalValue('');
    }
  }, [column, fieldName, itemKey, localValue, onValidationError]);

  // If not in edit mode, show formatted read-only text
  if (!isEditMode) {
    const locale = column.locale || 'en-US';
    const currencyCode = column.currencyCode || 'USD';

    let displayValue: string;
    if (column.formatValue) {
      displayValue = column.formatValue(value, item);
    } else if (numericValue !== null) {
      displayValue = isCurrency || column.fieldType === 'currency'
        ? formatCurrency(numericValue, currencyCode, locale)
        : formatNumber(numericValue, locale);
    } else {
      displayValue = '-';
    }

    return (
      <div className={editableCellClass}>
        <span
          className={mergeStyles(readOnlyClass, isCurrency || column.fieldType === 'currency' ? currencyCellClass : '')}
          title={displayValue !== '-' ? displayValue : undefined}
        >
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
          styles={errorMessage ? numberFieldErrorStyles : numberFieldStyles}
          ariaLabel={`${column.name} for ${item.key}`}
          type="text"
          inputMode="decimal"
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
