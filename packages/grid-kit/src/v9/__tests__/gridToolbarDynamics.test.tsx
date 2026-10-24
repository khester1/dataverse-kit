// @vitest-environment jsdom
/**
 * v9 `GridToolbar` dynamics layout. Auto-overflow IS testable here: priority-overflow
 * reads the container's `clientWidth` and each item's `offsetWidth`, registers items
 * in layout effects, then does a synchronous first pass — so stubbing those two
 * getters PER ELEMENT before render reproduces a narrow toolbar. (A shared stub would
 * give container and items the same width, which measures nothing.)
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup, fireEvent, act, within } from '@testing-library/react';
import { GridToolbar } from '../hosts/GridToolbar';
import type { V9GridCommand, V9GridToolbarConfig } from '../types';
import { wrapper } from './testUtils';

afterEach(cleanup);

const Icon = () => <svg data-testid="icon" />;
const cmds = (extra: Partial<Record<string, Partial<V9GridCommand>>> = {}): V9GridCommand[] =>
  ['New', 'Add Existing', 'Refresh'].map((text) => ({ key: text, text, icon: <Icon />, ...extra[text] }));

const renderBar = (config: V9GridToolbarConfig) =>
  render(<GridToolbar config={{ layout: 'dynamics', ...config }} />, { wrapper });

/** Container (role=toolbar) = `containerPx`; the ⋮ button = 32px (a small icon button);
 *  every command = 80px. */
function stubWidths(containerPx: number): () => void {
  const client = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  const offset = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return this.getAttribute('role') === 'toolbar' ? containerPx : 0;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get(this: HTMLElement) {
      if (this.getAttribute('role') === 'toolbar') return containerPx;
      // The ⋮ button — or the span an OverflowItem wraps around the pinned one — is 32px.
      const more = /^More commands/.test(this.getAttribute('aria-label') ?? '') ||
        (this.tagName === 'SPAN' && !!this.querySelector('[aria-label^="More commands"]'));
      return more ? 32 : 80;
    },
  });
  return () => {
    if (client) Object.defineProperty(HTMLElement.prototype, 'clientWidth', client);
    if (offset) Object.defineProperty(HTMLElement.prototype, 'offsetWidth', offset);
  };
}

/** Labels of the COMMANDS the manager has hidden (the pinned ⋮ has no text, so it drops out). */
const overflowing = () =>
  Array.from(document.querySelectorAll('[data-overflowing]'))
    .map((el) => el.textContent?.trim())
    .filter(Boolean);

/** The ⋮ buttons actually on show. jsdom does not apply Griffel's `[data-overflowing]{display:none}`,
 *  so a hidden one is filtered by the attribute its wrapper carries. */
const visibleMore = (name: RegExp | string = /more commands/i) =>
  screen.queryAllByRole('button', { name }).filter((b) => !b.closest('[data-overflowing]'));

