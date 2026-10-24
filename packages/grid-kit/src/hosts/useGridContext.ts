import { useMemo } from 'react';
import type { GridProps } from '../types';
import { createCellRegistry } from '../registry';
import { defaultGetKey, GridRenderContext } from '../adapters';
import type { EditState } from './useEditState';

/**
 * Builds the per-render `GridRenderContext` shared by every grid host
 * (DataGrid, CardGrid, GroupedGrid, …). Resolves the registry + key accessor,
 * threads edit-state, and wires per-cell click-to-edit so all hosts behave
 * identically. Extracted from DataGrid so the hosts don't each re-implement it.
 */
export function useGridContext<T extends Record<string, unknown>>(
  props: Pick<
    GridProps<T>,
    'registry' | 'editable' | 'editTrigger' | 'sort' | 'onSortChange' | 'getKey' | 'onValueChange' | 'navigateTo'
  >,
  edit: EditState
): { registry: GridRenderContext<T>['registry']; getKeyFn: (it: T) => string; ctx: GridRenderContext<T> } {
  const { registry: providedRegistry, editable, editTrigger, sort, onSortChange, getKey, onValueChange, navigateTo } = props;

  const registry = useMemo(() => providedRegistry ?? createCellRegistry(), [providedRegistry]);
  const getKeyFn = useMemo<(it: T) => string>(() => getKey ?? defaultGetKey, [getKey]);
  const trigger = editTrigger ?? 'click';

  const ctx: GridRenderContext<T> = useMemo(
    () => ({
      registry,
      editable,
      editTrigger: trigger,
      getKey: getKeyFn,
      sort,
      onSortChange,
      navigateTo,
      // Per-cell: only the active cell is in edit mode. 'always': every editable cell.
      isEditing: (rk, fn) => !!editable && (trigger === 'always' || edit.isActiveCell(rk, fn)),
      isDirty: edit.isDirty,
      getEditedValue: edit.getEditedValue,
      getError: edit.getError,
      onValueChange: (rk, fn, v, ov) => {
        edit.onValueChange(rk, fn, v, ov);
        onValueChange?.(rk, fn, v, ov);
      },
      onValidationError: edit.onValidationError,
      onEditStart: (rk, fn) => edit.setActiveCell(rk, fn),
      onEditEnd: () => edit.clearActiveCell(),
    }),
    [registry, editable, trigger, getKeyFn, sort, onSortChange, edit, onValueChange, navigateTo]
  );

  return { registry, getKeyFn, ctx };
}
