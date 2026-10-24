/**
 * Generic import utilities for CSV and JSON import.
 * Works with any entity type - not tied to specific data models.
 */

/**
 * Column configuration for import.
 */
export interface ImportColumn {
  /** Column key (matches data field name) */
  key: string;
  /** Display name for header */
  name: string;
  /** Field type for parsing */
  fieldType?: string;
  /** Whether this field is required for import */
  required?: boolean;
  /** Alternative header names to match during column mapping */
  importAlias?: string[];
}

/**
 * Import format options.
 */
export type ImportFormat = 'csv' | 'json';

/**
 * Validation error for a specific cell during import.
 */
export interface ImportValidationError {
  /** Row number (1-based, matching displayed preview) */
  rowNumber: number;
  /** Field name that has the error */
  fieldName: string;
  /** The problematic value */
  value: unknown;
  /** Error description */
  error: string;
}

/**
 * Result of parsing and validating import data.
 */
export interface ImportResult<T> {
  /** Successfully parsed and validated records */
  records: T[];
  /** Validation errors found */
  errors: ImportValidationError[];
  /** Non-critical warnings */
  warnings?: string[];
}

/**
 * Result of a batch create operation.
 */
export interface BatchCreateResult {
  /** Records successfully created with their new IDs */
  succeeded: Array<{ id: string; data: Record<string, unknown> }>;
  /** Records that failed to create */
  failed: Array<{ rowNumber: number; error: string }>;
}

/**
 * Parse CSV content into headers and rows.
 */
export function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  const lines = content.trim().split(/\r?\n/);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];

      if (inQuotes) {
        if (char === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i += 2;
          } else {
            inQuotes = false;
            i++;
          }
        } else {
          current += char;
          i++;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
          i++;
        } else if (char === ',') {
          result.push(current.trim());
          current = '';
          i++;
        } else {
          current += char;
          i++;
        }
      }
    }

    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1)
    .filter((line) => line.trim() !== '')
    .map(parseLine);

  return { headers, rows };
}

/**
 * Parse JSON content into an array of records.
 */
export function parseJSON<T = Record<string, unknown>>(content: string): T[] {
  const parsed = JSON.parse(content);

  if (!Array.isArray(parsed)) {
    throw new Error('JSON content must be an array of records');
  }

  return parsed as T[];
}

/**
 * Detect the format of the content based on its structure.
 */
export function detectFormat(content: string): ImportFormat {
  const trimmed = content.trim();

  if (trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      // Not valid JSON, fall through to CSV
    }
  }

  if (trimmed.startsWith('{')) {
    try {
      JSON.parse(`[${trimmed.split('\n').filter((l) => l.trim()).join(',')}]`);
      return 'json';
    } catch {
      // Not valid JSON, fall through to CSV
    }
  }

  return 'csv';
}

/**
 * Parse a string value into the appropriate type based on field type.
 */
export function parseFieldValue(value: string, fieldType?: string): unknown {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const trimmed = value.trim();

  switch (fieldType) {
    case 'number': {
      const cleaned = trimmed.replace(/,/g, '');
      const num = parseFloat(cleaned);
      if (isNaN(num)) {
        return null;
      }
      return num;
    }

    case 'currency': {
      const cleaned = trimmed
        .replace(/[$\u20AC\u00A3\u00A5\u20B9]/g, '')
        .replace(/,/g, '')
        .replace(/\s/g, '')
        .trim();
      const num = parseFloat(cleaned);
      if (isNaN(num)) {
        return null;
      }
      return num;
    }

    case 'date': {
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const date = new Date(trimmed + 'T00:00:00');
        if (!isNaN(date.getTime())) {
          return trimmed;
        }
      }
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
      return null;
    }

    case 'datetime': {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
      return null;
    }

    case 'toggle': {
      const lower = trimmed.toLowerCase();
      if (['yes', 'y', 'true', '1', 'on'].includes(lower)) {
        return true;
      }
      if (['no', 'n', 'false', '0', 'off'].includes(lower)) {
        return false;
      }
      return null;
    }

    case 'link':
    case 'text':
    default:
      return trimmed;
  }
}

/**
 * Map file headers to column keys using exact match, aliases, and fuzzy matching.
 */
export function mapHeadersToColumns(
  headers: string[],
  columns: ImportColumn[]
): Map<number, string> {
  const mapping = new Map<number, string>();
  const usedColumns = new Set<string>();

  const normalize = (s: string): string =>
    s.toLowerCase().replace(/[_\s-]/g, '').trim();

  headers.forEach((header, index) => {
    const normalizedHeader = normalize(header);

    for (const col of columns) {
      if (usedColumns.has(col.key)) continue;

      if (normalize(col.name) === normalizedHeader) {
        mapping.set(index, col.key);
        usedColumns.add(col.key);
        return;
      }

      if (normalize(col.key) === normalizedHeader) {
        mapping.set(index, col.key);
        usedColumns.add(col.key);
        return;
      }

      if (col.importAlias) {
        for (const alias of col.importAlias) {
          if (normalize(alias) === normalizedHeader) {
            mapping.set(index, col.key);
            usedColumns.add(col.key);
            return;
          }
        }
      }
    }
  });

  return mapping;
}

