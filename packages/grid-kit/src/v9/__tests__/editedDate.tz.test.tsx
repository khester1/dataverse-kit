// @vitest-environment jsdom
/**
 * A committed DATE-ONLY edit must read the day the user picked — in every timezone. The date editor
 * commits "YYYY-MM-DD"; formatted as-is, `new Date("2026-10-08")` is UTC midnight, which is Oct 7 WEST of
 * UTC (review of #452, measured). Run by `scripts/test-tz.mjs` under America/Los_Angeles (and
 * Pacific/Kiritimati, where the same defect cannot show — the control zone); skipped otherwise.
 */
import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { render, fireEvent, cleanup, within } from '@testing-library/react';
import type { ColumnDef } from '../../types';
import { DataGrid } from '../hosts/DataGrid';
import { wrapper } from './testUtils';

afterEach(cleanup);
const tz = process.env.TZ;
type Row = Record<string, unknown> & { key: string };
const items: Row[] = [{ key: 'r1', due: '2026-06-15' }];
const cols: ColumnDef<Row>[] = [{ key: 'due', fieldName: 'due', name: 'Due', rendererType: 'date', editorType: 'date' }];
const cell = (): HTMLElement => {
  const row = [...document.querySelectorAll('[role="row"]')].find((r) => !r.querySelector('[role="columnheader"]'))!;
  return row.querySelector<HTMLElement>('[role="gridcell"]')!;
};
function commitDate(day: string): void {
  fireEvent.click(within(cell()).getByTitle('Click to edit'));
  const input = cell().querySelector('input[type="date"]') as HTMLInputElement;
  fireEvent.change(input, { target: { value: day } });
  expect(input.value, 'instrument: the picked day landed').toBe(day);
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(cell().querySelector('input'), 'instrument: the editor closed').toBeNull();
}

describe.runIf(tz === 'America/Los_Angeles')('edited date at UTC-7', () => {
  it('instrument: the process really is at UTC-7 in June', () => {
    expect(new Date('2026-06-15T12:00:00Z').getTimezoneOffset()).toBe(420);
  });
  it('the editor opens on the stored day of a date-only value (not the day before)', () => {
    render(<DataGrid items={items} columns={cols} editable />, { wrapper });
    fireEvent.click(within(cell()).getByTitle('Click to edit'));
    expect((cell().querySelector('input[type="date"]') as HTMLInputElement).value).toBe('2026-06-15');
  });
  it('a committed date-only edit reads the PICKED day (not the day before)', () => {
    render(<DataGrid items={items} columns={cols} editable />, { wrapper });
    commitDate('2026-10-08');
    expect(cell().textContent).toBe('Oct 8, 2026');
  });
});

describe.runIf(tz === 'Pacific/Kiritimati')('edited date at UTC+14', () => {
  it('a committed date-only edit reads the picked day', () => {
    render(<DataGrid items={items} columns={cols} editable />, { wrapper });
    commitDate('2026-10-08');
    expect(cell().textContent).toBe('Oct 8, 2026');
  });
});

describe.runIf(tz !== 'America/Los_Angeles' && tz !== 'Pacific/Kiritimati')('edited date (run again under two pinned timezones)', () => {
  it('is skipped here by design — see the package `test` script', () => {
    expect(tz === 'America/Los_Angeles' || tz === 'Pacific/Kiritimati').toBe(false);
  });
});
