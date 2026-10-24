// @vitest-environment jsdom
/**
 * v8 `DataGrid` column chooser — the visible set must SURVIVE a new `columns` array.
 *
 * ★★ Written BEFORE the fix and watched failing on the shipped code: the reconcile kept only the
 *   VISIBLE keys, so a hidden key looked "new" on the next `columns` identity and was re-appended —
 *   every PCF `updateView`, every inline `columns={[…]}`, un-hid whatever the user had hidden.
 *   The re-render below passes a NEW array holding the SAME keys, which is all it takes.
 */
import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { setIconOptions } from '@fluentui/react';
import { DataGrid } from '../hosts/DataGrid';
import type { ColumnDef } from '../types';

setIconOptions({ disableWarnings: true });
afterEach(cleanup);

interface Row extends Record<string, unknown> {
  key: string;
  name: string;
  city: string;
  revenue: number;
}
const items: Row[] = [{ key: '1', name: 'Alpha', city: 'Oslo', revenue: 10 }];
const cols = (): ColumnDef<Row>[] => [
  { key: 'name', fieldName: 'name', name: 'Name', rendererType: 'text', minWidth: 100 },
  { key: 'city', fieldName: 'city', name: 'City', rendererType: 'text', minWidth: 100 },
  { key: 'revenue', fieldName: 'revenue', name: 'Revenue', rendererType: 'number', minWidth: 100 },
];

const headers = (): string[] =>
  Array.from(document.querySelectorAll('[role="columnheader"]'))
    .map((h) => h.textContent?.trim() ?? '')
    .filter(Boolean);

function hideViaPanel(name: string): void {
  // Fluent v8's CommandBar renders the command inside a measuring layer the role query treats as
  // inaccessible — target the button by its text, then PROVE the panel opened.
  const cmd = screen.getAllByText('Columns').map((el) => el.closest('button')).find(Boolean);
  if (!cmd) throw new Error('instrument: no Columns command button');
  fireEvent.click(cmd);
  const panel = screen.getByRole('dialog');
  expect(within(panel).getByText('Shown (3)'), 'instrument: the chooser panel opened').toBeTruthy();
  fireEvent.click(within(panel).getByRole('checkbox', { name: `Hide ${name}` }));
  fireEvent.click(within(panel).getByRole('button', { name: 'Apply' }));
}

describe('v8 DataGrid column chooser', () => {
  it('a hidden column STAYS hidden when the grid receives a new columns array with the same keys', () => {
    const { rerender } = render(<DataGrid items={items} columns={cols()} columnChooser />);
    expect(headers(), 'instrument: all three columns render first').toEqual(['Name', 'City', 'Revenue']);
    hideViaPanel('City');
    expect(headers(), 'instrument: the panel hid City').toEqual(['Name', 'Revenue']);
    rerender(<DataGrid items={items} columns={cols()} columnChooser />);
    expect(headers()).toEqual(['Name', 'Revenue']);
  });

  it('initialVisibleOrder (new on v8): listed keys in order, the rest hidden', () => {
    render(<DataGrid items={items} columns={cols()} columnChooser initialVisibleOrder={['revenue', 'name']} />);
    expect(headers()).toEqual(['Revenue', 'Name']);
  });

  it('a host `__…` column is not offered in the panel and still renders last', () => {
    const withHost: ColumnDef<Row>[] = [...cols(), { key: '__host', fieldName: '__host', name: 'Host', rendererType: 'text', minWidth: 80 }];
    render(<DataGrid items={items} columns={withHost} columnChooser />);
    expect(headers()).toEqual(['Name', 'City', 'Revenue', 'Host']);
    const cmd = screen.getAllByText('Columns').map((el) => el.closest('button')).find(Boolean);
    if (!cmd) throw new Error('instrument: no Columns command button');
    fireEvent.click(cmd);
    const panel = screen.getByRole('dialog');
    expect(within(panel).getByText('Shown (3)'), 'instrument: the panel opened').toBeTruthy();
    expect(within(panel).queryByText('Host')).toBeNull();
  });
});