/**
 * Convert a mapping of header index to column key into a mapping of header name to column key.
 */
export function getHeaderToColumnKeyMap(
  headers: string[],
  indexMapping: Map<number, string>
): Map<string, string> {
  const result = new Map<string, string>();
  indexMapping.forEach((columnKey, headerIndex) => {
    if (headerIndex < headers.length) {
      result.set(headers[headerIndex], columnKey);
    }
  });
  return result;
}

/**
 * Validate import data against column definitions.
 */
export function validateImportData<T extends Record<string, unknown>>(
  rows: Array<Record<string, unknown>>,
  columns: ImportColumn[]
): ImportResult<T> {
  const records: T[] = [];
  const errors: ImportValidationError[] = [];
  const warnings: string[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const record: Record<string, unknown> = {};
    let hasErrors = false;

    columns.forEach((col) => {
      const rawValue = row[col.key];

      if (col.required && (rawValue === null || rawValue === undefined || rawValue === '')) {
        errors.push({
          rowNumber,
          fieldName: col.name,
          value: rawValue,
          error: `${col.name} is required`,
        });
        hasErrors = true;
        return;
      }

      if (rawValue !== null && rawValue !== undefined && rawValue !== '') {
        const stringValue = String(rawValue);
        const parsedValue = parseFieldValue(stringValue, col.fieldType);

        if (
          parsedValue === null &&
          stringValue.trim() !== '' &&
          (col.fieldType === 'number' || col.fieldType === 'currency' || col.fieldType === 'date' || col.fieldType === 'datetime')
        ) {
          errors.push({
            rowNumber,
            fieldName: col.name,
            value: rawValue,
            error: `Invalid ${col.fieldType} value: "${stringValue}"`,
          });
          hasErrors = true;
          return;
        }

        record[col.key] = parsedValue;
      } else {
        record[col.key] = null;
      }
    });

    if (!hasErrors) {
      records.push(record as T);
    }
  });

  const skippedCount = rows.length - records.length;
  if (skippedCount > 0) {
    warnings.push(`${skippedCount} row(s) skipped due to validation errors`);
  }

  return { records, errors, warnings };
}

/**
 * Convert CSV rows to record objects using header-to-column mapping.
 */
export function csvRowsToRecords(
  headers: string[],
  rows: string[][],
  headerMapping: Map<number, string>
): Array<Record<string, unknown>> {
  return rows.map((row) => {
    const record: Record<string, unknown> = {};
    headerMapping.forEach((columnKey, headerIndex) => {
      if (headerIndex < row.length) {
        record[columnKey] = row[headerIndex];
      }
    });
    return record;
  });
}

/**
 * Convert JSON records to use column keys based on header-to-column mapping.
 */
export function jsonRecordsToColumnKeys(
  jsonRecords: Array<Record<string, unknown>>,
  columns: ImportColumn[]
): Array<Record<string, unknown>> {
  const keyMapping = new Map<string, string>();
  const normalize = (s: string): string =>
    s.toLowerCase().replace(/[_\s-]/g, '').trim();

  const jsonKeys = new Set<string>();
  jsonRecords.forEach((record) => {
    Object.keys(record).forEach((key) => jsonKeys.add(key));
  });

  jsonKeys.forEach((jsonKey) => {
    const normalizedKey = normalize(jsonKey);

    for (const col of columns) {
      if (normalize(col.name) === normalizedKey || normalize(col.key) === normalizedKey) {
        keyMapping.set(jsonKey, col.key);
        return;
      }

      if (col.importAlias) {
        for (const alias of col.importAlias) {
          if (normalize(alias) === normalizedKey) {
            keyMapping.set(jsonKey, col.key);
            return;
          }
        }
      }
    }
  });

  return jsonRecords.map((record) => {
    const transformed: Record<string, unknown> = {};
    Object.entries(record).forEach(([key, value]) => {
      const columnKey = keyMapping.get(key);
      if (columnKey) {
        transformed[columnKey] = value;
      }
    });
    return transformed;
  });
}

/**
 * Read a file and return its content as a string.
 */
export function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsText(file);
  });
}

/**
 * Get suggested format based on file extension.
 */
export function getFormatFromFilename(filename: string): ImportFormat | undefined {
  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'csv') return 'csv';
  if (ext === 'json') return 'json';
  return undefined;
}
