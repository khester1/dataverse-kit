import { describe, it, expect } from 'vitest';
import { buildGroups } from '../hosts/buildGroups';
import { toDetailsListColumns, defaultGetKey } from '../adapters';
import { createCellRegistry } from '../registry';
import type { ColumnDef } from '../types';

interface Row extends Record<string, unknown> {
  key: string;
  name: string;
  status: string;
}
const rows: Row[] = [
  { key: '1', name: 'A', status: 'Active' },
  { key: '2', name: 'B', status: 'Pending' },
  { key: '3', name: 'C', status: 'Active' },
  { key: '4', name: 'D', status: 'Inactive' },
];

describe('buildGroups (GroupedGrid)', () => {
  it('buckets into contiguous ordered ranges with counts', () => {
    const { orderedItems, groups } = buildGroups(rows, { groupBy: 'status' });
    // groups in first-seen order: Active(2), Pending(1), Inactive(1)
    expect(groups.map((g) => g.name)).toEqual(['Active (2)', 'Pending (1)', 'Inactive (1)']);
    // startIndex/count are contiguous and cover all rows
    expect(groups.map((g) => g.startIndex)).toEqual([0, 2, 3]);
    expect(groups.reduce((n, g) => n + g.count, 0)).toBe(rows.length);
    // orderedItems are reordered so each group's range is contiguous
    expect(orderedItems.slice(0, 2).every((r) => r.status === 'Active')).toBe(true);
  });

  it('honors showCount=false and custom label', () => {
    const { groups } = buildGroups(rows, {
      groupBy: 'status',
      showCount: false,
      getGroupLabel: (v) => `Status: ${String(v)}`,
    });
    expect(groups[0].name).toBe('Status: Active');
  });

  it('buckets null/undefined under (Blank)', () => {
    const withBlank = [...rows, { key: '5', name: 'E', status: undefined as unknown as string }];
    const { groups } = buildGroups(withBlank, { groupBy: 'status' });
    expect(groups.some((g) => g.key === '(Blank)')).toBe(true);
  });
});

describe('toDetailsListColumns click-to-edit wrapper', () => {
  const registry = createCellRegistry();
  const col: ColumnDef<Row> = { key: 'name', fieldName: 'name', name: 'Name', rendererType: 'text', editorType: 'text' };

  const ctxBase = {
    registry,
    getKey: defaultGetKey,
    editable: true,
    isEditing: () => false,
    onEditStart: () => undefined,
    onEditEnd: () => undefined,
  } as const;

  it('renders a "Click to edit" affordance for editable cells (editTrigger click)', () => {
    const [dlCol] = toDetailsListColumns([col], { ...ctxBase, editTrigger: 'click' });
    const el = dlCol.onRender!(rows[0]) as { props: { title?: string } };
    expect(el.props.title).toBe('Click to edit');
  });

  it('editTrigger "always" does not wrap with the click affordance', () => {
    const [dlCol] = toDetailsListColumns([col], { ...ctxBase, editTrigger: 'always' });
    const el = dlCol.onRender!(rows[0]) as { props: { title?: string } };
    expect(el.props.title).toBeUndefined();
  });

  it('non-editable column is not wrapped', () => {
    const ro: ColumnDef<Row> = { key: 'name', fieldName: 'name', name: 'Name', rendererType: 'text' };
    const [dlCol] = toDetailsListColumns([ro], { ...ctxBase, editTrigger: 'click' });
    const el = dlCol.onRender!(rows[0]) as { props: { title?: string } };
    expect(el.props.title).toBeUndefined();
  });

  it('editorType set but no edit renderer (toggle) is not wrapped', () => {
    // toggle/boolean have no edit registration — they are interactive in read
    // mode, so they should NOT get the "Click to edit" affordance.
    const toggle: ColumnDef<Row> = {
      key: 'flag',
      fieldName: 'flag',
      name: 'Flag',
      rendererType: 'toggle',
      editorType: 'toggle',
    };
    const [dlCol] = toDetailsListColumns([toggle], { ...ctxBase, editTrigger: 'click' });
    const el = dlCol.onRender!(rows[0]) as { props: { title?: string } };
    expect(el.props.title).toBeUndefined();
  });
});
