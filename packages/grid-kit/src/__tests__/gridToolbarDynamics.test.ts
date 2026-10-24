import { describe, it, expect } from 'vitest';
import {
  gateCommands,
  partitionCommands,
  mergeToolbarCommands,
  dynamicsOnlyFieldsUsed,
} from '../core/toolbarCommands';
import { buildDynamicsCommandBarProps } from '../hosts/toolbar/GridToolbar';
import type { GridCommand } from '../types';
import { getTheme } from '@fluentui/react';

const cmd = (key: string, extra: Partial<GridCommand> = {}): GridCommand => ({ key, text: key, ...extra });

describe('gateCommands', () => {
  const edit = cmd('edit', { minSelectionCount: 1, maxSelectionCount: 1 });
  const del = cmd('delete', { minSelectionCount: 1 });
  const all = [cmd('new'), edit, del];
  const keys = (cs: GridCommand[]) => cs.map((c) => c.key);

  it('is a strict no-op when the count is unset — same array back', () => {
    expect(gateCommands(all, undefined, 'hide')).toBe(all);
    expect(gateCommands(all, undefined, 'disable')).toBe(all);
  });

  it('shows a command exactly AT its minimum (boundary)', () => {
    expect(keys(gateCommands(all, 0))).toEqual(['new']);
    expect(keys(gateCommands(all, 1))).toEqual(['new', 'edit', 'delete']);
  });

  it('hides a command past its maximum, and keeps it exactly AT the maximum', () => {
    expect(keys(gateCommands(all, 1))).toContain('edit');
    expect(keys(gateCommands(all, 2))).toEqual(['new', 'delete']);
  });

  it('disable mode keeps every command, disabling the out-of-bounds ones', () => {
    const out = gateCommands(all, 0, 'disable');
    expect(keys(out)).toEqual(['new', 'edit', 'delete']);
    expect(out.map((c) => !!c.disabled)).toEqual([false, true, true]);
  });

  it("disable mode never RE-ENABLES a command the consumer disabled", () => {
    const locked = cmd('locked', { minSelectionCount: 1, disabled: true });
    expect(gateCommands([locked], 3, 'disable')[0].disabled).toBe(true);
  });

  it('does not mutate the consumer commands', () => {
    gateCommands(all, 0, 'disable');
    expect(edit.disabled).toBeUndefined();
  });
});

describe('partitionCommands / mergeToolbarCommands', () => {
  it('splits pinned-overflow commands out, keeping order', () => {
    const { inline, pinnedOverflow } = partitionCommands([
      cmd('a'),
      cmd('b', { position: 'overflow' }),
      cmd('c', { position: 'primary' }),
      cmd('d', { position: 'overflow' }),
    ]);
    expect(inline.map((c) => c.key)).toEqual(['a', 'c']);
    expect(pinnedOverflow.map((c) => c.key)).toEqual(['b', 'd']);
  });

  it('default keeps injected first; dynamics puts consumer first so injected collapse first', () => {
    expect(mergeToolbarCommands(['mine'], ['export'])).toEqual(['export', 'mine']);
    expect(mergeToolbarCommands(['mine'], ['export'], 'default')).toEqual(['export', 'mine']);
    expect(mergeToolbarCommands(['mine'], ['export'], 'dynamics')).toEqual(['mine', 'export']);
  });
});

describe('dynamicsOnlyFieldsUsed', () => {
  it('flags dynamics-only fields on a default-layout config, and nothing under dynamics', () => {
    const config = { title: 'T', commands: [{ iconOnly: true, position: 'overflow' as const }] };
    expect(dynamicsOnlyFieldsUsed(config)).toEqual(['title', 'commands[].iconOnly', 'commands[].position']);
    expect(dynamicsOnlyFieldsUsed({ ...config, layout: 'dynamics' })).toEqual([]);
    expect(dynamicsOnlyFieldsUsed({ showSearch: true } as never)).toEqual([]);
  });
});

describe('buildDynamicsCommandBarProps (v8)', () => {
  const props = buildDynamicsCommandBarProps({
    layout: 'dynamics',
    title: 'Choice Grid',
    commands: [
      cmd('new', { iconName: 'Add' }),
      cmd('refresh', { iconName: 'Refresh', iconOnly: true }),
      cmd('share', { position: 'overflow' }),
    ],
  });
  const styles = props.styles as { root: Record<string, unknown>; primarySet: Record<string, unknown> };

  it('never uses farItems — far items do not fold into overflow', () => {
    expect(props.farItems).toBeUndefined();
    expect(props.items!.map((i) => i.key)).toEqual(['new', 'refresh']);
  });

  it('sends pinned commands to overflowItems', () => {
    expect(props.overflowItems!.map((i) => i.key)).toEqual(['share']);
  });

  it('draws command icons in the neutral text colour, not the theme accent', () => {
    const bs = props.items![0].buttonStyles as { icon: { color: string } };
    expect(bs.icon.color).toBe(getTheme().palette.neutralPrimary);
  });

  it('right-aligns the primary set', () => {
    expect(styles.primarySet.justifyContent).toBe('flex-end');
  });

  it('is 40px tall (a minHeight would not beat CommandBar\'s built-in 44)', () => {
    expect(styles.root.height).toBe(40);
  });

  it('uses the vertical ⋮ overflow icon, named after the title', () => {
    expect(props.overflowButtonProps!.menuIconProps!.iconName).toBe('MoreVertical');
    expect(props.overflowButtonProps!.ariaLabel).toBe('More commands for Choice Grid');
    expect(props.ariaLabel).toBe('Choice Grid');
  });

  it('gives an icon-only command its text as the accessible name', () => {
    const refresh = props.items!.find((i) => i.key === 'refresh')!;
    expect(refresh.iconOnly).toBe(true);
    expect(refresh.ariaLabel).toBe('refresh');
  });

  it('never makes an icon-less command icon-only (CommandBar would render it blank)', () => {
    const out = buildDynamicsCommandBarProps({
      layout: 'dynamics',
      iconOnly: true,
      commands: [cmd('withIcon', { iconName: 'Add' }), cmd('noIcon')],
    });
    expect(out.items!.map((i) => i.iconOnly)).toEqual([true, false]);
  });

  it('falls back to "Grid actions" for a blank title', () => {
    expect(buildDynamicsCommandBarProps({ layout: 'dynamics', title: '' }).ariaLabel).toBe('Grid actions');
  });

  it('keys the measurement cache on the label, so a relabel is re-measured', () => {
    const before = buildDynamicsCommandBarProps({ layout: 'dynamics', commands: [cmd('filters', { text: 'Filters' })] });
    const after = buildDynamicsCommandBarProps({ layout: 'dynamics', commands: [cmd('filters', { text: 'Filters (2)' })] });
    expect(before.items![0].cacheKey).toBeDefined();
    expect(before.items![0].cacheKey).not.toBe(after.items![0].cacheKey);
  });

  it('builds fresh item objects (CommandBar mutates what it moves into overflow)', () => {
    const consumer = [cmd('a')];
    const out = buildDynamicsCommandBarProps({ layout: 'dynamics', commands: consumer });
    expect(out.items![0]).not.toBe(consumer[0]);
  });

  it('applies selection gating', () => {
    const out = buildDynamicsCommandBarProps({
      layout: 'dynamics',
      selectedCount: 0,
      commands: [cmd('new'), cmd('delete', { minSelectionCount: 1 })],
    });
    expect(out.items!.map((i) => i.key)).toEqual(['new']);
  });
});
