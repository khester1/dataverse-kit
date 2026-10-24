/**
 * Filter-builder FIELDS — which columns can be filtered, how, and with which operators. Framework-agnostic,
 * shared by the v8 panel (`hosts/GridFilterBuilder.tsx`, which re-exports the public names so its import
 * paths keep working) and the v9 panel. Moved out of the v8 file, which is Fluent v8 and must never be
 * imported by the v9 skin.
 *
 * ★ Imports `../registry/columnMapping` DIRECTLY (a type-only import of cell-renderers) — never the
 *   `../registry` barrel, which pulls the v8 renderers into whatever imports this.
 */
import type { ColumnDef } from '../types';
import type { FilterOperator } from './filter';
import { rendererToFieldType } from '../registry/columnMapping';

/** UI field-type buckets — drive which operators + value editor a column gets. */
export type FilterFieldType = 'text' | 'number' | 'currency' | 'date' | 'boolean' | 'optionset' | 'lookup';

/** Map a column's renderer type onto a filter field-type bucket. */
export function fieldTypeForRenderer(rendererType: string): FilterFieldType {
  switch (rendererToFieldType(rendererType)) {
    case 'number':
    case 'progressBar':
    case 'rating':
      return 'number';
    case 'currency':
      return 'currency';
    case 'date':
    case 'datetime':
      return 'date';
    case 'toggle':
      return 'boolean';
    case 'optionset':
      return 'optionset';
    case 'lookup':
      return 'lookup';
    default:
      return 'text';
  }
}

const OPS_BY_TYPE: Record<FilterFieldType, FilterOperator[]> = {
  text: ['eq', 'ne', 'like', 'not-like', 'begins-with', 'ends-with', 'null', 'not-null'],
  number: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'null', 'not-null'],
  currency: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'null', 'not-null'],
  date: ['eq', 'ne', 'on-or-after', 'on-or-before', 'gt', 'lt', 'null', 'not-null'],
  boolean: ['eq', 'ne'],
  optionset: ['eq', 'ne', 'in', 'not-in', 'null', 'not-null'],
  lookup: ['eq', 'ne', 'like', 'null', 'not-null'],
};

const OP_LABELS: Record<FilterOperator, string> = {
  eq: 'Equals',
  ne: 'Does Not Equal',
  like: 'Contains',
  'not-like': 'Does Not Contain',
  'begins-with': 'Begins With',
  'ends-with': 'Ends With',
  gt: 'Greater Than',
  ge: 'Greater Or Equal',
  lt: 'Less Than',
  le: 'Less Or Equal',
  'on-or-after': 'On Or After',
  'on-or-before': 'On Or Before',
  in: 'Is One Of',
  'not-in': 'Is Not One Of',
  null: 'Is Empty',
  'not-null': 'Is Not Empty',
};

/** Operators for a field type, with display labels (date relabels gt/lt to After/Before). */
export function getOperatorsForFieldType(t: FilterFieldType): Array<{ op: FilterOperator; label: string }> {
  return OPS_BY_TYPE[t].map((op) => {
    const label = t === 'date' && op === 'gt' ? 'After' : t === 'date' && op === 'lt' ? 'Before' : OP_LABELS[op];
    return { op, label };
  });
}

/** A choice offered for an optionset field (structurally a Fluent v8 `IDropdownOption`). */
export interface FilterFieldOption {
  key: string;
  text: string;
}

/** A filterable field — one per column field. */
export interface FilterField {
  /** The row field the condition reads (also the picker key). */
  key: string;
  /** Header label. */
  text: string;
  fieldType: FilterFieldType;
  /** Choices for optionset fields (from `rendererConfig`). */
  options?: FilterFieldOption[];
}

/** Read optionset choices off a column's renderer config (both key shapes). */
export function filterFieldOptions<T>(col: ColumnDef<T>): FilterFieldOption[] | undefined {
  const cfg = (col.rendererConfig ?? {}) as Record<string, unknown>;
  const raw = cfg.optionSetOptions ?? cfg.options;
  if (!Array.isArray(raw)) return undefined;
  return raw
    .map((o): FilterFieldOption | undefined => {
      const opt = o as Record<string, unknown>;
      const key = opt.key ?? opt.value;
      if (key === undefined || key === null) return undefined;
      const text = opt.text ?? opt.label ?? key;
      return { key: String(key), text: String(text) };
    })
    .filter((o): o is FilterFieldOption => !!o);
}

export function toFilterField<T>(col: ColumnDef<T>): FilterField {
  let fieldType = fieldTypeForRenderer(col.rendererType);
  const options = fieldType === 'optionset' ? filterFieldOptions(col) : undefined;
  // An optionset column with no declared choices behaves as text — otherwise its
  // `in`/`not-in` operators would render a text box that writes `value`, never the
  // `values` they require, leaving the condition permanently incomplete.
  if (fieldType === 'optionset' && (!options || options.length === 0)) fieldType = 'text';
  return { key: col.fieldName, text: col.name, fieldType, options };
}

/** A host-injected display column (`__…` key OR field — NestedGrid's "Related") is never filterable. */
const isHostField = <T>(col: ColumnDef<T>): boolean => col.key.startsWith('__') || col.fieldName.startsWith('__');

/**
 * The fields a filter can target: ALL columns (a column hidden by the chooser is still filterable),
 * minus `isFilterable: false`, `fileDrop` (no value) and host `__…` columns; one per field name.
 */
export function filterableFields<T>(columns: ColumnDef<T>[]): FilterField[] {
  const seen = new Set<string>();
  const out: FilterField[] = [];
  for (const col of columns) {
    if (col.isFilterable === false || col.rendererType === 'fileDrop' || isHostField(col)) continue;
    if (seen.has(col.fieldName)) continue;
    seen.add(col.fieldName);
    out.push(toFilterField(col));
  }
  return out;
}
