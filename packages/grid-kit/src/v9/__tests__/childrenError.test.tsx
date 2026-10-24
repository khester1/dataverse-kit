// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup, act, within } from '@testing-library/react';
import type { ColumnDef, NestedConfig } from '../../types';
import { NestedGrid } from '../hosts/nested/NestedGrid';
import { FocusedViewGrid } from '../hosts/FocusedViewGrid';
import { CHILDREN_LOAD_ERROR } from '../../hosts/nested/useChildren';
import { wrapper } from './testUtils';

// A getChildren that THROWS or REJECTS used to leave a spinner (or "Loading…") up forever. Every v9 host that
// fetches children must show the error instead — and retry on the next open/expand.
afterEach(cleanup);

type Parent = { key: string; name: string } & Record<string, unknown>;
type Child = { key: string; title: string } & Record<string, unknown>;
const items: Parent[] = [{ key: 'p1', name: 'Parent One' }, { key: 'p2', name: 'Parent Two' }];
const columns: ColumnDef<Parent>[] = [{ key: 'name', fieldName: 'name', name: 'Name', rendererType: 'text' }];
const childColumns: ColumnDef<Child>[] = [{ key: 'title', fieldName: 'title', name: 'Title', rendererType: 'text' }];
const child: Child[] = [{ key: 'c1', title: 'Child One' }];

type Kind = 'reject' | 'throw' | 'reject undefined' | 'reject null' | 'reject 0';
/** Fails on the first call, succeeds on every later one. ★ The falsy reasons are legal: a bare
 *  `Promise.reject()` rejects with `undefined` — review measured that case reproducing the original bug. */
function flaky(kind: Kind) {
  let calls = 0;
  return vi.fn((): Child[] | Promise<Child[]> => {
    calls += 1;
    if (calls > 1) return child;
    if (kind === 'throw') throw new Error('boom');
    const reason = kind === 'reject' ? new Error('boom') : kind === 'reject undefined' ? undefined : kind === 'reject null' ? null : 0;
    return Promise.reject(reason);
  });
}
const KINDS: Kind[] = ['reject', 'throw', 'reject undefined', 'reject null', 'reject 0'];
const errors = () => document.querySelectorAll('[data-gridkit-children-error]');
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

for (const kind of KINDS) {
  describe(`v9 hosts when getChildren ${kind}s`, () => {
    for (const look of ['default', 'ce'] as const) {
      it(`inline NestedGrid (${look}): error instead of a spinner, then expanding again retries`, async () => {
        const getChildren = flaky(kind);
        const nested: NestedConfig<Parent, Child> = { mode: 'inline', childColumns, getChildren };
        render(<NestedGrid<Parent, Child> look={look} items={items} columns={columns} nested={nested} />, { wrapper });
        const expand = () => screen.getAllByRole('button', { name: 'Expand' })[0];
        fireEvent.click(expand());
        await flush();
        expect(errors()).toHaveLength(1);
        expect(errors()[0].textContent).toBe(CHILDREN_LOAD_ERROR);
        expect(screen.queryByText('Loading related records…')).toBeNull();
        // Collapse + expand again → a second call, and the rows.
        fireEvent.click(screen.getAllByRole('button', { name: 'Collapse' })[0]);
        fireEvent.click(expand());
        await flush();
        expect(getChildren).toHaveBeenCalledTimes(2);
        expect(errors()).toHaveLength(0);
        expect(screen.getByText('Child One')).toBeTruthy();
      });
    }

    it('side-panel: the drawer shows the error, and reopening retries', async () => {
      const getChildren = flaky(kind);
      const nested: NestedConfig<Parent, Child> = { mode: 'side-panel', childColumns, getChildren };
      render(<NestedGrid<Parent, Child> items={items} columns={columns} nested={nested} />, { wrapper });
      fireEvent.click(screen.getAllByRole('button', { name: /related/i })[0]);
      await flush();
      const dlg = document.querySelector('[role="dialog"]') as HTMLElement;
      expect(dlg).toBeTruthy();
      expect(within(dlg).getByRole('alert').textContent).toBe(CHILDREN_LOAD_ERROR);
      expect(within(dlg).queryByText('Loading related records…')).toBeNull();
      // The trigger never reads "0 related" after a failure.
      expect(screen.queryByText(/0 related/)).toBeNull();
      fireEvent.click(within(dlg).getByRole('button', { name: 'Close' }));
      fireEvent.click(screen.getAllByRole('button', { name: /related/i })[0]);
      await flush();
      expect(getChildren).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Child One')).toBeTruthy();
    });

    it('hover-callout: the popover shows the error, the badge stays "related", and reopening retries', { timeout: 20000 }, async () => {
      const getChildren = flaky(kind);
      const nested: NestedConfig<Parent, Child> = { mode: 'hover-callout', childColumns, getChildren };
      render(<NestedGrid<Parent, Child> items={items} columns={columns} nested={nested} />, { wrapper });
      const badge = screen.getAllByRole('button', { name: /related/i })[0];
      fireEvent.click(badge);
      await flush();
      expect(errors()).toHaveLength(1);
      expect(screen.queryByText('Loading…')).toBeNull();
      expect(badge.textContent).toBe('related');
      // Close (toggle) and reopen → a second call, and the rows.
      fireEvent.click(badge);
      fireEvent.click(badge);
      await flush();
      expect(getChildren).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Child One')).toBeTruthy();
    });

    for (const childOnly of [false, true]) {
      it(`FocusedViewGrid detail pane${childOnly ? ' (childOnly)' : ''}: error instead of "Loading…", retried on the next record`, async () => {
        const getChildren = flaky(kind);
        const focusedView = { rows: [{ id: 'r1', primaryField: { fieldName: 'name', label: 'Name' } }], detailFields: ['name'], childOnly };
        render(
          <FocusedViewGrid items={items} columns={columns} focusedView={focusedView} nested={{ mode: 'detail-pane', childColumns, getChildren }} />,
          { wrapper },
        );
        await flush();
        expect(errors()).toHaveLength(1);
        expect(screen.queryByText('Loading…')).toBeNull();
        fireEvent.click(screen.getByText('Parent Two'));
        await flush();
        expect(getChildren).toHaveBeenCalledTimes(2);
        expect(errors()).toHaveLength(0);
        expect(screen.getByText('Child One')).toBeTruthy();
      });
    }
  });
}

describe('v9 inline NestedGrid: a failed reloadToken refresh', () => {
  it('shows the error, and the next successful reload shows the rows again', async () => {
    let fail = false;
    const getChildren = vi.fn((): Child[] | Promise<Child[]> => (fail ? Promise.reject(undefined) : child));
    const cfg = (reloadToken: number): NestedConfig<Parent, Child> => ({ mode: 'inline', childColumns, getChildren, reloadToken });
    const { rerender } = render(<NestedGrid<Parent, Child> items={items} columns={columns} nested={cfg(0)} />, { wrapper });
    fireEvent.click(screen.getAllByRole('button', { name: 'Expand' })[0]);
    expect(screen.getByText('Child One')).toBeTruthy();
    fail = true;
    rerender(<NestedGrid<Parent, Child> items={items} columns={columns} nested={cfg(1)} />);
    await flush();
    expect(errors()).toHaveLength(1);
    fail = false;
    rerender(<NestedGrid<Parent, Child> items={items} columns={columns} nested={cfg(2)} />);
    await flush();
    expect(errors()).toHaveLength(0);
    expect(screen.getByText('Child One')).toBeTruthy();
    expect(getChildren).toHaveBeenCalledTimes(3);
  });
});

