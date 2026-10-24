// @vitest-environment jsdom
/**
 * After an edit is COMMITTED and the editor closes, the cell must READ the edited value — for every v9
 * editor, through the real grid. `buildCellProps` describes the original row, so before
 * `showEditedValue` (v9/adapter.tsx) six of seven editors showed the OLD value again (measured in Chrome:
 * a choice changed Active → Inactive still read "Active"). The currency row carries a Dataverse
 * FormattedValue, the case where a stale annotation would win over the edit.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, fireEvent, cleanup, within } from '@testing-library/react';
import type { ColumnDef, GridCellProps } from '../../types';
import { DataGrid } from '../hosts/DataGrid';
import { createV9CellRegistry } from '../cells/registry';
import { LookupCell } from '../cells/cells';
import { EditableTextCell } from '../cells/editable';
import { wrapper } from './testUtils';

afterEach(cleanup);

const FV = '@OData.Community.Display.V1.FormattedValue';
type Row = Record<string, unknown> & { key: string };
const items: Row[] = [
  { key: 'r1', name: 'Contoso', revenue: 1500, [`revenue${FV}`]: '$1,500.00', employees: 12, site: 'https://contoso.example' },
];
const cols = (): ColumnDef<Row>[] => [
  { key: 'name', fieldName: 'name', name: 'Name', rendererType: 'text', editorType: 'text' },
  { key: 'revenue', fieldName: 'revenue', name: 'Revenue', rendererType: 'currency', editorType: 'number', rendererConfig: { currencyCode: 'USD', locale: 'en-US' } },
  { key: 'employees', fieldName: 'employees', name: 'Employees', rendererType: 'number', editorType: 'number' },
  { key: 'site', fieldName: 'site', name: 'Site', rendererType: 'link', editorType: 'text' },
];
/** The gridcell of column `i` (0-based, data columns only) in the first body row. */
const cell = (i: number): HTMLElement => {
  const row = [...document.querySelectorAll('[role="row"]')].find((r) => !r.querySelector('[role="columnheader"]'))!;
  // Data cells only — with a selection column the first gridcell is the checkbox cell.
  return [...row.querySelectorAll<HTMLElement>('[role="gridcell"]')].filter((c) => !c.classList.contains('fui-TableSelectionCell'))[i];
};
function commitText(i: number, text: string): void {
  fireEvent.click(within(cell(i)).getByTitle('Click to edit'));
  const input = within(cell(i)).getByRole('textbox') as HTMLInputElement;
  fireEvent.change(input, { target: { value: text } });
  expect(input.value, 'instrument: the typed value landed').toBe(text);
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(within(cell(i)).queryByRole('textbox'), 'instrument: the editor closed').toBeNull();
}

