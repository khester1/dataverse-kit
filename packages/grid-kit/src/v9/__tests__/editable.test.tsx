// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { CellRendererType, ColumnDef, GridCellProps } from '../../types';
import {
  EditableTextCell,
  EditableNumberCell,
  EditableDateCell,
  EditableOptionSetCell,
  EditableRatingCell,
} from '../cells/editable';
import { DataGrid } from '../hosts/DataGrid';
import { wrapper } from './testUtils';

afterEach(cleanup);

/** Build a GridCellProps for an editable cell (isEditing defaults to true). */
function ecp<T extends Record<string, unknown>>(
  rendererType: CellRendererType,
  value: unknown,
  opts: {
    isEditing?: boolean;
    editedValue?: unknown;
    formattedValue?: string;
    rendererConfig?: Record<string, unknown>;
    editorType?: ColumnDef<T>['editorType'];
    validate?: ColumnDef<T>['validate'];
    onValueChange?: GridCellProps<T>['onValueChange'];
    onValidationError?: GridCellProps<T>['onValidationError'];
    errorMessage?: string;
    isDirty?: boolean;
  } = {},
): GridCellProps<T> {
  return {
    value,
    formattedValue: opts.formattedValue ?? (value == null ? '' : String(value)),
    item: {} as T,
    itemKey: 'row-1',
    column: {
      key: 'c',
      fieldName: 'f',
      name: 'Field',
      rendererType,
      editorType: opts.editorType ?? 'text',
      rendererConfig: opts.rendererConfig,
      validate: opts.validate,
    },
    isEditing: opts.isEditing ?? true,
    isDirty: opts.isDirty,
    editedValue: opts.editedValue,
    errorMessage: opts.errorMessage,
    onValueChange: opts.onValueChange,
    onValidationError: opts.onValidationError,
  };
}

describe('v9 editable cells', () => {
  it('EditableTextCell edits + bubbles onValueChange', () => {
    const onValueChange = vi.fn();
    render(<EditableTextCell {...ecp('text', 'Hello', { onValueChange })} />, { wrapper });
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('Hello');
    fireEvent.change(input, { target: { value: 'World' } });
    expect(onValueChange).toHaveBeenCalledWith('row-1', 'f', 'World', 'Hello');
  });

  it('EditableTextCell shows the read cell when not editing', () => {
    render(<EditableTextCell {...ecp('text', 'raw', { isEditing: false, formattedValue: 'Read Me' })} />, { wrapper });
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByText('Read Me')).toBeTruthy();
  });

  it('EditableTextCell runs column.validate → onValidationError', () => {
    const onValidationError = vi.fn();
    const validate = (v: unknown) => (String(v).length > 3 ? 'Too long' : undefined);
    render(<EditableTextCell {...ecp('text', 'ab', { validate, onValidationError, onValueChange: vi.fn() })} />, { wrapper });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'abcd' } });
    expect(onValidationError).toHaveBeenCalledWith('row-1', 'f', 'Too long');
  });

  it('EditableNumberCell parses a formatted number', () => {
    const onValueChange = vi.fn();
    render(<EditableNumberCell {...ecp('number', 100, { onValueChange })} />, { wrapper });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '1,234' } });
    expect(onValueChange).toHaveBeenCalledWith('row-1', 'f', 1234, 100);
  });

  it('EditableNumberCell (currency) shows the read currency cell when not editing', () => {
    render(<EditableNumberCell {...ecp('currency', 1000, { isEditing: false, formattedValue: '$1,000.00' })} />, { wrapper });
    expect(screen.getByText('$1,000.00')).toBeTruthy();
  });

  it('EditableDateCell edits a date value', () => {
    const onValueChange = vi.fn();
    render(<EditableDateCell {...ecp('date', '2026-01-12', { editorType: 'date', onValueChange })} />, { wrapper });
    const input = screen.getByLabelText('Field') as HTMLInputElement;
    expect(input.type).toBe('date');
    fireEvent.change(input, { target: { value: '2026-02-20' } });
    expect(onValueChange).toHaveBeenCalledWith('row-1', 'f', '2026-02-20', '2026-01-12');
  });

  it('EditableOptionSetCell renders a dropdown editing + a badge reading', () => {
    const cfg = { options: [{ value: 1, label: 'Active' }, { value: 2, label: 'Closed' }] };
    const { rerender } = render(
      <EditableOptionSetCell {...ecp('optionset', 1, { editorType: 'dropdown', rendererConfig: cfg })} />,
      { wrapper },
    );
    expect(screen.getByRole('combobox')).toBeTruthy();
    rerender(
      <EditableOptionSetCell {...ecp('optionset', 1, { isEditing: false, editorType: 'dropdown', rendererConfig: cfg })} />,
    );
    expect(screen.getByText('Active')).toBeTruthy();
  });

  it('EditableRatingCell commits via keyboard (ArrowRight) + reads as stars', () => {
    const onValueChange = vi.fn();
    render(<EditableRatingCell {...ecp('rating', 2, { editorType: 'number', rendererConfig: { max: 5 }, onValueChange })} />, {
      wrapper,
    });
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });
    expect(onValueChange).toHaveBeenCalledWith('row-1', 'f', 3, 2);
  });

  it('shows the validation error message', () => {
    render(<EditableTextCell {...ecp('text', 'x', { errorMessage: 'Required', onValueChange: vi.fn() })} />, { wrapper });
    expect(screen.getByText('Required')).toBeTruthy();
  });
});

describe('v9 DataGrid inline editing (click-to-edit)', () => {
  interface Row extends Record<string, unknown> {
    key: string;
    name: string;
  }
  const items: Row[] = [{ key: '1', name: 'Alpha' }];
  const columns: ColumnDef<Row>[] = [
    { key: 'name', fieldName: 'name', name: 'Name', rendererType: 'text', editorType: 'text' },
  ];

  it('click-to-edit enters edit mode and bubbles the change', () => {
    const onValueChange = vi.fn();
    render(<DataGrid items={items} columns={columns} editable onValueChange={onValueChange} />, { wrapper });
    // Read mode initially — a click-to-edit affordance, no input.
    expect(screen.queryByRole('textbox')).toBeNull();
    fireEvent.click(screen.getByTitle('Click to edit'));
    // Now the active cell is editing.
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('Alpha');
    fireEvent.change(input, { target: { value: 'Beta' } });
    expect(onValueChange).toHaveBeenCalledWith('1', 'name', 'Beta', 'Alpha');
  });

  it('editTrigger="always" shows every editor at once (no click needed)', () => {
    render(<DataGrid items={items} columns={columns} editable editTrigger="always" onValueChange={vi.fn()} />, { wrapper });
    expect(screen.getByRole('textbox')).toBeTruthy();
  });
});
