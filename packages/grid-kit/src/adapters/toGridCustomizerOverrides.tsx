/**
 * Adapter: grid-kit `ColumnDef[]` → a Grid Customizer `cellRendererOverrides`
 * map. The FC passes any Dataverse-supplied `formattedValue` straight through
 * (never recomputed) and renders the SAME registry component the DetailsList
 * path uses — this is the cross-host proof.
 *
 * TARGET CONTRACT: the export-engine `IGridCustomizer` ("full" / components-only)
 * shape — `Record<columnKey, React.FC<CellRendererProps>>`, keyed by column
 * logical name (optionally also by data type via `keyByDataType`), with a
 * single-arg FC. This mirrors GridCustomizerCodeGenerator's emitted
 * CellRendererProps / CellRendererOverrides and the hand-authored
 * customizers (e.g. ContactGridCustomizer keyed by 'fullname').
 *
 * This is NOT the native PCF PAOneGrid (`pa-grid-control`) contract, which keys
 * by `ColumnDataType` and calls `(props, rendererParams)` — a separate, two-arg
 * shape grid-kit does not target here.
 */
import React from 'react';
import type { ColumnDef, GridCellProps, GridRegistry } from '../types';
import { computeFormattedValue } from '../core';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface GcGridColumn {
  name: string;
  displayName?: string;
  dataType?: string;
}

/** The per-cell props a Grid Customizer override receives (MS contract). */
export interface GcCellRendererProps {
  value: unknown;
  formattedValue?: string;
  column: GcGridColumn;
  rowData: Record<string, unknown>;
  entityId: string;
  entityName?: string;
  isEditing?: boolean;
  isDisabled?: boolean;
  onChange?: (value: unknown) => void;
  onEditStart?: () => void;
  onEditEnd?: () => void;
}

export type GcCellRenderer = React.FC<GcCellRendererProps>;
export type GcCellRendererOverrides = Record<string, GcCellRenderer>;

export interface GridCustomizerOverridesOptions {
  /** Also key overrides by renderer type (datatype-wide overrides). Default false. */
  keyByDataType?: boolean;
}

export function toGridCustomizerOverrides<T extends Record<string, unknown>>(
  columns: ColumnDef<T>[],
  registry: GridRegistry,
  options: GridCustomizerOverridesOptions = {}
): GcCellRendererOverrides {
  const overrides: GcCellRendererOverrides = {};

  for (const column of columns) {
    const Override: GcCellRenderer = (gc) => {
      const value = gc.value;
      // Trust the platform's formatted value; only fall back when absent.
      const formattedValue =
        gc.formattedValue ??
        computeFormattedValue(value, column.rendererType, {
          currencyCode: (column.rendererConfig as any)?.currencyCode,
          locale: (column.rendererConfig as any)?.locale,
        });

      const props: GridCellProps<T> = {
        value,
        formattedValue,
        suppliedFormattedValue: gc.formattedValue,
        item: gc.rowData as T,
        itemKey: gc.entityId,
        column,
        isEditing: gc.isEditing,
        // The platform GC host owns dirty/validation state, so these are not
        // available on this path (unlike the DetailsList host's useEditState).
        isDirty: undefined,
        editedValue: undefined,
        errorMessage: undefined,
        onValidationError: undefined,
        // The GC host's onChange takes only the new value, so fieldName +
        // originalValue from grid-kit's 4-arg signature are intentionally dropped.
        onValueChange: gc.onChange ? (_rk, _fn, v) => gc.onChange!(v) : undefined,
        onEditStart: gc.onEditStart,
        onEditEnd: gc.onEditEnd,
      };

      const Renderer = registry.resolve(column, !!gc.isEditing);
      return <Renderer {...props} />;
    };

    Override.displayName = `GcOverride(${column.fieldName})`;
    overrides[column.fieldName] = Override;
    if (options.keyByDataType) {
      overrides[column.rendererType] = overrides[column.rendererType] ?? Override;
    }
  }

  return overrides;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
