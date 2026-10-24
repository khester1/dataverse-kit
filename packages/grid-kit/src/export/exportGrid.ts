/**
 * Grid export helper — a thin wrapper over `@khester/dynamics-utils` export
 * utilities that maps grid-kit `ColumnDef`s onto the export `ExportColumn` shape.
 *
 * Kept OUT of `src/core/` (which is for v9-portable pure logic): this triggers a
 * browser download (`document` / `URL.createObjectURL`), a side-effectful host
 * concern. Shared by the v8 and v9 hosts (v9 imports this FILE, never `./index`,
 * which pulls the Fluent v8 `GridExportDialog`).
 */
import { exportToFile, formatValueForExport, generateDefaultFilename } from '@khester/dynamics-utils';
import type { ExportColumn, ExportFormat } from '@khester/dynamics-utils';
import type { ColumnDef } from '../types';
import { rendererToFieldType } from '../registry/columnMapping';
import { getSuppliedFormattedValue } from '../adapters/context';

/**
 * Map grid-kit columns → dynamics-utils `ExportColumn[]`.
 * `ExportColumn.key` is the DATA field (so it reads `item[fieldName]`), and the
 * export formatter expects a canonical field type — reuse `rendererToFieldType`
 * rather than the grid-kit `rendererType` vocabulary. The grid-kit-native
 * `fileDrop` column has no exportable value and is skipped.
 */
export function toExportColumns<T = Record<string, unknown>>(columns: ColumnDef<T>[]): ExportColumn[] {
  return columns
    .filter((c) => c.rendererType !== 'fileDrop')
    .map((c) => ({
      key: c.fieldName,
      name: c.name,
      fieldType: rendererToFieldType(c.rendererType),
    }));
}

/**
 * The CSV rows: each cell is the text the GRID SHOWS for it.
 *
 * ★★ dynamics-utils formats the RAW `item[fieldName]` and never reads the
 * `@OData…FormattedValue` annotation the grid displays — so a choice showing
 * "Active" exported as `1`, a flat lookup `_x_value` as its GUID, and currency
 * always as `$`/en-US. A cell with a supplied formatted value now exports THAT
 * (the same lookup the cell adapters use); any other cell keeps dynamics-utils'
 * own formatting of the raw value. Every cell is pre-formatted here and the
 * columns go out as `text` — handing a display string to a `currency` column
 * would make the formatter `Number("$1,234.50")` → NaN → an empty cell.
 */
export function toDisplayedExportRows<T extends Record<string, unknown>>(
  items: T[],
  columns: ColumnDef<T>[]
): { rows: Record<string, unknown>[]; columns: ExportColumn[] } {
  const exportColumns = toExportColumns(columns);
  // ★ Keyed by column POSITION, not field: two columns on one field (a number and a currency
  //   view of `revenue`) must keep their own formatting — a field-keyed row let the last win.
  const rows = items.map((item) => {
    const row: Record<string, unknown> = {};
    exportColumns.forEach((c, i) => {
      row[`c${i}`] = getSuppliedFormattedValue(item, c.key) ?? formatValueForExport(item[c.key], c.fieldType);
    });
    return row;
  });
  return { rows, columns: exportColumns.map((c, i) => ({ ...c, key: `c${i}`, fieldType: 'text' })) };
}

/**
 * Export grid rows to a CSV or JSON file. CSV carries what the grid SHOWS
 * (see `toDisplayedExportRows`); JSON carries the raw values. The consumer
 * passes exactly the rows to export (current page, all items, or the selection).
 */
export function exportGrid<T extends Record<string, unknown>>(
  items: T[],
  columns: ColumnDef<T>[],
  format: ExportFormat = 'csv',
  filename?: string
): void {
  const name = filename ?? generateDefaultFilename('grid-export');
  if (format === 'json') {
    exportToFile(items, toExportColumns(columns), format, name);
    return;
  }
  const displayed = toDisplayedExportRows(items, columns);
  exportToFile(displayed.rows, displayed.columns, format, name);
}
