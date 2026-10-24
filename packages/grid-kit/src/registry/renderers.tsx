/**
 * Wrapper factories that adapt grid-kit `GridCellProps` onto a canonical
 * @khester/dynamics-cell-renderers component. The returned value is a React
 * COMPONENT (rendered as an element by the adapters / DataGrid — never called
 * as a function), so the canonical editable cells' hooks stay legal.
 */
import React from 'react';
import type { CellRendererProps as LibCellProps, IReusableColumn } from '@khester/dynamics-cell-renderers';
import type { GridCellProps, GridCellRenderer } from '../types';
import { toReusableColumn } from './columnMapping';

/* eslint-disable @typescript-eslint/no-explicit-any */
type LibComponent = React.ComponentType<any>;

const noop = (): void => undefined;

/** Ensure the row exposes a `.key` (some canonical editable cells require it). */
function ensureKey<T>(item: T, key: string): T {
  if (item && typeof item === 'object' && (item as any).key !== undefined) return item;
  return { ...(item as any), key } as T;
}

/**
 * Bridge the display value into the canonical renderer's `formatValue` path so
 * read cells honor the right label instead of re-deriving from the raw code.
 * Precedence: user-provided formatValue > host-supplied formatted value
 * (Dataverse optionset/lookup label) > optionset value→label map > the
 * computed fallback for numeric/date types (which also fixes numeric-string
 * values that the canonical Currency/Number cells would otherwise render as '-').
 * Mutates the freshly-mapped column (a new object per render — safe).
 */
function applyDisplayValue<T>(column: IReusableColumn<T>, props: GridCellProps<T>): void {
  if (column.formatValue) return; // explicit user formatter wins
  if (props.suppliedFormattedValue) {
    const s = props.suppliedFormattedValue;
    column.formatValue = () => s;
    return;
  }
  switch (column.fieldType) {
    case 'optionset': {
      const opts = column.optionSetOptions;
      if (opts && opts.length) {
        column.formatValue = (v: unknown) => {
          const o = opts.find((opt) => String(opt.value) === String(v));
          return o ? o.label : v !== null && v !== undefined && v !== '' ? String(v) : '-';
        };
      }
      return;
    }
    case 'currency':
    case 'number':
    case 'date':
    case 'datetime': {
      const fv = props.formattedValue;
      column.formatValue = () => fv || '-';
      return;
    }
    default:
      return;
  }
}

/** Read-only wrapper: maps GridCellProps → the canonical CellRendererProps. */
export function makeReadWrapper(Comp: LibComponent, displayName: string): GridCellRenderer {
  const Wrapped: React.FC<GridCellProps> = (props) => {
    const column = toReusableColumn(props.column);
    applyDisplayValue(column, props);
    // Editable toggles render an interactive ToggleCell (no editable variant
    // exists); wire its change back to the grid's onValueChange so edits persist.
    if (column.editable && !column.onToggleChange && props.onValueChange) {
      const onVC = props.onValueChange;
      const original = props.value;
      column.onToggleChange = (key: string, fieldName: string, v: boolean) =>
        onVC(key, fieldName, v, original);
    }
    const cellProps: LibCellProps<any> = {
      item: props.item,
      column,
      value: props.value,
      itemKey: props.itemKey,
    };
    return <Comp {...cellProps} />;
  };
  Wrapped.displayName = displayName;
  return Wrapped as GridCellRenderer;
}

/** Editable wrapper: threads edit-state onto the canonical editable cell props. */
export function makeEditWrapper(Comp: LibComponent, displayName: string): GridCellRenderer {
  const Wrapped: React.FC<GridCellProps> = (props) => {
    const column = toReusableColumn(props.column);
    applyDisplayValue(column, props); // read-mode display of an editable cell
    const item = ensureKey(props.item, props.itemKey);
    const editProps = {
      item,
      column,
      value: props.value,
      itemKey: props.itemKey,
      isEditMode: props.isEditing ?? false,
      isDirty: props.isDirty ?? false,
      editedValue: props.editedValue,
      onValueChange: props.onValueChange ?? noop,
      errorMessage: props.errorMessage,
      onValidationError: props.onValidationError,
    };
    return <Comp {...editProps} />;
  };
  Wrapped.displayName = displayName;
  return Wrapped as GridCellRenderer;
}

/**
 * Composite wrapper: renders the READ cell until the cell is actually being edited,
 * then the EDIT cell. For types whose editor differs from their read look but whose
 * read appearance must persist in an editable grid — e.g. an editable link that
 * should still read as a blue link (not plain text) until you click to edit.
 */
export function makeReadOrEditWrapper(
  ReadComp: LibComponent,
  EditComp: LibComponent,
  displayName: string
): GridCellRenderer {
  const Read = makeReadWrapper(ReadComp, `${displayName}(read)`);
  const Edit = makeEditWrapper(EditComp, `${displayName}(edit)`);
  const Wrapped: React.FC<GridCellProps> = (props) =>
    props.isEditing ? <Edit {...props} /> : <Read {...props} />;
  Wrapped.displayName = displayName;
  return Wrapped as GridCellRenderer;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
