/**
 * Shared render context + the single `buildCellProps` helper used by both host
 * adapters, so formatted-value sourcing and edit-state threading live in ONE
 * place (no per-adapter duplication).
 */
import type { ColumnDef, GridCellProps, GridRegistry, GridSortState } from '../types';
import { computeFormattedValue } from '../core';
import { getSuppliedFormattedValue, rendererFormatConfig } from '../core/displayText';
import { navigateToTarget, type NavTarget } from '../navigation/navigateTo';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Read a row field value. */
export function getFieldValue<T>(item: T, fieldName: string): unknown {
  return item && typeof item === 'object' ? (item as any)[fieldName] : undefined;
}

// Host-supplied formatted value (Dataverse `@OData…FormattedValue` sibling key) — the single home is
// `core/displayText` (the filter builder reads it too); re-exported so adapter import paths hold.
export { getSuppliedFormattedValue } from '../core/displayText';

/** Per-render context shared with the column/override builders. */
export interface GridRenderContext<T = Record<string, unknown>> {
  registry: GridRegistry;
  editable?: boolean;
  /**
   * How an editable cell enters edit mode. `'click'` (default) = per-cell
   * click-to-edit (one editor at a time, gated by `isEditing`); `'always'` =
   * every editable cell shows its editor at once.
   */
  editTrigger?: 'click' | 'always';
  /** Row-key accessor (default: `item.key`). */
  getKey?: (item: T) => string;
  /** Override the formatted-value lookup (default: OData sibling key). */
  formattedValueAccessor?: (item: T, column: ColumnDef<T>) => string | undefined;

  // sort
  sort?: GridSortState;
  onSortChange?: (fieldName: string, direction: 'asc' | 'desc') => void;

  /** Resolve a row → a navigation target; synthesizes `onLinkClick` for link/lookup cells. */
  navigateTo?: (item: T) => NavTarget | undefined;

  // edit-state accessors (supplied by DataGrid; optional for read-only hosts)
  isEditing?: (rowKey: string, fieldName: string) => boolean;
  getEditedValue?: (rowKey: string, fieldName: string) => unknown;
  isDirty?: (rowKey: string, fieldName: string) => boolean;
  getError?: (rowKey: string, fieldName: string) => string | undefined;
  onValueChange?: (rowKey: string, fieldName: string, value: unknown, originalValue: unknown) => void;
  onValidationError?: (rowKey: string, fieldName: string, message: string | undefined) => void;
  onEditStart?: (rowKey: string, fieldName: string) => void;
  onEditEnd?: (rowKey: string, fieldName: string) => void;
}

// Stable synthetic keys for rows that lack a `key` — keeps edit-state per-row
// instead of collapsing every keyless row to '' (which caused cross-row edit
// bleed). Same object identity ⇒ same key across renders.
const SYNTH_KEYS = new WeakMap<object, string>();
let synthCounter = 0;
let warnedMissingKey = false;

export function defaultGetKey<T>(item: T): string {
  const k = (item as { key?: unknown } | null | undefined)?.key;
  if (k !== undefined && k !== null && k !== '') return String(k);
  if (item && typeof item === 'object') {
    let s = SYNTH_KEYS.get(item as object);
    if (!s) {
      s = '__gridkit_row_' + ++synthCounter;
      SYNTH_KEYS.set(item as object, s);
      if (!warnedMissingKey && typeof console !== 'undefined') {
        warnedMissingKey = true;
        console.warn('[grid-kit] Rows are missing a `key`; using synthetic keys. Pass `getKey` or give each row a stable `key` for reliable selection/editing.');
      }
    }
    return s;
  }
  return String(k ?? '');
}


/** Build the normalized cell contract for one (column, row) pair. */
export function buildCellProps<T>(column: ColumnDef<T>, item: T, ctx: GridRenderContext<T>): GridCellProps<T> {
  const getKey = ctx.getKey ?? defaultGetKey;
  const itemKey = getKey(item);
  const value = getFieldValue(item, column.fieldName);

  // Navigation: for link/lookup cells with no explicit onLinkClick, synthesize one
  // from the grid-level `navigateTo` resolver. Done here (the seam both host
  // adapters share) so DetailsList + GridCustomizer get nav parity for free.
  let effectiveColumn = column;
  if (
    ctx.navigateTo &&
    !column.onLinkClick &&
    (column.rendererType === 'link' || column.rendererType === 'lookup')
  ) {
    const resolve = ctx.navigateTo;
    effectiveColumn = {
      ...column,
      onLinkClick: (it: T) => {
        const target = resolve(it);
        if (target) void navigateToTarget(target);
      },
    };
  }

  // A toggle/boolean is a single-click control with no click-to-edit step: it's
  // interactive only in an editable host (v8 routes its change to onValueChange in
  // makeReadWrapper; v9 resolves EditableToggleCell). In a read-only host, drop the
  // editorType so the read switch renders disabled instead of fake-interactive.
  if (
    (column.rendererType === 'toggle' || column.rendererType === 'boolean') &&
    !ctx.editable &&
    effectiveColumn.editorType
  ) {
    effectiveColumn = { ...effectiveColumn, editorType: undefined };
  }

  const supplied = ctx.formattedValueAccessor
    ? ctx.formattedValueAccessor(item, column)
    : getSuppliedFormattedValue(item, column.fieldName);
  const formattedValue =
    supplied ?? computeFormattedValue(value, column.rendererType, rendererFormatConfig(column));

  return {
    value,
    formattedValue,
    suppliedFormattedValue: supplied,
    item,
    itemKey,
    column: effectiveColumn,
    isEditing: ctx.isEditing?.(itemKey, column.fieldName) ?? false,
    isDirty: ctx.isDirty?.(itemKey, column.fieldName) ?? false,
    editedValue: ctx.getEditedValue?.(itemKey, column.fieldName),
    errorMessage: ctx.getError?.(itemKey, column.fieldName),
    onValueChange: ctx.onValueChange,
    onValidationError: ctx.onValidationError,
    onEditStart: ctx.onEditStart ? () => ctx.onEditStart!(itemKey, column.fieldName) : undefined,
    onEditEnd: ctx.onEditEnd ? () => ctx.onEditEnd!(itemKey, column.fieldName) : undefined,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
