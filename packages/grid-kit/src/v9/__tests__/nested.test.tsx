// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import type { ColumnDef, NestedConfig } from '../../types';
import { NestedGrid } from '../hosts/nested/NestedGrid';
import { formatTriggerLabel } from '../hosts/nested/labels';
// v8 source of the trigger-label helper — imported ONLY here to drift-guard the v9 fork
// (the v8 labels.ts also runtime-imports Fluent-v8 `PanelType`, so it's not in the v9 bundle).
import { formatTriggerLabel as v8FormatTriggerLabel } from '../../hosts/nested/labels';
import { wrapper } from './testUtils';

afterEach(cleanup);

interface Parent extends Record<string, unknown> {
  key: string;
  name: string;
}
interface Child extends Record<string, unknown> {
  key: string;
  title: string;
}
const items: Parent[] = [
  { key: '1', name: 'Parent A' },
  { key: '2', name: 'Parent B' },
];
const columns: ColumnDef<Parent>[] = [{ key: 'name', fieldName: 'name', name: 'Name', rendererType: 'text' }];
const childColumns: ColumnDef<Child>[] = [{ key: 'title', fieldName: 'title', name: 'Title', rendererType: 'text' }];
const childrenByParent: Record<string, Child[]> = {
  '1': [{ key: 'c1', title: 'Child One' }],
  '2': [{ key: 'c2', title: 'Child Two' }],
};
const getChildren = (p: Parent): Child[] => childrenByParent[p.key] ?? [];

describe('v9 formatTriggerLabel fork stays in sync with the v8 source (drift guard)', () => {
  it('substitutes {count} / drops it when unknown, identical to v8', () => {
    for (const [label, count] of [
      [undefined, undefined],
      [undefined, 3],
      ['View {count} related', undefined],
      ['View {count} related', 5],
      ['Show related', 2],
    ] as Array<[string | undefined, number | undefined]>) {
      expect(formatTriggerLabel(label, count)).toBe(v8FormatTriggerLabel(label, count));
    }
  });
});

describe('v9 NestedGrid — inline', () => {
  const nested: NestedConfig<Parent, Child> = { mode: 'inline', childColumns, getChildren };

  it('renders parent rows; a chevron expands the child grid under a row', () => {
    render(<NestedGrid<Parent, Child> items={items} columns={columns} nested={nested} />, { wrapper });
    expect(screen.getByText('Parent A')).toBeTruthy();
    expect(screen.queryByText('Child One')).toBeNull(); // collapsed
    const expanders = screen.getAllByRole('button', { name: 'Expand' });
    expect(expanders).toHaveLength(2);
    fireEvent.click(expanders[0]);
    expect(screen.getByText('Child One')).toBeTruthy();
    // The other parent's children stay collapsed.
    expect(screen.queryByText('Child Two')).toBeNull();
  });
});

describe('v9 NestedGrid — side-panel', () => {
  const nested: NestedConfig<Parent, Child> = { mode: 'side-panel', childColumns, getChildren };

  it('renders a trigger per row; clicking opens the drawer with the child grid', () => {
    render(<NestedGrid<Parent, Child> items={items} columns={columns} nested={nested} />, { wrapper });
    const triggers = screen.getAllByRole('button', { name: /related/i });
    expect(triggers.length).toBe(2);
    fireEvent.click(triggers[0]);
    expect(screen.getByText('Child One')).toBeTruthy();
  });
});

describe('v9 NestedGrid — the child grid takes the parent look (side-panel)', () => {
  const nested: NestedConfig<Parent, Child> = { mode: 'side-panel', childColumns, getChildren };
  const childLooks = (): (string | null)[] =>
    [...document.querySelectorAll('[role="dialog"] [data-gridkit-look]')].map((e) => e.getAttribute('data-gridkit-look'));

  it('look="ce" parent → the drawer\'s child grid is ce', () => {
    render(<NestedGrid<Parent, Child> items={items} columns={columns} nested={nested} look="ce" />, { wrapper });
    fireEvent.click(screen.getAllByRole('button', { name: /related/i })[0]);
    expect(screen.getByText('Child One')).toBeTruthy();
    expect(childLooks()).toEqual(['ce']);
  });

  it('default parent → the drawer\'s child grid is default (unchanged)', () => {
    render(<NestedGrid<Parent, Child> items={items} columns={columns} nested={nested} />, { wrapper });
    fireEvent.click(screen.getAllByRole('button', { name: /related/i })[0]);
    expect(screen.getByText('Child One')).toBeTruthy();
    expect(childLooks()).toEqual(['default']);
  });
});

