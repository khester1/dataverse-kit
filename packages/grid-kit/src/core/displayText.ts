/**
 * The text a grid cell SHOWS for a (column, row) — framework-agnostic, one site, so the filter builder
 * ("match what the grid shows") and the cells agree. The resolution order mirrors the lookup/text
 * cells (`v9/cells/cells.tsx`): `rendererConfig.formatValue` → a lookup's `displayField` → an object
 * value's name/fullname/title → the host-supplied `@OData…FormattedValue` → the computed format → raw.
 *
 * Also the single home of `getSuppliedFormattedValue` and `rendererFormatConfig` (moved from
 * `adapters/context`, which re-exports them) — core cannot import adapters without a cycle.
 */
import type { ColumnDef } from '../types';
import { computeFormattedValue } from './formatters';

/** Host-supplied formatted value (Dataverse `@OData…FormattedValue` sibling key), if present. */
export function getSuppliedFormattedValue<T>(item: T, fieldName: string): string | undefined {
  if (!item || typeof item !== 'object') return undefined;
  const fv = (item as Record<string, unknown>)[`${fieldName}@OData.Community.Display.V1.FormattedValue`];
  return fv !== undefined && fv !== null ? String(fv) : undefined;
}

/** The formatting options a column carries (currency code, locale). */
export function rendererFormatConfig<T>(column: ColumnDef<T>): { currencyCode?: string; locale?: string } {
  const c = (column.rendererConfig ?? {}) as Record<string, unknown>;
  return { currencyCode: c.currencyCode as string | undefined, locale: c.locale as string | undefined };
}

/** The text the grid shows for this column in this row ('' when empty). */
export function columnDisplayText<T>(item: T, column: ColumnDef<T>): string {
  const cfg = (column.rendererConfig ?? {}) as Record<string, unknown>;
  const row = item && typeof item === 'object' ? (item as Record<string, unknown>) : undefined;
  const value = row?.[column.fieldName];
  if (typeof cfg.formatValue === 'function') {
    return String((cfg.formatValue as (v: unknown, i: T) => unknown)(value, item) ?? '');
  }
  const displayField = (cfg.displayField ?? cfg.lookupDisplayField) as string | undefined;
  if (column.rendererType === 'lookup' && displayField && row) {
    const v = row[displayField];
    return v !== null && v !== undefined ? String(v) : '';
  }
  const supplied = getSuppliedFormattedValue(item, column.fieldName);
  if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
    const o = value as Record<string, unknown>;
    return String(o.name || o.fullname || o.title || supplied || '');
  }
  if (supplied !== undefined) return supplied;
  const computed = computeFormattedValue(value, column.rendererType, rendererFormatConfig(column));
  if (computed) return computed;
  return value === null || value === undefined ? '' : String(value);
}
