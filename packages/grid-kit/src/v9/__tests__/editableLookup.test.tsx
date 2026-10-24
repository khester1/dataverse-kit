// @vitest-environment jsdom
/**
 * v9 `EditableLookupCell` through the REAL grid. Fixture = the Dataverse row shape: a `_x_value` GUID with
 * its `@OData…FormattedValue` and `lookuplogicalname` annotations (the raw value and the shown name DIFFER),
 * plus a logical-name + `displayField` row. `searchLookup` is a deferred-promise fake, so each test decides
 * which search resolves when.
 *
 * ★ Fake timers drive the debounce, so ONLY `act` + `advanceTimersByTime` + `getBy`/`queryBy` — Testing
 *   Library's `findBy`/`waitFor` poll on the faked `setTimeout` under Vitest and hang.
 * ★ Every stimulus is asserted to have LANDED (the list is open, the input holds the text) before the
 *   effect is read: a list that never opened and a filter that rejects read the same.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, fireEvent, cleanup, within, act, screen } from '@testing-library/react';
import type { ColumnDef } from '../../types';
import { DataGrid } from '../hosts/DataGrid';
import { createV9CellRegistry } from '../cells/registry';
import { LookupCell } from '../cells/cells';
import { EditableLookupCell, LOOKUP_SEARCH_DEBOUNCE_MS } from '../cells/editableLookup';
import { wrapper } from './testUtils';

const FV = '@OData.Community.Display.V1.FormattedValue';
const LN = '@Microsoft.Dynamics.CRM.lookuplogicalname';
const GUID = 'a1b2c3d4-0000-0000-0000-000000000001';
type Row = Record<string, unknown> & { key: string };
const rows = (): Row[] => [
  { key: 'r1', name: 'Alpha', _parentaccountid_value: GUID, [`_parentaccountid_value${FV}`]: 'Contoso Ltd', [`_parentaccountid_value${LN}`]: 'account' },
  { key: 'r2', name: 'Beta', _parentaccountid_value: null },
];

interface Call {
  term: string;
  resolve: (v: unknown[]) => void;
  reject: (e: unknown) => void;
}
function fakeSearch() {
  const calls: Call[] = [];
  const fn = vi.fn((term: string) => new Promise<unknown[]>((resolve, reject) => calls.push({ term, resolve, reject })));
  return { fn, calls, terms: () => calls.map((c) => c.term) };
}
const registry = () => createV9CellRegistry({ lookup: { read: LookupCell, edit: EditableLookupCell } });
const col = (search: unknown, extra: Record<string, unknown> = {}, colExtra: Partial<ColumnDef<Row>> = {}): ColumnDef<Row> => ({
  key: 'parent', fieldName: '_parentaccountid_value', name: 'Parent', rendererType: 'lookup', editorType: 'lookup',
  rendererConfig: { searchLookup: search, entitySetName: 'accounts', ...extra }, ...colExtra,
});

/** The data cell of the lookup column in row `r` (0-based). */
const cell = (r = 0): HTMLElement => {
  const body = [...document.querySelectorAll('[role="row"]')].filter((x) => !x.querySelector('[role="columnheader"]'));
  return [...body[r].querySelectorAll<HTMLElement>('[role="gridcell"]')].filter((c) => !c.classList.contains('fui-TableSelectionCell'))[0];
};
const input = (r = 0): HTMLInputElement => within(cell(r)).getByRole('combobox') as HTMLInputElement;
const optionNames = (): string[] => screen.queryAllByRole('option').map((o) => o.textContent ?? '');
const status = (): string | null => document.querySelector('[data-gridkit-lookup-status]')?.textContent ?? null;

function enterEdit(r = 0): void {
  fireEvent.click(within(cell(r)).getByTitle('Click to edit'));
  expect(input(r).getAttribute('aria-expanded'), 'instrument: entering edit opened the list').toBe('true');
}
async function settle(call: Call, value: unknown[] | Error): Promise<void> {
  await act(async () => {
    if (value instanceof Error) call.reject(value);
    else call.resolve(value);
    // Let the cell's `.then` run INSIDE act — a single hop was not enough under full-suite load.
    for (let i = 0; i < 5; i++) await Promise.resolve();
  });
}
function type(text: string, r = 0): void {
  fireEvent.change(input(r), { target: { value: text } });
  expect(input(r).value, 'instrument: the typed text landed').toBe(text);
}
const advance = (ms: number): void => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

const RESULTS = [
  { id: 'f1', name: 'Fabrikam' },
  { id: 'n2', name: 'Northwind' },
];

// MEASURED: alone, the status-rows test takes ~4.0 s and the stale-search test ~2.7 s (every keystroke
// re-renders a whole Fluent grid in jsdom), so under the full suite's parallel load both crossed the 5 s
// default — consistently, as timeouts, not assertion failures. The budget follows the measurement.
vi.setConfig({ testTimeout: 20_000 });

