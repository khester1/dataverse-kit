// @vitest-environment jsdom
/**
 * Regression anchor for the v8 `GridToolbar` DEFAULT layout.
 *
 * Written — and seen passing — BEFORE the opt-in `layout: 'dynamics'` branch was
 * added, so it pins the markup every existing consumer (and every export-engine
 * generated project, which vendors this file) renders today. The command carries a
 * `minSelectionCount` with NO `selectedCount`: selection gating must be a strict
 * no-op then, so the command stays present and enabled.
 */
import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { setIconOptions } from '@fluentui/react';
import { GridToolbar } from '../hosts/toolbar/GridToolbar';
import type { GridCommand } from '../types';

setIconOptions({ disableWarnings: true });
afterEach(cleanup);

/** merge-styles class names / generated ids carry a global counter — normalise it. */
const normalise = (html: string): string => html.replace(/([a-zA-Z_])-?\d+/g, '$1#');

/**
 * Every live CSS rule whose selector targets a class present in `root`. v8 styles are
 * merge-styles rules in the CSSOM, so the markup alone cannot see a STYLE change (and
 * normalising class names strips the only thing that would differ).
 */
function appliedRules(root: Element): string[] {
  const classes = new Set<string>();
  root.querySelectorAll('[class]').forEach((el) => el.classList.forEach((c) => classes.add(c)));
  const out: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    for (const rule of Array.from(sheet.cssRules)) {
      const sel = (rule as CSSStyleRule).selectorText;
      if (sel && (sel.match(/\.[\w-]+/g) ?? []).some((c) => classes.has(c.slice(1)))) out.push(normalise(rule.cssText));
    }
  }
  return out.sort();
}

const commands: GridCommand[] = [
  { key: 'new', text: 'New', iconName: 'Add' },
  { key: 'del', text: 'Delete', iconName: 'Delete', minSelectionCount: 1 } as GridCommand,
];

describe('GridToolbar (v8) default layout', () => {
  it('renders commands left + search right, ungated when selectedCount is unset', async () => {
    const { container } = render(
      <GridToolbar config={{ showSearch: true, searchPlaceholder: 'Search rows', commands }} />,
    );
    const del = await screen.findByRole('menuitem', { name: 'Delete' });
    expect(del.hasAttribute('disabled')).toBe(false);
    expect(del.getAttribute('aria-disabled')).not.toBe('true');
    expect(screen.getByPlaceholderText('Search rows')).toBeTruthy();
    // No dynamics chrome in the default layout: no ⋮ overflow button.
    expect(screen.queryByRole('menuitem', { name: /more commands/i })).toBeNull();
    expect(normalise(container.innerHTML)).toMatchSnapshot();
    const rules = appliedRules(container);
    expect(rules.some((r) => r.includes('height: 36px'))).toBe(true); // the rules ARE being read
    expect(rules).toMatchSnapshot();
  });
});
