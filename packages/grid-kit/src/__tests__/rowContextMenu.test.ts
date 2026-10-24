import { describe, it, expect, vi } from 'vitest';
import { buildRowMenuItems } from '../hosts/rowContextMenu';
import type { RowCommand } from '../types';

interface Row extends Record<string, unknown> {
  id: string;
  status: string;
}

describe('buildRowMenuItems (row context-menu projection)', () => {
  const row: Row = { id: 'r1', status: 'open' };

  it('maps key/text/iconProps and resolves the disabled predicate per row', () => {
    const cmds: RowCommand<Row>[] = [
      { key: 'open', text: 'Open', iconName: 'OpenInNewWindow', onClick: () => {} },
      { key: 'del', text: 'Delete', onClick: () => {}, disabled: (it) => it.status === 'open' },
    ];
    const items = buildRowMenuItems(cmds, row, () => {});
    expect(items.map((i) => i.key)).toEqual(['open', 'del']);
    expect(items[0].text).toBe('Open');
    expect(items[0].iconProps).toEqual({ iconName: 'OpenInNewWindow' });
    expect(items[1].iconProps).toBeUndefined(); // no iconName → no iconProps
    expect(items[1].disabled).toBe(true); // status 'open' → disabled
  });

  it('drops commands whose visible(item) returns false; missing visible is shown', () => {
    const cmds: RowCommand<Row>[] = [
      { key: 'a', text: 'A', onClick: () => {}, visible: () => true },
      { key: 'b', text: 'B', onClick: () => {}, visible: (it) => it.status === 'closed' },
      { key: 'c', text: 'C', onClick: () => {} },
    ];
    expect(buildRowMenuItems(cmds, row, () => {}).map((i) => i.key)).toEqual(['a', 'c']);
  });

  it('onClick fires the command with the row, then onAfter (dismiss)', () => {
    const onClick = vi.fn();
    const onAfter = vi.fn();
    const items = buildRowMenuItems([{ key: 'x', text: 'X', onClick }], row, onAfter);
    items[0].onClick?.();
    expect(onClick).toHaveBeenCalledWith(row);
    expect(onAfter).toHaveBeenCalledOnce();
  });

  it('disabled defaults to false when no predicate is given', () => {
    const items = buildRowMenuItems([{ key: 'x', text: 'X', onClick: () => {} }], row, () => {});
    expect(items[0].disabled).toBe(false);
  });
});