// Only the timers the debounce uses — faking setImmediate & co. as well starved React/Fluent's own
// scheduling under full-suite load (results resolved but never rendered).
beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('v9 EditableLookupCell — opening and searching', () => {
  it('instrument: read mode shows the FormattedValue name, not the GUID', () => {
    const s = fakeSearch();
    render(<DataGrid items={rows()} columns={[col(s.fn)]} registry={registry()} editable />, { wrapper });
    expect(cell(0).textContent).toBe('Contoso Ltd');
    expect(s.fn).not.toHaveBeenCalled();
  });

  it('entering edit opens the list and searches exactly once with ""', () => {
    const s = fakeSearch();
    render(<DataGrid items={rows()} columns={[col(s.fn)]} registry={registry()} editable />, { wrapper });
    enterEdit();
    expect(s.terms()).toEqual(['']);
    expect(input().value, 'the editor starts on the current name').toBe('Contoso Ltd');
  });

  it('editTrigger="always": N mounted editors make NO search until one is opened', () => {
    const s = fakeSearch();
    render(<DataGrid items={rows()} columns={[col(s.fn)]} registry={registry()} editable editTrigger="always" />, { wrapper });
    expect(within(cell(0)).queryByRole('combobox'), 'instrument: editors are mounted').not.toBeNull();
    expect(s.fn).not.toHaveBeenCalled();
  });

  it('typing is debounced: "C","Co","Con" → nothing at 299 ms, one "Con" search at 300', () => {
    const s = fakeSearch();
    render(<DataGrid items={rows()} columns={[col(s.fn)]} registry={registry()} editable />, { wrapper });
    enterEdit();
    type('C');
    type('Co');
    type('Con');
    advance(LOOKUP_SEARCH_DEBOUNCE_MS - 1);
    expect(s.terms()).toEqual(['']);
    advance(2);
    expect(s.terms()).toEqual(['', 'Con']);
  });

  it('★ a slower EARLIER search cannot overwrite a later one', async () => {
    const s = fakeSearch();
    render(<DataGrid items={rows()} columns={[col(s.fn)]} registry={registry()} editable />, { wrapper });
    enterEdit();
    type('Co');
    advance(LOOKUP_SEARCH_DEBOUNCE_MS);
    type('Con');
    advance(LOOKUP_SEARCH_DEBOUNCE_MS);
    expect(s.terms(), 'instrument: three searches in flight').toEqual(['', 'Co', 'Con']);
    await settle(s.calls[2], [{ id: 'c1', name: 'Contoso Ltd' }]); // "Con" — the latest
    await settle(s.calls[1], [{ id: 'x1', name: 'Coho Winery' }]); // "Co" — late
    await settle(s.calls[0], RESULTS); // "" — later still
    expect(optionNames()).toEqual(['(None)', 'Contoso Ltd']);
  });

  it('results accept {key,text} items too', async () => {
    const s = fakeSearch();
    render(<DataGrid items={rows()} columns={[col(s.fn)]} registry={registry()} editable />, { wrapper });
    enterEdit();
    await settle(s.calls[0], [{ key: 'k9', text: 'Keyed Co' }]);
    expect(optionNames()).toEqual(['(None)', 'Keyed Co']);
  });

  it('status rows are NOT options: Searching…, No results found, Search failed', async () => {
    const s = fakeSearch();
    render(<DataGrid items={rows()} columns={[col(s.fn)]} registry={registry()} editable />, { wrapper });
    enterEdit();
    expect(status()).toBe('Searching…');
    await settle(s.calls[0], []);
    expect(status()).toBe('No results found');
    expect(optionNames(), 'only (None) is selectable').toEqual(['(None)']);
    type('x');
    advance(LOOKUP_SEARCH_DEBOUNCE_MS);
    await settle(s.calls[1], new Error('boom'));
    expect(status(), 'a failed search says so — not "No results"').toBe('Search failed');
  });
});