describe('v9 NestedGrid — hover-callout', () => {
  const nested: NestedConfig<Parent, Child> = { mode: 'hover-callout', childColumns, getChildren };

  it('renders a count badge per row', () => {
    render(<NestedGrid<Parent, Child> items={items} columns={columns} nested={nested} />, { wrapper });
    expect(screen.getAllByText('related')).toHaveLength(2);
  });
});

// ── drawer / inline child-grid resizing (0.21.0) ─────────────────────────────────────────────
// ★ Reported from a real form (nested-grid, orge2e285aa, 2026-09-28): truncated side-panel cells
//   could not be widened — the drawer's child DataGrid was built with no resize props at all.
describe('v9 NestedGrid — childResizableColumns', () => {
  const twoCols: ColumnDef<Child>[] = [
    { key: 'title', fieldName: 'title', name: 'Title', rendererType: 'text' },
    { key: 'key', fieldName: 'key', name: 'Key', rendererType: 'text' },
  ];
  const handles = (): number => document.querySelectorAll('[role="dialog"] .fui-TableResizeHandle, .fui-TableResizeHandle').length;

  it('side-panel: resize handles on EVERY child column when on (autoFit off => the last one too)', () => {
    const nested: NestedConfig<Parent, Child> = { mode: 'side-panel', childColumns: twoCols, getChildren, childResizableColumns: true };
    render(<NestedGrid<Parent, Child> items={items} columns={columns} nested={nested} />, { wrapper });
    fireEvent.click(screen.getAllByRole('button', { name: /related/i })[0]);
    expect(screen.getByText('Child One')).toBeTruthy();
    const dlg = document.querySelector('[role="dialog"]')!;
    expect(dlg.querySelectorAll('.fui-TableResizeHandle')).toHaveLength(twoCols.length);
  });

  it('side-panel: no handles when off (the default is unchanged)', () => {
    const nested: NestedConfig<Parent, Child> = { mode: 'side-panel', childColumns: twoCols, getChildren };
    render(<NestedGrid<Parent, Child> items={items} columns={columns} nested={nested} />, { wrapper });
    fireEvent.click(screen.getAllByRole('button', { name: /related/i })[0]);
    expect(screen.getByText('Child One')).toBeTruthy();
    expect(handles()).toBe(0);
  });

  it('inline: the expanded child grid is resizable too', () => {
    const nested: NestedConfig<Parent, Child> = { mode: 'inline', childColumns: twoCols, getChildren, childResizableColumns: true };
    render(<NestedGrid<Parent, Child> items={items} columns={columns} nested={nested} />, { wrapper });
    fireEvent.click(screen.getAllByRole('button', { name: 'Expand' })[0]);
    expect(screen.getByText('Child One')).toBeTruthy();
    expect(handles()).toBe(twoCols.length);
  });
});

// ── hover-callout trigger (0.21.0) ───────────────────────────────────────────────────────────
// ★★ The old trigger was a bare <span>: no role, no tabIndex, so the keyboard could not reach it;
//    only mouseenter fetched, so a CLICK-open showed an endless spinner; and `hoverDelay` was never
//    read, so every row the pointer crossed fired a child query.
describe('v9 NestedGrid — hover-callout trigger', () => {
  afterEach(() => vi.useRealTimers());
  const counting = (): { nested: NestedConfig<Parent, Child>; calls: string[] } => {
    const calls: string[] = [];
    return {
      calls,
      nested: {
        mode: 'hover-callout',
        childColumns,
        hoverDelay: 300,
        getChildren: (p: Parent) => {
          calls.push(p.key);
          return childrenByParent[p.key] ?? [];
        },
      },
    };
  };

  it('the trigger is a focusable BUTTON (keyboard-reachable)', () => {
    const { nested } = counting();
    render(<NestedGrid<Parent, Child> items={items} columns={columns} nested={nested} />, { wrapper });
    const trig = screen.getAllByRole('button', { name: /show related records/i });
    expect(trig).toHaveLength(2);
    expect(trig[0].tabIndex).toBeGreaterThanOrEqual(0);
  });

  it('a CLICK opens it and the child rows RENDER (no endless spinner)', () => {
    const { nested, calls } = counting();
    render(<NestedGrid<Parent, Child> items={items} columns={columns} nested={nested} />, { wrapper });
    fireEvent.click(screen.getAllByRole('button', { name: /show related records/i })[0]);
    expect(calls).toEqual(['1']);
    expect(screen.getByText('Child One')).toBeTruthy();
  });

  it('hoverDelay: a pointer that leaves before the delay opens and FETCHES nothing', () => {
    vi.useFakeTimers();
    const { nested, calls } = counting();
    render(<NestedGrid<Parent, Child> items={items} columns={columns} nested={nested} />, { wrapper });
    const trig = screen.getAllByRole('button', { name: /show related records/i })[0];
    fireEvent.mouseEnter(trig);
    act(() => { vi.advanceTimersByTime(150); });
    fireEvent.mouseLeave(trig);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(calls).toEqual([]);
    expect(screen.queryByText('Child One')).toBeNull();
  });

  it('hoverDelay: a pointer that STAYS opens it after the delay, not before', () => {
    vi.useFakeTimers();
    const { nested, calls } = counting();
    render(<NestedGrid<Parent, Child> items={items} columns={columns} nested={nested} />, { wrapper });
    fireEvent.mouseEnter(screen.getAllByRole('button', { name: /show related records/i })[0]);
    act(() => { vi.advanceTimersByTime(299); });
    expect(calls).toEqual([]);
    act(() => { vi.advanceTimersByTime(2); });
    expect(calls).toEqual(['1']);
    expect(screen.getByText('Child One')).toBeTruthy();
  });

  it('touch-first devices ((hover: none)) ignore hover — only a tap opens it', () => {
    vi.useFakeTimers();
    const orig = window.matchMedia;
    window.matchMedia = ((q: string) => ({ ...orig(q), matches: q === '(hover: none)' })) as typeof window.matchMedia;
    try {
      const { nested, calls } = counting();
      render(<NestedGrid<Parent, Child> items={items} columns={columns} nested={nested} />, { wrapper });
      const trig = screen.getAllByRole('button', { name: /show related records/i })[0];
      fireEvent.mouseEnter(trig);
      act(() => { vi.advanceTimersByTime(1000); });
      expect(calls).toEqual([]);
      fireEvent.click(trig);
      expect(screen.getByText('Child One')).toBeTruthy();
    } finally {
      window.matchMedia = orig;
    }
  });
});

