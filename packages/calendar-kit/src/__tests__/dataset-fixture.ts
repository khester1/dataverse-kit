import type { PcfDatasetLike, PcfColumnLike } from '../adapters/pcf-dataset';

/**
 * A PCF dataset built from REAL rows (orge2e285aa, 2026-09-26, Pacific user): raw values are the
 * strings `getValue()` returned, formatted values are what `getFormattedValue()` returned.
 *
 * ★ It WITHHOLDS like the platform: a column not in `columns` answers null / '' — a fake that
 *   answers from the row regardless makes "declared but never fetched" invisible.
 * ★ Yes/No raw values are the STRINGS "0"/"1", as the platform sends them.
 */
type Row = Record<string, [raw: unknown, formatted: string]>;

export const ROWS: Record<string, Row> = {
  A: {
    dvk_name: ['A Mon 09:00 PDT', 'A Mon 09:00 PDT'],
    dvk_startlocal: ['2026-09-28T16:00:00.000Z', '9/28/2026 9:00 AM'],
    dvk_endlocal: ['2026-09-28T17:00:00.000Z', '9/28/2026 10:00 AM'],
    dvk_daystart: ['2026-09-28T00:00:00.000Z', '9/28/2026'],
    dvk_dayend: ['2026-09-28T00:00:00.000Z', '9/28/2026'],
    dvk_tzistart: ['2026-09-28T09:00:00.000Z', '9/28/2026 9:00 AM'],
    dvk_tziend: ['2026-09-28T10:00:00.000Z', '9/28/2026 10:00 AM'],
    dvk_location: ['{guid-north}', 'North clinic'],
    dvk_allday: ['0', 'No'],
  },
  B: {
    dvk_name: ['B Tue 23:30 PDT', 'B Tue 23:30 PDT'],
    dvk_startlocal: ['2026-09-30T06:30:00.000Z', '9/29/2026 11:30 PM'],
    dvk_endlocal: ['2026-09-30T07:30:00.000Z', '9/30/2026 12:30 AM'],
    dvk_daystart: ['2026-09-29T00:00:00.000Z', '9/29/2026'],
    dvk_dayend: ['2026-09-29T00:00:00.000Z', '9/29/2026'],
    dvk_tzistart: ['2026-09-29T23:30:00.000Z', '9/29/2026 11:30 PM'],
    dvk_tziend: ['2026-09-30T00:30:00.000Z', '9/30/2026 12:30 AM'],
    dvk_location: ['{guid-south}', 'South clinic'],
    dvk_allday: ['0', 'No'],
  },
  D: {
    dvk_name: ['D Thu-Fri multi-day', 'D Thu-Fri multi-day'],
    dvk_startlocal: ['2026-10-01T16:00:00.000Z', '10/1/2026 9:00 AM'],
    dvk_endlocal: ['2026-10-02T17:00:00.000Z', '10/2/2026 10:00 AM'],
    dvk_daystart: ['2026-10-01T00:00:00.000Z', '10/1/2026'],
    dvk_dayend: ['2026-10-02T00:00:00.000Z', '10/2/2026'],
    dvk_tzistart: ['2026-10-01T09:00:00.000Z', '10/1/2026 9:00 AM'],
    dvk_tziend: ['2026-10-02T10:00:00.000Z', '10/2/2026 10:00 AM'],
    dvk_location: [null, ''],
    dvk_allday: ['1', 'Yes'],
  },
  NOSTART: {
    dvk_name: ['No start yet', 'No start yet'],
    dvk_startlocal: [null, ''],
    dvk_endlocal: [null, ''],
    dvk_daystart: [null, ''],
    dvk_dayend: [null, ''],
    dvk_tzistart: [null, ''],
    dvk_tziend: [null, ''],
    dvk_location: [null, ''],
    dvk_allday: ['0', 'No'],
  },
};

export function makeDataset(columns: PcfColumnLike[], ids = Object.keys(ROWS)): PcfDatasetLike {
  const exposed = new Set(columns.map((c) => c.name));
  const records: Record<string, PcfDatasetLike['records'][string]> = {};
  for (const id of ids) {
    const row = ROWS[id];
    records[id] = {
      getValue: (c) => (exposed.has(c) ? row[c]?.[0] ?? null : null),
      getFormattedValue: (c) => (exposed.has(c) ? row[c]?.[1] ?? '' : ''),
    };
  }
  return { columns, sortedRecordIds: ids, records };
}

/** Columns as the host reports them: property-set columns carry the set name as `alias`. */
export const col = (name: string, alias: string, dataType = 'DateAndTime.DateAndTime'): PcfColumnLike => ({ name, alias, dataType });
