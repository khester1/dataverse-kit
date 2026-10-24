import React, { useCallback, useMemo } from 'react';
import { DatePicker, ComboBox, IComboBox, IComboBoxOption, mergeStyles } from '@fluentui/react';
import { CellRendererProps, IReusableColumn } from '../types';
import { DateCell } from '../renderers/DateCell';
import {
  editableCellClass,
  editableCellInputWrapperClass,
  dirtyCellIndicatorClass,
  errorCellIndicatorClass,
  cellErrorTextClass,
} from '../styles';

/**
 * Extended props for editable date cell.
 */
export interface EditableDateCellProps<T> extends CellRendererProps<T> {
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

// Styles for the DatePicker in edit mode
const datePickerStyles = {
  root: {
    width: '100%',
  },
  textField: {
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
      lineHeight: '28px',
    },
  },
};

const datePickerErrorStyles = {
  ...datePickerStyles,
  textField: {
    ...datePickerStyles.textField,
    fieldGroup: {
      ...datePickerStyles.textField.fieldGroup,
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
  },
};

// Narrower DatePicker when shown alongside time picker
const dateTimePickerStyles = {
  ...datePickerStyles,
  root: {
    flex: '1 1 60%',
    minWidth: 0,
  },
};

const dateTimePickerErrorStyles = {
  ...datePickerErrorStyles,
  root: {
    flex: '1 1 60%',
    minWidth: 0,
  },
};

// Styles for the time ComboBox -- match DatePicker's 28px height exactly
const timeComboBoxStyles = {
  root: {
    flex: '1 1 40%',
    minWidth: 0,
    height: 28,
  },
  container: {
    height: 28,
    minHeight: 28,
    selectors: {
      '::after': {
        // Remove Fluent's default focus border (we handle it ourselves)
        border: 'none',
      },
    },
  },
  input: {
    height: 26,
    fontSize: 13,
    padding: '0 0 0 8px',
    boxSizing: 'border-box' as const,
  },
  rootHovered: {
    border: '1px solid #c8c6c4',
    backgroundColor: 'white',
  },
  rootFocused: {
    border: '1px solid #0078d4',
    backgroundColor: 'white',
  },
  rootPressed: {
    border: '1px solid #0078d4',
    backgroundColor: 'white',
  },
};

const dateTimeRowClass = mergeStyles({
  display: 'flex',
  gap: 4,
  width: '100%',
  alignItems: 'flex-start',
});

/**
 * Build time options in 15-minute increments (12-hour format).
 */
function buildTimeOptions(): IComboBoxOption[] {
  const options: IComboBoxOption[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const ampm = h < 12 ? 'AM' : 'PM';
      const label = `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
      const key = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      options.push({ key, text: label });
    }
  }
  return options;
}

const TIME_OPTIONS = buildTimeOptions();

/**
 * Parse an ISO string or Date into a Date object. Returns null if invalid.
 */
function parseToDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const d = new Date(String(value));
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format a Date for display in the DatePicker.
 */
function formatDateForDisplay(date: Date | undefined): string {
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get HH:MM key from a Date for the time ComboBox.
 * Rounds to nearest 15-minute increment.
 */
function getTimeKey(date: Date): string {
  const h = date.getHours();
  const m = Math.round(date.getMinutes() / 15) * 15;
  const adjustedH = m === 60 ? h + 1 : h;
  const adjustedM = m === 60 ? 0 : m;
  const finalH = adjustedH % 24;
  return `${finalH.toString().padStart(2, '0')}:${adjustedM.toString().padStart(2, '0')}`;
}

/**
 * Build an ISO date-only string (YYYY-MM-DD) from a Date.
 */
function toDateOnlyISO(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Build an ISO datetime string from a Date.
 */
function toDateTimeISO(date: Date): string {
  return date.toISOString();
}

/**
 * Editable date/datetime cell renderer.
 * - Date-only fields: Fluent UI DatePicker (calendar popup)
 * - DateTime fields: DatePicker + time ComboBox side by side
 * Shows blue indicator when dirty, red indicator when has validation error.
 */
export function EditableDateCell<T extends { key: string }>({
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
}: EditableDateCellProps<T>): JSX.Element {
  const fieldName = column.fieldName || column.key;
  const currentValue = editedValue !== undefined ? editedValue : value;
  const isDateTime = column.fieldType === 'datetime';

  // Parse current value to a Date
  const currentDate = useMemo(() => parseToDate(currentValue), [currentValue]);

  // Current time key for the time ComboBox
  const currentTimeKey = useMemo(
    () => (currentDate ? getTimeKey(currentDate) : '09:00'),
    [currentDate]
  );

  // Validate helper
  const runValidation = useCallback(
    (newValue: unknown) => {
      const col = column as IReusableColumn<T> & {
        validate?: (value: unknown, rowKey: string) => string | undefined;
      };
      if (col.validate && onValidationError) {
        const error = col.validate(newValue, itemKey);
        onValidationError(itemKey, fieldName, error);
      }
    },
    [column, fieldName, itemKey, onValidationError]
  );

  // Handle date selection from DatePicker
  const handleDateSelect = useCallback(
    (date: Date | null | undefined) => {
      if (!date) {
        // Cleared
        runValidation(null);
        onValueChange(itemKey, fieldName, null, value);
        return;
      }

      if (isDateTime) {
        // Preserve existing time or default to 09:00
        const existingDate = parseToDate(currentValue);
        if (existingDate) {
          date.setHours(existingDate.getHours(), existingDate.getMinutes(), 0, 0);
        } else {
          date.setHours(9, 0, 0, 0);
        }
        const isoValue = toDateTimeISO(date);
        runValidation(isoValue);
        onValueChange(itemKey, fieldName, isoValue, value);
      } else {
        const isoValue = toDateOnlyISO(date);
        runValidation(isoValue);
        onValueChange(itemKey, fieldName, isoValue, value);
      }
    },
    [isDateTime, currentValue, itemKey, fieldName, value, onValueChange, runValidation]
  );

  // Handle time selection from ComboBox
  const handleTimeChange = useCallback(
    (_: React.FormEvent<IComboBox>, option?: IComboBoxOption, _index?: number, text?: string) => {
      // Determine the time key from selection or typed text
      let timeKey = option?.key as string | undefined;
      if (!timeKey && text) {
        // Try to parse typed text like "2:30 PM"
        const match = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
        if (match) {
          let h = parseInt(match[1], 10);
          const m = parseInt(match[2], 10);
          const ampm = match[3]?.toUpperCase();
          if (ampm === 'PM' && h < 12) h += 12;
          if (ampm === 'AM' && h === 12) h = 0;
          timeKey = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        }
      }
      if (!timeKey) return;

      const [hours, minutes] = timeKey.split(':').map(Number);
      const baseDate = parseToDate(currentValue) || new Date();
      const newDate = new Date(baseDate);
      newDate.setHours(hours, minutes, 0, 0);

      const isoValue = toDateTimeISO(newDate);
      runValidation(isoValue);
      onValueChange(itemKey, fieldName, isoValue, value);
    },
    [currentValue, itemKey, fieldName, value, onValueChange, runValidation]
  );

  // If not in edit mode, delegate to DateCell
  if (!isEditMode) {
    return (
      <DateCell
        item={item}
        column={column}
        value={value}
        itemKey={itemKey}
      />
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

  if (isDateTime) {
    // DateTime: DatePicker + Time ComboBox side by side
    return (
      <div className={editableCellClass}>
        <div className={wrapperClass}>
          <div className={dateTimeRowClass}>
            <DatePicker
              value={currentDate || undefined}
              onSelectDate={handleDateSelect}
              formatDate={formatDateForDisplay}
              placeholder="Select date"
              styles={errorMessage ? dateTimePickerErrorStyles : dateTimePickerStyles}
              ariaLabel={`${column.name} date for ${item.key}`}
              allowTextInput
            />
            <ComboBox
              selectedKey={currentDate ? currentTimeKey : undefined}
              options={TIME_OPTIONS}
              onChange={handleTimeChange}
              placeholder="Time"
              styles={timeComboBoxStyles}
              ariaLabel={`${column.name} time for ${item.key}`}
              allowFreeform
              autoComplete="on"
            />
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

  // Date-only: DatePicker
  return (
    <div className={editableCellClass}>
      <div className={wrapperClass}>
        <DatePicker
          value={currentDate || undefined}
          onSelectDate={handleDateSelect}
          formatDate={formatDateForDisplay}
          placeholder="Select date"
          styles={errorMessage ? datePickerErrorStyles : datePickerStyles}
          ariaLabel={`${column.name} for ${item.key}`}
          allowTextInput
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
