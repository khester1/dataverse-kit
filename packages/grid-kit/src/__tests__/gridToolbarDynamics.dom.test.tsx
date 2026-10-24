// @vitest-environment jsdom
/**
 * v8 `GridToolbar` dynamics layout, rendered. jsdom reports every size as 0, so
 * CommandBar never reduces here — auto-collapse into ⋮ is NOT observable in this
 * file and is verified in Storybook instead. What IS observable: pinned overflow,
 * the ⋮ menu, re-measure on a container resize, and the host's merge order.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup, fireEvent, within, act } from '@testing-library/react';
import { CommandBarBase, setIconOptions } from '@fluentui/react';
import { GridToolbar } from '../hosts/toolbar/GridToolbar';
import { DataGrid } from '../hosts/DataGrid';
import type { ColumnDef, GridCommand } from '../types';

setIconOptions({ disableWarnings: true });
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const commands = (share?: () => void): GridCommand[] => [
  { key: 'new', text: 'New Dev Item', iconName: 'Add' },
  { key: 'refresh', text: 'Refresh', iconName: 'Refresh' },
  ...(share ? [{ key: 'share', text: 'Share', iconName: 'Share', position: 'overflow' as const, onClick: share }] : []),
];

describe('GridToolbar (v8) dynamics layout — DOM', () => {
  it('renders the title and a ⋮ that holds a pinned command, which fires', async () => {
    const share = vi.fn();
    render(<GridToolbar config={{ layout: 'dynamics', title: 'Choice Grid', commands: commands(share) }} />);
    expect(await screen.findByText('Choice Grid')).toBeTruthy();
    // Bar buttons are role=menuitem too — find ⋮ by its accessible name.
    const more = await screen.findByRole('menuitem', { name: 'More commands for Choice Grid' });
    fireEvent.click(more);
    const menu = await screen.findByRole('menu');
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Share' }));
    expect(share).toHaveBeenCalledTimes(1);
  });

  it('renders no ⋮ when nothing is pinned (jsdom never auto-reduces)', async () => {
    render(<GridToolbar config={{ layout: 'dynamics', title: 'Choice Grid', commands: commands() }} />);
    await screen.findByRole('menuitem', { name: 'Refresh' });
    expect(screen.queryByRole('menuitem', { name: /more commands/i })).toBeNull();
  });

  // ResizeGroup re-measures after every CommandBar render, but nothing re-renders it on
  // a container-only resize. Proven in a real browser: detach the observer and v8 stops
  // collapsing (commands clip instead). Here: an observed resize must re-render the bar.
  it('re-renders (so re-measures) the command bar when its CONTAINER resizes', async () => {
    let fire: ((entries: Array<{ contentRect: { width: number } }>) => void) | undefined;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: typeof fire) {
          fire = cb;
        }
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      }
    );
    const renders = vi.spyOn(CommandBarBase.prototype, 'render');
    render(<GridToolbar config={{ layout: 'dynamics', commands: commands() }} />);
    await screen.findByRole('menuitem', { name: 'Refresh' });
    expect(fire).toBeDefined();
    const before = renders.mock.calls.length;
    act(() => fire!([{ contentRect: { width: 320 } }]));
    expect(renders.mock.calls.length).toBeGreaterThan(before);
    vi.unstubAllGlobals();
  });
});

describe('DataGrid (v8) with a dynamics toolbar', () => {
  it('puts consumer commands before the injected Filters command', async () => {
    const columns: ColumnDef[] = [{ key: 'name', name: 'Name', fieldName: 'name', rendererType: 'text' }];
    render(
      <DataGrid
        items={[{ key: '1', name: 'A' }]}
        columns={columns}
        filterBuilder
        toolbar={{ layout: 'dynamics', title: 'Rows', commands: [{ key: 'mine', text: 'Mine' }] }}
      />
    );
    const bar = await screen.findByRole('menubar', { name: 'Rows' });
    const labels = within(bar)
      .getAllByRole('menuitem')
      .map((b) => b.textContent?.trim());
    expect(labels.indexOf('Mine')).toBeGreaterThanOrEqual(0);
    expect(labels.indexOf('Mine')).toBeLessThan(labels.findIndex((l) => l?.startsWith('Filters')));
  });
});
