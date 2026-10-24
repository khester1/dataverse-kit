/**
 * Adapter: a (duck-typed) form-runtime `GridCustomizerDefinition` → grid-kit
 * `ColumnDef[]`. The input shape is declared LOCALLY — grid-kit never imports
 * form-runtime (sibling repo, zero-React, typecheck-standalone). Keep the local
 * shape in sync with:
 *   the form-runtime grid-customizer types (not published)
 */
import type { CellEditorType, CellRendererType, ColumnDef } from '../types';

/** Subset of form-runtime's `GridColumnDefinition` we consume (structural). */
export interface GridColumnDefinitionLike {
  id?: string;
  fieldName: string;
  attributeLogicalName?: string;
  displayName: string;
  dataType: string;
  rendererType: string;
  rendererConfig?: Record<string, unknown>;
  editorType?: string;
  isLocked?: boolean;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  isResizable?: boolean;
  isSortable?: boolean;
  isFilterable?: boolean;
  /** Footer aggregate (form-runtime's `aggregateFunction`; identical literals). */
  aggregateFunction?: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

/** Subset of form-runtime's `GridCustomizerDefinition`. */
export interface GridCustomizerDefinitionLike {
  columns: GridColumnDefinitionLike[];
  isEditable?: boolean;
}

/**
 * Map form-runtime's narrow `rendererType` + separate `dataType` onto grid-kit's
 * 15-literal `CellRendererType`. form-runtime keeps the two separate (a column
 * can be `rendererType:'text'` + `dataType:'numeric'`), so a naive 1:1 map would
 * render numbers / links / toggles as plain text.
 */
export function mapFormRuntimeRendererType(rendererType: string, dataType: string): CellRendererType {
  switch (rendererType) {
    case 'lookup':
      return 'lookup';
    case 'optionset':
      return 'optionset';
    case 'currency':
      return 'currency';
    case 'progress':
      return 'progress';
    case 'date':
      return dataType === 'datetime' ? 'datetime' : 'date';
    case 'datetime':
      return 'datetime';
    case 'boolean':
      return 'boolean';
    case 'rating':
      return 'rating';
    case 'composite':
      return 'composite';
    case 'text':
    default:
      switch (dataType) {
        case 'numeric':
          return 'number';
        case 'currency':
          return 'currency';
        case 'date':
          return 'date';
        case 'datetime':
          return 'datetime';
        case 'boolean':
          return 'boolean';
        case 'url':
        case 'email':
          return 'link';
        // No standalone image renderer — show the URL as text (use a composite
        // 'image' slot for an actual thumbnail).
        case 'image':
          return 'text';
        default:
          return 'text';
      }
  }
}

function mapEditorType(editorType?: string): CellEditorType | undefined {
  switch (editorType) {
    case 'text':
      return 'text';
    case 'number':
      return 'number';
    case 'date':
      return 'date';
    case 'dropdown':
      return 'dropdown';
    case 'toggle':
      return 'toggle';
    case 'lookup':
      return 'lookup';
    case 'none':
      return 'none';
    default:
      return undefined;
  }
}

export function fromGridCustomizerColumn<T = Record<string, unknown>>(
  col: GridColumnDefinitionLike
): ColumnDef<T> {
  return {
    key: col.id ?? col.fieldName,
    fieldName: col.fieldName,
    name: col.displayName,
    rendererType: mapFormRuntimeRendererType(col.rendererType, col.dataType),
    rendererConfig: col.rendererConfig,
    editorType: mapEditorType(col.editorType),
    isLocked: col.isLocked,
    width: col.width,
    minWidth: col.minWidth,
    maxWidth: col.maxWidth,
    isResizable: col.isResizable,
    isSortable: col.isSortable,
    isFilterable: col.isFilterable,
    aggregate: col.aggregateFunction,
  };
}

export function fromGridCustomizerDefinition<T = Record<string, unknown>>(
  def: GridCustomizerDefinitionLike
): ColumnDef<T>[] {
  return (def.columns ?? []).map((c) => fromGridCustomizerColumn<T>(c));
}
