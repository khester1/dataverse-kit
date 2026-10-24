/**
 * Framework-agnostic display-value formatting. Wraps @khester/dynamics-utils.
 *
 * This produces the FALLBACK `formattedValue` only — adapters prefer a
 * host-supplied value (e.g. Dataverse `@OData…FormattedValue`) when present and
 * never recompute over it.
 */
import { formatCurrency, formatNumber, formatDate, formatDateTime } from '@khester/dynamics-utils';
import type { CellRendererType } from '../types';
import { toNumber, toDisplayString } from './coercion';

export interface FormatConfig {
  currencyCode?: string;
  locale?: string;
  dateOptions?: Intl.DateTimeFormatOptions;
}

/** Compute a fallback display string for a value given its renderer type. */
export function computeFormattedValue(
  value: unknown,
  rendererType: CellRendererType | string,
  config: FormatConfig = {}
): string {
  if (value === null || value === undefined || value === '') return '';
  const { currencyCode = 'USD', locale = 'en-US', dateOptions } = config;

  switch (rendererType) {
    case 'currency': {
      const n = toNumber(value);
      return n === null ? toDisplayString(value) : formatCurrency(n, currencyCode, locale);
    }
    case 'number': {
      const n = toNumber(value);
      return n === null ? toDisplayString(value) : formatNumber(n, locale);
    }
    case 'date':
      return formatDate(String(value), locale, dateOptions);
    case 'datetime':
      return formatDateTime(String(value), locale);
    default:
      return toDisplayString(value);
  }
}
