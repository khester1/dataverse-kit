// @vitest-environment jsdom
/**
 * Regression anchor for the v9 `GridToolbar` DEFAULT layout — written and seen
 * passing BEFORE the opt-in `layout: 'dynamics'` branch existed. The command carries
 * a `minSelectionCount` with NO `selectedCount`: gating must be a strict no-op then.
 */
import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { GridToolbar } from '../hosts/GridToolbar';
import type { V9GridCommand } from '../types';
import { wrapper } from './testUtils';

afterEach(cleanup);

/** Griffel class hashes are stable; only Fluent's generated ids carry a counter. */
const normalise = (html: string): string => html.replace(/(fui-[A-Za-z]+|r)\d+/g, '$1#');

const commands: V9GridCommand[] = [
  { key: 'new', text: 'New' },
  { key: 'del', text: 'Delete', minSelectionCount: 1 } as V9GridCommand,
];

describe('GridToolbar (v9) default layout', () => {
  it('renders search first then the toolbar, ungated when selectedCount is unset', () => {
    const { container } = render(
      <GridToolbar config={{ showSearch: true, searchPlaceholder: 'Search rows', commands }} />,
      { wrapper },
    );
    const del = screen.getByRole('button', { name: 'Delete' });
    expect(del.hasAttribute('disabled')).toBe(false);
    expect(screen.queryByRole('button', { name: /more commands/i })).toBeNull();
    // DOM order: the search box precedes the toolbar.
    const search = screen.getByPlaceholderText('Search rows');
    const toolbar = screen.getByRole('toolbar');
    expect(search.compareDocumentPosition(toolbar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(normalise(container.innerHTML)).toMatchSnapshot();
  });

  it('still renders nothing with no search and no commands', () => {
    const { container } = render(<GridToolbar config={{}} />, { wrapper });
    // Only the test wrapper's FluentProvider div — the toolbar itself rendered nothing.
    expect(container.firstElementChild?.childElementCount).toBe(0);
  });
});
