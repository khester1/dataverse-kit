/**
 * Generic export utilities for CSV and JSON export.
 * Works with any entity type - not tied to specific data models.
 */

/**
 * Column configuration for export.
 */
export interface ExportColumn {
  /** Column key (matches data field name) */
  key: string;
  /** Display name for header */
  name: string;
  /** Field type for formatting */
  fieldType?: string;
  /** Whether to include in export (default: true) */
  exportable?: boolean;
  /** Custom label for export header (overrides name) */
  exportLabel?: string;
}

/**
 * Export format options.
 */
export type ExportFormat = 'csv' | 'json';

/**
 * Options for value formatting.
 */
export interface FormatOptions {
  /** Locale for number/date formatting (default: 'en-US') */
  locale?: string;
  /** Currency code (default: 'USD') */
  currencyCode?: string;
  /** Date format style */
  dateStyle?: 'short' | 'medium' | 'long' | 'full';
  /** Whether to use raw values (for JSON) vs formatted strings (for CSV) */
  useRawValues?: boolean;
}

const defaultFormatOptions: FormatOptions = {
  locale: 'en-US',
  currencyCode: 'USD',
  dateStyle: 'short',
  useRawValues: false,
};

/**
 * Format a value for export based on field type.
 */
export function formatValueForExport(
  value: unknown,
  fieldType?: string,
  options: FormatOptions = {}
): string | number | boolean | null {
  const opts = { ...defaultFormatOptions, ...options };

  if (value === null || value === undefined) {
    return opts.useRawValues ? null : '';
  }

  switch (fieldType) {
    case 'currency': {
      const num = Number(value);
      if (isNaN(num)) return opts.useRawValues ? null : '';
      if (opts.useRawValues) return num;
      return new Intl.NumberFormat(opts.locale, {
        style: 'currency',
        currency: opts.currencyCode,
      }).format(num);
    }

    case 'number': {
      const num = Number(value);
      if (isNaN(num)) return opts.useRawValues ? null : '';
      if (opts.useRawValues) return num;
      return new Intl.NumberFormat(opts.locale).format(num);
    }

    case 'date': {
      const date = value instanceof Date ? value : new Date(String(value));
      if (isNaN(date.getTime())) return opts.useRawValues ? null : '';
      if (opts.useRawValues) {
        return date.toISOString().split('T')[0];
      }
      return date.toLocaleDateString(opts.locale, { dateStyle: opts.dateStyle });
    }

    case 'datetime': {
      const date = value instanceof Date ? value : new Date(String(value));
      if (isNaN(date.getTime())) return opts.useRawValues ? null : '';
      if (opts.useRawValues) {
        return date.toISOString();
      }
      return date.toLocaleString(opts.locale);
    }

    case 'toggle': {
      const bool = Boolean(value);
      return opts.useRawValues ? bool : (bool ? 'Yes' : 'No');
    }

    case 'optionset': {
      if (typeof value === 'object' && value !== null && 'label' in value) {
        return String((value as { label: unknown }).label);
      }
      return String(value);
    }

    case 'lookup': {
      if (typeof value === 'object' && value !== null && 'name' in value) {
        return String((value as { name: unknown }).name);
      }
      return String(value);
    }

    case 'progressBar':
    case 'icon':
    case 'coloredCell': {
      if (typeof value === 'number') {
        return opts.useRawValues ? value : String(value);
      }
      return String(value);
    }

    case 'link':
    case 'text':
    default:
      return String(value);
  }
}

/**
 * Escape a value for CSV (handles commas, quotes, newlines).
 */
function escapeCSVValue(value: string | number | boolean | null): string {
  if (value === null) return '';

  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r') || str !== str.trim()) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generate CSV content from items and columns.
 */
export function generateCSV<T extends Record<string, unknown>>(
  items: T[],
  columns: ExportColumn[],
  options: FormatOptions = {}
): string {
  const opts = { ...defaultFormatOptions, ...options, useRawValues: false };

  const exportColumns = columns.filter((col) => col.exportable !== false);

  if (exportColumns.length === 0 || items.length === 0) {
    return '';
  }

  const headers = exportColumns.map((col) =>
    escapeCSVValue(col.exportLabel || col.name)
  );
  const headerRow = headers.join(',');

  const dataRows = items.map((item) => {
    const values = exportColumns.map((col) => {
      const value = item[col.key];
      const formatted = formatValueForExport(value, col.fieldType, opts);
      return escapeCSVValue(formatted);
    });
    return values.join(',');
  });

  return [headerRow, ...dataRows].join('\r\n');
}

/**
 * Generate JSON content from items and columns.
 */
export function generateJSON<T extends Record<string, unknown>>(
  items: T[],
  columns: ExportColumn[],
  options: FormatOptions = {}
): string {
  const opts = { ...defaultFormatOptions, ...options, useRawValues: true };

  const exportColumns = columns.filter((col) => col.exportable !== false);

  if (exportColumns.length === 0 || items.length === 0) {
    return '[]';
  }

  const exportData = items.map((item) => {
    const exportItem: Record<string, string | number | boolean | null> = {};
    exportColumns.forEach((col) => {
      const headerName = col.exportLabel || col.name;
      const value = item[col.key];
      exportItem[headerName] = formatValueForExport(value, col.fieldType, opts);
    });
    return exportItem;
  });

  return JSON.stringify(exportData, null, 2);
}

/**
 * Trigger a file download in the browser.
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const bom = mimeType.includes('csv') ? '\uFEFF' : '';
  const blob = new Blob([bom + content], { type: `${mimeType};charset=utf-8` });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export items to a file (combines generation and download).
 */
export function exportToFile<T extends Record<string, unknown>>(
  items: T[],
  columns: ExportColumn[],
  format: ExportFormat,
  filename: string,
  options: FormatOptions = {}
): void {
  let content: string;
  let mimeType: string;
  let extension: string;

  if (format === 'csv') {
    content = generateCSV(items, columns, options);
    mimeType = 'text/csv';
    extension = 'csv';
  } else {
    content = generateJSON(items, columns, options);
    mimeType = 'application/json';
    extension = 'json';
  }

  downloadFile(content, `${filename}.${extension}`, mimeType);
}

/**
 * Generate a default filename with timestamp.
 */
export function generateDefaultFilename(baseName: string): string {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0];
  return `${baseName}_${dateStr}`;
}