describe('v9 editors — the committed value is what the cell reads', () => {
  it('instrument: before any edit, the original values (incl. the supplied FormattedValue)', () => {
    render(<DataGrid items={items} columns={cols()} editable />, { wrapper });
    expect([0, 1, 2, 3].map((i) => cell(i).textContent)).toEqual(['Contoso', '$1,500.00', '12', 'https://contoso.example']);
  });

  it('text: reads the new text', () => {
    render(<DataGrid items={items} columns={cols()} editable />, { wrapper });
    commitText(0, 'Fabrikam');
    expect(cell(0).textContent).toBe('Fabrikam');
  });

  it('currency WITH a supplied FormattedValue: reads the new amount, formatted — not the stale "$1,500.00"', () => {
    render(<DataGrid items={items} columns={cols()} editable />, { wrapper });
    commitText(1, '2750');
    expect(cell(1).textContent).toBe('$2,750.00');
  });

  it('number: reads the new number', () => {
    render(<DataGrid items={items} columns={cols()} editable />, { wrapper });
    commitText(2, '40');
    expect(cell(2).textContent).toBe('40');
  });

  it('link with navigateTo: reads the new URL and does NOT navigate to the original row\'s target', () => {
    const navigateTo = vi.fn(() => ({ pageType: 'entityrecord' as const, entityName: 'account', entityId: 'r1' }));
    render(<DataGrid items={items} columns={cols()} editable navigateTo={navigateTo} />, { wrapper });
    commitText(3, 'https://fabrikam.example');
    expect(cell(3).textContent).toBe('https://fabrikam.example');
    // ★ Behaviour, not role: Fluent's Link without an href renders as a BUTTON, so "no role=link" passed
    //   with the old record's click still wired. Clicking must not resolve a navigation target.
    navigateTo.mockClear();
    fireEvent.click(within(cell(3)).getByText('https://fabrikam.example'));
    expect(navigateTo, 'a dirty link does not open the ORIGINAL row').not.toHaveBeenCalled();
  });

  it('control: an UNEDITED link still navigates (else the check above proves nothing)', () => {
    const navigateTo = vi.fn(() => ({ pageType: 'entityrecord' as const, entityName: 'account', entityId: 'r1' }));
    render(<DataGrid items={items} columns={cols()} editable navigateTo={navigateTo} />, { wrapper });
    fireEvent.click(within(cell(3)).getByText('https://contoso.example'));
    expect(navigateTo).toHaveBeenCalledTimes(1);
  });

  it('a lookup (with a consumer-registered editor) reads the edit, not the row\'s supplied FormattedValue', () => {
    // Lookup is the read cell that reads `suppliedFormattedValue` FIRST — the only one where a stale
    // annotation can win, so the only place the "drop the supplied FormattedValue" rule is observable.
    // An editable column resolves its EDIT renderer even when not editing, so the editor's read mode
    // must be LookupCell — as PR B's lookup editor will be (EditableTextCell's read mode is TextCell,
    // which never reads the supplied FormattedValue, and made this test vacuous).
    const LookupEditor = (p: GridCellProps<Row>): JSX.Element => (p.isEditing ? <EditableTextCell {...p} /> : <LookupCell {...p} />);
    const registry = createV9CellRegistry({ lookup: { read: LookupCell, edit: LookupEditor } });
    const lookupRows: Row[] = [{ key: 'r1', parent: 'a1b2c3d4-0000-0000-0000-000000000001', [`parent${FV}`]: 'Contoso Ltd' }];
    const lookupCols: ColumnDef<Row>[] = [{ key: 'parent', fieldName: 'parent', name: 'Parent', rendererType: 'lookup', editorType: 'lookup' }];
    render(<DataGrid items={lookupRows} columns={lookupCols} registry={registry} editable />, { wrapper });
    expect(cell(0).textContent, 'instrument: the supplied name reads first').toBe('Contoso Ltd');
    commitText(0, 'Fabrikam');
    expect(cell(0).textContent).toBe('Fabrikam');
  });

  it('a click inside an open editor does not reach the row (no selection toggle, no active-row change)', () => {
    const onSelectionChanged = vi.fn();
    const onActiveItemChanged = vi.fn();
    render(
      <DataGrid items={items} columns={cols()} editable selectionMode="multiple" onSelectionChanged={onSelectionChanged} onActiveItemChanged={onActiveItemChanged} />,
      { wrapper },
    );
    fireEvent.click(within(cell(0)).getByTitle('Click to edit'));
    const input = within(cell(0)).getByRole('textbox');
    fireEvent.click(input);
    fireEvent.doubleClick(input);
    expect(onSelectionChanged).not.toHaveBeenCalled();
    expect(onActiveItemChanged).not.toHaveBeenCalled();
  });

  it('a toggle reports the ORIGINAL row value as originalValue on every change (not the previous edit)', () => {
    const onValueChange = vi.fn();
    const rows: Row[] = [{ key: 'r1', active: true }];
    const toggleCols: ColumnDef<Row>[] = [{ key: 'active', fieldName: 'active', name: 'Active', rendererType: 'toggle', editorType: 'toggle' }];
    render(<DataGrid items={rows} columns={toggleCols} editable onValueChange={onValueChange} />, { wrapper });
    const sw = (): HTMLInputElement => within(cell(0)).getByRole('switch') as HTMLInputElement;
    fireEvent.click(sw());
    expect(sw().checked, 'instrument: the first toggle landed').toBe(false);
    fireEvent.click(sw());
    expect(sw().checked, 'instrument: the second toggle landed').toBe(true);
    expect(onValueChange.mock.calls.map((c) => [c[2], c[3]])).toEqual([[false, true], [true, true]]);
  });
});