// ── Escape returns focus to the trigger ──────────────────────────────────────────────────────
// ★★★ PLUMBING ONLY. jsdom cannot run tabster's focus behaviour, so these pin that the two
//     attributes are present at the right times; the BEHAVIOUR (real keys → focus back on the
//     trigger, measured in Chrome) is gated in the gallery's nested-grid browser gate.
describe('v9 NestedGrid — Escape returns focus to the trigger', () => {
  const tabsterOf = (el: Element): string => el.getAttribute('data-tabster') ?? '';

  // ★★★ PopoverTrigger marks the badge as a restore TARGET; the opt-out must be MERGED with it, and the
  //     closed badge must keep it untouched. Exact equality on both states, so dropping the restorer
  //     (the first version of this fix did) fails here as well as in the browser gate.
  const RESTORE_TARGET = { restorer: { type: 1 } };
  const badgeAttr = (): Record<string, unknown> =>
    JSON.parse(tabsterOf(screen.getAllByRole('button', { name: /show related records/i })[0]) || 'null');

  it('hover-callout: closed badge keeps PopoverTrigger\'s restore target, untouched', () => {
    const nested: NestedConfig<Parent, Child> = { mode: 'hover-callout', childColumns, getChildren };
    render(<NestedGrid<Parent, Child> items={items} columns={columns} nested={nested} />, { wrapper });
    expect(badgeAttr()).toEqual(RESTORE_TARGET);
  });

  it('hover-callout: open badge = restore target PLUS the Escape opt-out; closing restores the original', () => {
    const nested: NestedConfig<Parent, Child> = { mode: 'hover-callout', childColumns, getChildren };
    render(<NestedGrid<Parent, Child> items={items} columns={columns} nested={nested} />, { wrapper });
    fireEvent.click(screen.getAllByRole('button', { name: /show related records/i })[0]);
    expect(screen.getByText('Child One')).toBeTruthy();
    expect(badgeAttr()).toEqual({ ...RESTORE_TARGET, focusable: { ignoreKeydown: { Escape: true } } });
    fireEvent.click(screen.getAllByRole('button', { name: /show related records/i })[0]);
    expect(badgeAttr()).toEqual(RESTORE_TARGET);
  });

  it('side-panel: the trigger is a restore-focus TARGET (where the drawer returns focus)', () => {
    const nested: NestedConfig<Parent, Child> = { mode: 'side-panel', childColumns, getChildren };
    render(<NestedGrid<Parent, Child> items={items} columns={columns} nested={nested} />, { wrapper });
    const trigger = screen.getAllByRole('button', { name: /related/i })[0];
    // a TARGET (type 1) — a restore SOURCE (type 2) would also match /"restorer"/ and be wrong
    expect(JSON.parse(tabsterOf(trigger))).toEqual({ restorer: { type: 1 } });
  });
});