describe('v9 EditableLookupCell — committing', () => {
  it('★ typing over the current name commits NOTHING (Fluent clears its selection with optionValue undefined)', () => {
    const s = fakeSearch();
    const onValueChange = vi.fn();
    render(<DataGrid items={rows()} columns={[col(s.fn)]} registry={registry()} editable onValueChange={onValueChange} />, { wrapper });
    enterEdit();
    type('Con');
    type('');
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('picking a result commits the EXACT value (original = the row\'s GUID); after exit the cell reads the NEW name', async () => {
    // ★ The KEYBOARD path (ArrowDown + Enter) is gated in Chrome (ce-parity lookup.spec.mjs): in jsdom even a
    //   bare Fluent Combobox never moves its active option on ArrowDown (measured), so a keyboard test here
    //   would pass or fail for reasons that are not the editor's.
    const s = fakeSearch();
    const onValueChange = vi.fn();
    render(<DataGrid items={rows()} columns={[col(s.fn)]} registry={registry()} editable onValueChange={onValueChange} />, { wrapper });
    enterEdit();
    await settle(s.calls[0], RESULTS);
    fireEvent.click(screen.getByRole('option', { name: 'Fabrikam' }));
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith('r1', '_parentaccountid_value', { id: 'f1', name: 'Fabrikam', entitySetName: 'accounts' }, GUID);
    expect(input().value, 'the picked name shows in the editor').toBe('Fabrikam');
    fireEvent.keyDown(input(), { key: 'Escape' });
    expect(within(cell(0)).queryByRole('combobox'), 'the edit exited').toBeNull();
    expect(cell(0).textContent).toBe('Fabrikam');
  });

  it('a click on an option commits it; "(None)" commits null and the cell reads empty', async () => {
    const s = fakeSearch();
    const onValueChange = vi.fn();
    render(<DataGrid items={rows()} columns={[col(s.fn)]} registry={registry()} editable onValueChange={onValueChange} />, { wrapper });
    enterEdit();
    await settle(s.calls[0], RESULTS);
    fireEvent.click(screen.getByRole('option', { name: '(None)' }));
    expect(onValueChange).toHaveBeenLastCalledWith('r1', '_parentaccountid_value', null, GUID);
    fireEvent.keyDown(input(), { key: 'Escape' });
    expect(cell(0).textContent).toBe('-');
  });

  it('re-choosing the record the cell already holds is not an edit (no call, no false dirty)', async () => {
    const s = fakeSearch();
    const onValueChange = vi.fn();
    render(<DataGrid items={rows()} columns={[col(s.fn)]} registry={registry()} editable onValueChange={onValueChange} />, { wrapper });
    enterEdit();
    await settle(s.calls[0], [{ id: GUID, name: 'Contoso Ltd' }, ...RESULTS]);
    fireEvent.click(screen.getByRole('option', { name: 'Contoso Ltd' }));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('`lookupEntitySetName` is honoured too (both config aliases)', async () => {
    const s = fakeSearch();
    const onValueChange = vi.fn();
    const c = col(s.fn);
    c.rendererConfig = { searchLookup: s.fn, lookupEntitySetName: 'contacts' };
    render(<DataGrid items={rows()} columns={[c]} registry={registry()} editable onValueChange={onValueChange} />, { wrapper });
    enterEdit();
    await settle(s.calls[0], RESULTS);
    fireEvent.click(screen.getByRole('option', { name: 'Northwind' }));
    expect(onValueChange.mock.calls[0][2]).toEqual({ id: 'n2', name: 'Northwind', entitySetName: 'contacts' });
  });

  it('a logical-name + displayField row: after a commit the cell reads the NEW name, not the row\'s displayField', async () => {
    const s = fakeSearch();
    const items: Row[] = [{ key: 'r1', parentaccountid: GUID, parentname: 'Contoso Ltd' }];
    const c: ColumnDef<Row> = {
      key: 'parent', fieldName: 'parentaccountid', name: 'Parent', rendererType: 'lookup', editorType: 'lookup',
      rendererConfig: { searchLookup: s.fn, displayField: 'parentname' },
    };
    render(<DataGrid items={items} columns={[c]} registry={registry()} editable />, { wrapper });
    expect(cell(0).textContent, 'instrument: displayField reads first').toBe('Contoso Ltd');
    enterEdit();
    await settle(s.calls[0], RESULTS);
    fireEvent.click(screen.getByRole('option', { name: 'Northwind' }));
    fireEvent.keyDown(input(), { key: 'Escape' });
    expect(cell(0).textContent).toBe('Northwind');
  });

  it('column.validate receives the committed value and its message shows', async () => {
    const s = fakeSearch();
    const validate = vi.fn((v: unknown) => (v === null ? 'Parent is required' : undefined));
    render(<DataGrid items={rows()} columns={[col(s.fn, {}, { validate })]} registry={registry()} editable />, { wrapper });
    enterEdit();
    await settle(s.calls[0], RESULTS);
    fireEvent.click(screen.getByRole('option', { name: '(None)' }));
    expect(validate).toHaveBeenLastCalledWith(null, 'r1');
    expect(cell(0).textContent).toContain('Parent is required');
  });
});

describe('v9 EditableLookupCell — Escape, unmount, editability', () => {
  it('two-stage Escape: the first closes the list and restores the name; the second exits', () => {
    const s = fakeSearch();
    render(<DataGrid items={rows()} columns={[col(s.fn)]} registry={registry()} editable />, { wrapper });
    enterEdit();
    type('Zzz');
    fireEvent.keyDown(input(), { key: 'Escape' });
    expect(input().getAttribute('aria-expanded')).toBe('false');
    expect(input().value).toBe('Contoso Ltd');
    expect(within(cell(0)).queryByRole('combobox'), 'the first Escape did not exit').not.toBeNull();
    fireEvent.keyDown(input(), { key: 'Escape' });
    expect(within(cell(0)).queryByRole('combobox')).toBeNull();
  });

  it('no searchLookup: the column is NOT editable (no affordance), with ONE warning per column per grid', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const noSearch: ColumnDef<Row> = { ...col(undefined), rendererConfig: { entitySetName: 'accounts' } };
    const p = { items: rows(), registry: registry(), editable: true };
    const { rerender } = render(<DataGrid {...p} columns={[noSearch]} />, { wrapper });
    expect(within(cell(0)).queryByTitle('Click to edit')).toBeNull();
    expect(cell(0).textContent, 'it still reads').toBe('Contoso Ltd');
    rerender(<DataGrid {...p} columns={[noSearch]} />);
    expect(warn.mock.calls.filter((c) => String(c[0]).includes('no rendererConfig.searchLookup'))).toHaveLength(1);
    const second: ColumnDef<Row> = { ...noSearch, key: 'parent2' };
    rerender(<DataGrid {...p} columns={[noSearch, second]} />);
    expect(warn.mock.calls.filter((c) => String(c[0]).includes('no rendererConfig.searchLookup'))).toHaveLength(2);
  });

  it('opt-in: with the DEFAULT registry a lookup is read-only (the editor is not bundled unless imported)', () => {
    const s = fakeSearch();
    render(<DataGrid items={rows()} columns={[col(s.fn)]} editable />, { wrapper });
    expect(within(cell(0)).queryByTitle('Click to edit')).toBeNull();
  });

});

describe('v9 EditableLookupCell — review of #454', () => {
  it('H1 editTrigger="always": a real click (down, focus, up, click) leaves the list OPEN, with one search', () => {
    const s = fakeSearch();
    render(<DataGrid items={rows()} columns={[col(s.fn)]} registry={registry()} editable editTrigger="always" />, { wrapper });
    const el = input(0);
    fireEvent.mouseDown(el);
    fireEvent.focus(el);
    fireEvent.mouseUp(el);
    fireEvent.click(el);
    expect(el.getAttribute('aria-expanded')).toBe('true');
    expect(s.terms()).toEqual(['']);
  });

  it('M1 reopening the list searches the TYPED text, not everything', () => {
    const s = fakeSearch();
    render(<DataGrid items={rows()} columns={[col(s.fn)]} registry={registry()} editable />, { wrapper });
    enterEdit();
    type('nor');
    advance(LOOKUP_SEARCH_DEBOUNCE_MS);
    expect(s.terms(), 'instrument').toEqual(['', 'nor']);
    fireEvent.click(input()); // closes
    expect(input().getAttribute('aria-expanded'), 'instrument: the click closed the list').toBe('false');
    fireEvent.click(input()); // reopens
    expect(input().getAttribute('aria-expanded'), 'instrument: the click reopened it').toBe('true');
    expect(s.terms()).toEqual(['', 'nor', 'nor']);
  });

  it('M1 typing into a CLOSED list searches the typed term once — no extra "" search first', () => {
    const s = fakeSearch();
    render(<DataGrid items={rows()} columns={[col(s.fn)]} registry={registry()} editable />, { wrapper });
    enterEdit();
    fireEvent.keyDown(input(), { key: 'Escape' }); // close (stays editing)
    expect(input().getAttribute('aria-expanded'), 'instrument: closed').toBe('false');
    fireEvent.keyDown(input(), { key: 'N' });
    type('N');
    advance(LOOKUP_SEARCH_DEBOUNCE_MS);
    expect(s.terms()).toEqual(['', 'N']);
  });

  it('M2 a lookup with searchLookup on the DEFAULT registry warns that the editor is not registered', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const s = fakeSearch();
    render(<DataGrid items={rows()} columns={[col(s.fn)]} editable />, { wrapper });
    expect(warn.mock.calls.filter((c) => String(c[0]).includes('EditableLookupCell'))).toHaveLength(1);
  });

  it('M3 grids sharing one column definition (as nested child grids do) warn ONCE for it', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const noSearch: ColumnDef<Row> = { ...col(undefined), key: 'shared', rendererConfig: { entitySetName: 'accounts' } };
    render(
      <>
        <DataGrid items={rows()} columns={[noSearch]} registry={registry()} editable />
        <DataGrid items={rows()} columns={[noSearch]} registry={registry()} editable />
      </>,
      { wrapper },
    );
    expect(warn.mock.calls.filter((c) => String(c[0]).includes('"shared"'))).toHaveLength(1);
  });
});
