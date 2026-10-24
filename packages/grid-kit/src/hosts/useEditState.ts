import { useCallback, useMemo, useState } from 'react';

/**
 * Inline edit-state for the grid: per-cell edited values, dirty flags,
 * validation errors, and the single active edit cell (for per-cell
 * click-to-edit). The dirty/validation pattern mirrors the canonical editable
 * cells (`EditableTextCell` et al.).
 */
export interface EditState {
  onValueChange: (rowKey: string, fieldName: string, value: unknown, originalValue: unknown) => void;
  onValidationError: (rowKey: string, fieldName: string, message: string | undefined) => void;
  isDirty: (rowKey: string, fieldName: string) => boolean;
  getEditedValue: (rowKey: string, fieldName: string) => unknown;
  getError: (rowKey: string, fieldName: string) => string | undefined;
  /** True when this cell is the one currently being edited (click-to-edit). */
  isActiveCell: (rowKey: string, fieldName: string) => boolean;
  /** Make a cell the active edit cell. */
  setActiveCell: (rowKey: string, fieldName: string) => void;
  /** Exit edit mode (no active cell). */
  clearActiveCell: () => void;
  /** All edits as `{ [rowKey]: { [fieldName]: value } }`. */
  getChanges: () => Record<string, Record<string, unknown>>;
  hasErrors: boolean;
  reset: () => void;
}

const cellKey = (rowKey: string, fieldName: string): string => `${rowKey}::${fieldName}`;

export function useEditState(): EditState {
  const [edits, setEdits] = useState<Record<string, { value: unknown; original: unknown }>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [active, setActive] = useState<string | null>(null);

  const onValueChange = useCallback(
    (rowKey: string, fieldName: string, value: unknown, originalValue: unknown) => {
      setEdits((prev) => ({ ...prev, [cellKey(rowKey, fieldName)]: { value, original: originalValue } }));
    },
    []
  );

  const onValidationError = useCallback(
    (rowKey: string, fieldName: string, message: string | undefined) => {
      setErrors((prev) => {
        const k = cellKey(rowKey, fieldName);
        if (!message) {
          if (!(k in prev)) return prev;
          const next = { ...prev };
          delete next[k];
          return next;
        }
        return { ...prev, [k]: message };
      });
    },
    []
  );

  const isDirty = useCallback((rowKey: string, fieldName: string) => cellKey(rowKey, fieldName) in edits, [edits]);
  const getEditedValue = useCallback(
    (rowKey: string, fieldName: string) => edits[cellKey(rowKey, fieldName)]?.value,
    [edits]
  );
  const getError = useCallback((rowKey: string, fieldName: string) => errors[cellKey(rowKey, fieldName)], [errors]);

  const isActiveCell = useCallback(
    (rowKey: string, fieldName: string) => active === cellKey(rowKey, fieldName),
    [active]
  );
  const setActiveCell = useCallback((rowKey: string, fieldName: string) => setActive(cellKey(rowKey, fieldName)), []);
  const clearActiveCell = useCallback(() => setActive(null), []);

  const getChanges = useCallback(() => {
    const out: Record<string, Record<string, unknown>> = {};
    for (const k of Object.keys(edits)) {
      const sep = k.indexOf('::');
      const rowKey = k.slice(0, sep);
      const fieldName = k.slice(sep + 2);
      (out[rowKey] = out[rowKey] ?? {})[fieldName] = edits[k].value;
    }
    return out;
  }, [edits]);

  const reset = useCallback(() => {
    setEdits({});
    setErrors({});
    setActive(null);
  }, []);

  const hasErrors = Object.keys(errors).length > 0;

  // Stable object identity: only changes when edits/errors/active change (the
  // derived callbacks change identity then), so the grid's ctx/columns recompute
  // on real edit-state changes, not on every render.
  return useMemo(
    () => ({
      onValueChange,
      onValidationError,
      isDirty,
      getEditedValue,
      getError,
      isActiveCell,
      setActiveCell,
      clearActiveCell,
      getChanges,
      hasErrors,
      reset,
    }),
    [
      onValueChange,
      onValidationError,
      isDirty,
      getEditedValue,
      getError,
      isActiveCell,
      setActiveCell,
      clearActiveCell,
      getChanges,
      hasErrors,
      reset,
    ]
  );
}
