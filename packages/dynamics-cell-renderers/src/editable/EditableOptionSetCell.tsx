import React, { useCallback, useMemo } from 'react';
import { Dropdown, Icon, IDropdownOption, mergeStyles } from '@fluentui/react';
import { CellRendererProps, IReusableColumn } from '../types';
import { OptionSetCell } from '../renderers/OptionSetCell';
import {
  editableCellClass,
  editableCellInputWrapperClass,
  dirtyCellIndicatorClass,
  errorCellIndicatorClass,
  cellErrorTextClass,
} from '../styles';

/**
 * Extended props for editable option set cell.
 */
export interface EditableOptionSetCellProps<T> extends CellRendererProps<T> {
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

// Styles for the dropdown in edit mode
const dropdownStyles = {
  root: {
    width: '100%',
  },
  dropdown: {
    height: 28,
    minHeight: 28,
    border: 'none',
    backgroundColor: 'transparent',
    selectors: {
      ':hover': {
        border: '1px solid #c8c6c4',
        backgroundColor: 'white',
      },
      ':focus::after': {
        border: '1px solid #0078d4',
      },
    },
  },
  title: {
    height: 28,
    lineHeight: '26px',
    fontSize: 13,
    border: 'none',
    backgroundColor: 'transparent',
  },
  caretDownWrapper: {
    height: 28,
    lineHeight: '28px',
  },
  dropdownItem: {
    fontSize: 13,
    minHeight: 32,
  },
  dropdownItemSelected: {
    fontSize: 13,
    minHeight: 32,
  },
};

const dropdownErrorStyles = {
  ...dropdownStyles,
  dropdown: {
    ...dropdownStyles.dropdown,
    border: '1px solid #d13438',
    selectors: {
      ':hover': {
        border: '1px solid #d13438',
        backgroundColor: 'white',
      },
      ':focus::after': {
        border: '1px solid #d13438',
      },
    },
  },
};

/**
 * Editable option set cell renderer.
 * Displays as colored badge (OptionSetCell) in read mode, as Dropdown in edit mode.
 * Shows blue indicator when dirty, red indicator when has validation error.
 */
export function EditableOptionSetCell<T extends { key: string }>({
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
}: EditableOptionSetCellProps<T>): JSX.Element {
  const fieldName = column.fieldName || column.key;
  const currentValue = editedValue !== undefined ? editedValue : value;
  const isMulti = !!column.optionSetMultiSelect;
  const hasIcons = column.optionSetOptions?.some((o) => !!o.iconName) ?? false;

  // Build dropdown options. Keys preserve the option's value type (number or
  // string) — no Number() coercion. Single-select prepends a (None) option;
  // multi-select clears by de-selecting. `data` carries icon/color for rendering.
  const dropdownOptions = useMemo<IDropdownOption[]>(() => {
    const options: IDropdownOption[] = isMulti ? [] : [{ key: '__none__', text: '(None)' }];
    column.optionSetOptions?.forEach((opt) => {
      options.push({
        key: opt.value,
        text: opt.label,
        data: { iconName: opt.iconName, color: opt.color },
      });
    });
    return options;
  }, [column.optionSetOptions, isMulti]);

  const validate = useCallback(
    (next: unknown) => {
      const col = column as IReusableColumn<T> & {
        validate?: (value: unknown, rowKey: string) => string | undefined;
      };
      if (col.validate && onValidationError) {
        onValidationError(itemKey, fieldName, col.validate(next, itemKey));
      }
    },
    [column, fieldName, itemKey, onValidationError]
  );

  // Single-select change → the picked value (type preserved) or null for (None).
  const handleChangeSingle = useCallback(
    (_: React.FormEvent<HTMLDivElement>, option?: IDropdownOption) => {
      if (!option) return;
      const newValue = option.key === '__none__' ? null : option.key;
      validate(newValue);
      onValueChange(itemKey, fieldName, newValue, value);
    },
    [fieldName, itemKey, value, onValueChange, validate]
  );

  // Multi-select change → toggle the option into/out of the value array.
  const handleChangeMulti = useCallback(
    (_: React.FormEvent<HTMLDivElement>, option?: IDropdownOption) => {
      if (!option) return;
      const prev = Array.isArray(currentValue) ? [...(currentValue as Array<string | number>)] : [];
      const next = option.selected
        ? [...prev, option.key]
        : prev.filter((k) => String(k) !== String(option.key));
      validate(next);
      onValueChange(itemKey, fieldName, next, value);
    },
    [currentValue, fieldName, itemKey, value, onValueChange, validate]
  );

  // If not in edit mode, delegate to OptionSetCell for the colored badge display.
  if (!isEditMode) {
    return <OptionSetCell item={item} column={column} value={value} itemKey={itemKey} />;
  }

  // Render per-option icon + label (only wired when some option has an icon).
  const onRenderOption = (option?: IDropdownOption): JSX.Element | null => {
    if (!option) return null;
    const data = option.data as { iconName?: string; color?: string } | undefined;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {data?.iconName && <Icon iconName={data.iconName} style={{ color: data.color, fontSize: 14 }} />}
        <span>{option.text}</span>
      </span>
    );
  };

  let indicatorClass = '';
  if (errorMessage) {
    indicatorClass = errorCellIndicatorClass;
  } else if (isDirty) {
    indicatorClass = dirtyCellIndicatorClass;
  }
  const wrapperClass = mergeStyles(editableCellInputWrapperClass, indicatorClass);

  const selectedKey =
    currentValue !== null && currentValue !== undefined ? (currentValue as string | number) : '__none__';
  // Cast to Fluent's homogeneous-array prop type; an optionset's keys are all the
  // same type at runtime (all numeric or all string), so this is safe.
  const selectedKeys = (Array.isArray(currentValue)
    ? (currentValue as Array<string | number>)
    : []) as string[];

  return (
    <div className={editableCellClass}>
      <div className={wrapperClass}>
        <Dropdown
          multiSelect={isMulti || undefined}
          selectedKey={isMulti ? undefined : selectedKey}
          selectedKeys={isMulti ? selectedKeys : undefined}
          options={dropdownOptions}
          onChange={isMulti ? handleChangeMulti : handleChangeSingle}
          onRenderOption={hasIcons ? onRenderOption : undefined}
          styles={errorMessage ? dropdownErrorStyles : dropdownStyles}
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
