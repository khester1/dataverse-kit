// @vitest-environment jsdom
/**
 * A getChildren that THROWS or REJECTS used to leave a spinner (or "Loading…") up forever in every v8 host that
 * fetches children — the same defect as the v9 hosts (src/v9/__tests__/childrenError.test.tsx). v8 hosts are
 * also VENDORED into export-engine's generated projects, so this is what those projects render too.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { setIconOptions } from '@fluentui/react';
import type { ColumnDef, NestedConfig } from '../types';
import { NestedGrid } from '../hosts/nested/NestedGrid';
import { FocusedViewGrid } from '../hosts/FocusedViewGrid';
import { CHILDREN_LOAD_ERROR } from '../hosts/nested/useChildren';

setIconOptions({ disableWarnings: true });
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
  describe(`v8 hosts when getChildren ${kind}s`, () => {
    for (const parentLayout of ['list', 'cards'] as const) {
      it(`inline NestedGrid (${parentLayout}): error instead of a spinner, then expanding again retries`, async () => {
        const getChildren = flaky(kind);
        const nested = { mode: 'inline', childColumns, getChildren, ...(parentLayout === 'cards' ? { parentLayout } : {}) } as NestedConfig<Parent, Child>;
        render(<NestedGrid<Parent, Child> items={items} columns={columns} nested={nested} />);
        fireEvent.click(screen.getAllByRole('button', { name: 'Expand' })[0]);
        await flush();
        expect(errors()).toHaveLength(1);
        expect(errors()[0].textContent).toBe(CHILDREN_LOAD_ERROR);
        expect(screen.queryByText('Loading related records…')).toBeNull();
        fireEvent.click(screen.getAllByRole('button', { name: 'Collapse' })[0]);
        fireEvent.click(screen.getAllByRole('button', { name: 'Expand' })[0]);
        await flush();
        expect(getChildren).toHaveBeenCalledTimes(2);
        expect(errors()).toHaveLength(0);
        expect(screen.getByText('Child One')).toBeTruthy();
      });
    }

    it('side-panel: the panel shows the error; the trigger never reads "0 related"', async () => {
      const getChildren = flaky(kind);
      const nested: NestedConfig<Parent, Child> = { mode: 'side-panel', childColumns, getChildren };
      render(<NestedGrid<Parent, Child> items={items} columns={columns} nested={nested} />);
      fireEvent.click(screen.getAllByRole('button', { name: /related/i })[0]);
      await flush();
      expect(errors()).toHaveLength(1);
      expect(screen.queryByText('Loading related records…')).toBeNull();
      expect(screen.queryByText(/0 related/)).toBeNull();
      // Close the panel and reopen → a second call, and the rows.
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      fireEvent.click(screen.getAllByRole('button', { name: /related/i })[0]);
      await flush();
      expect(getChildren).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Child One')).toBeTruthy();
    });

    it('hover-callout: the callout shows the error; the badge stays "related"', async () => {
      const getChildren = flaky(kind);
      // The callout opens after `hoverDelay` (300ms by default): 0, then let that timer run.
      const nested: NestedConfig<Parent, Child> = { mode: 'hover-callout', childColumns, getChildren, hoverDelay: 0 };
      render(<NestedGrid<Parent, Child> items={items} columns={columns} nested={nested} />);
      const badge = screen.getAllByText('related')[0];
      fireEvent.mouseEnter(badge.parentElement!);
      await flush();
      await act(() => new Promise((r) => setTimeout(r, 5)));
      expect(errors()).toHaveLength(1);
      expect(screen.getAllByText('related')[0].textContent).toBe('related');
      // Leave and hover again → a second call, and the rows.
      fireEvent.mouseLeave(badge.parentElement!);
      fireEvent.mouseEnter(screen.getAllByText('related')[0].parentElement!);
      await flush();
      await act(() => new Promise((r) => setTimeout(r, 5)));
      expect(getChildren).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Child One')).toBeTruthy();
    });

    it('FocusedViewGrid detail pane: error instead of "Loading…", retried on the next record', async () => {
      const getChildren = flaky(kind);
      const focusedView = { rows: [{ id: 'r1', primaryField: { fieldName: 'name', label: 'Name' } }], detailFields: ['name'] };
      render(<FocusedViewGrid items={items} columns={columns} focusedView={focusedView} nested={{ mode: 'detail-pane', childColumns, getChildren }} />);
      await flush();
      expect(errors()).toHaveLength(1);
      expect(screen.queryByText('Loading…')).toBeNull();
      fireEvent.click(screen.getByText('Parent Two'));
      await flush();
      expect(getChildren).toHaveBeenCalledTimes(2);
      expect(errors()).toHaveLength(0);
      expect(screen.getByText('Child One')).toBeTruthy();
    });
  });
}