describe('GridToolbar (v9) dynamics layout', () => {
  it('renders the title, names the toolbar after it, and puts search after the toolbar', () => {
    renderBar({ title: 'Choice Grid', commands: cmds(), showSearch: true, searchPlaceholder: 'Find' });
    expect(screen.getByText('Choice Grid')).toBeTruthy();
    const toolbar = screen.getByRole('toolbar', { name: 'Choice Grid' });
    const search = screen.getByPlaceholderText('Find');
    expect(toolbar.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders a title-only bar (no commands, no search)', () => {
    renderBar({ title: 'Timeline' });
    expect(screen.getByText('Timeline')).toBeTruthy();
  });

  it('lists a pinned command only in ⋮, and it fires', async () => {
    const share = vi.fn();
    renderBar({ title: 'T', commands: [...cmds(), { key: 'share', text: 'Share', position: 'overflow', onClick: share }] });
    expect(screen.queryByRole('button', { name: 'Share' })).toBeNull();
    expect(visibleMore()).toHaveLength(1);
    fireEvent.click(visibleMore('More commands for T')[0]);
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Share' }));
    expect(share).toHaveBeenCalledTimes(1);
  });

  it('opens a menuItems command as a menu ("Flow ▾")', async () => {
    const run = vi.fn();
    renderBar({
      commands: [{ key: 'flow', text: 'Flow', menuItems: [{ key: 'run', text: 'Run a flow', onClick: run }] }],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Flow' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Run a flow' }));
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('gives an icon-only command an accessible name and no visible label', () => {
    renderBar({ iconOnly: true, commands: cmds() });
    const refresh = screen.getByRole('button', { name: 'Refresh' });
    expect(refresh.textContent?.trim()).toBe('');
  });

  it('names an icon-only MENU command too (Tooltip cannot label it through <Menu>)', () => {
    renderBar({
      iconOnly: true,
      commands: [{ key: 'flow', text: 'Flow', icon: <Icon />, menuItems: [{ key: 'run', text: 'Run a flow' }] }],
    });
    const flow = screen.getByRole('button', { name: 'Flow' });
    expect(flow.getAttribute('aria-haspopup')).toBe('menu');
  });

  it('falls back to "Grid actions" for a blank title', () => {
    renderBar({ title: '', commands: cmds() });
    expect(screen.getByRole('toolbar', { name: 'Grid actions' })).toBeTruthy();
  });

  it('gates by selection: hide (default) and disable', () => {
    const gated = cmds({ Refresh: { minSelectionCount: 1 } });
    renderBar({ commands: gated, selectedCount: 0 });
    expect(screen.queryByRole('button', { name: 'Refresh' })).toBeNull();
    cleanup();
    renderBar({ commands: gated, selectedCount: 0, selectionGating: 'disable' });
    expect(screen.getByRole('button', { name: 'Refresh' }).hasAttribute('disabled')).toBe(true);
  });

  describe('auto-overflow', () => {
    let restore: () => void = () => {};
    afterEach(() => restore());

    it('folds the LAST commands into ⋮ when the toolbar is narrow', async () => {
      restore = stubWidths(200);
      renderBar({ title: 'T', commands: cmds() });
      await act(async () => {});
      // 3×80 + ⋮ 32 + padding 10 > 200: the rightmost commands fold first.
      expect(overflowing()).toContain('Refresh');
      expect(overflowing()).not.toContain('New');
      expect(visibleMore()).toHaveLength(1);
      fireEvent.click(visibleMore('More commands for T')[0]);
      const menu = await screen.findByRole('menu');
      expect(within(menu).getByRole('menuitem', { name: 'Refresh' })).toBeTruthy();
      expect(within(menu).queryByRole('menuitem', { name: 'New' })).toBeNull();
    });

    it('shows every command and no ⋮ when the toolbar is wide', async () => {
      restore = stubWidths(2000);
      renderBar({ title: 'T', commands: cmds() });
      await act(async () => {});
      expect(overflowing()).toEqual([]);
      expect(visibleMore()).toHaveLength(0);
    });

    it('counts the ⋮ ONCE when pinned commands and auto-hidden commands share it', async () => {
      // Measured on the web resource: at a narrow width one command plus ONE ⋮ fits, but not
      // plus two. 130px: A 80 + ⋮ 32 + padding 10 = 122 fits. Counting ⋮ twice (pinned + Fluent's
      // own) = 154, which folds A as well and leaves an empty bar.
      restore = stubWidths(130);
      renderBar({
        commands: [
          { key: 'a', text: 'A' },
          { key: 'b', text: 'B' },
          { key: 'share', text: 'Share', position: 'overflow' },
        ],
      });
      await act(async () => {});
      expect(overflowing()).toEqual(['B']);
      expect(visibleMore()).toHaveLength(1);
    });

    it('shows the pinned ⋮ with room to spare, and only one', async () => {
      restore = stubWidths(2000);
      renderBar({ commands: [{ key: 'a', text: 'A' }, { key: 'share', text: 'Share', position: 'overflow' }] });
      await act(async () => {});
      expect(overflowing()).toEqual([]);
      expect(visibleMore()).toHaveLength(1);
    });
  });
});

beforeEach(() => {
  // Fresh module-level warn-once flag is not needed here; silence the misuse warning noise.
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
