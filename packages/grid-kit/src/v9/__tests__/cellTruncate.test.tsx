import { describe, it, expect } from 'vitest';
import type React from 'react';
import { toDataGridColumns } from '../adapter';
import { createV9CellRegistry } from '../cells/registry';
import type { ColumnDef } from '../../types';

// jsdom does no layout, so the overflow itself is gated in a real browser (ce-parity parity gate,
// "grid cell text stays inside its cell"). This pins the DECISION the adapter makes per cell:
// read-only cells truncate (a long value must not run into the next column); editable columns do
// NOT (truncate is overflow:hidden, which clips EditShell's dirty/error accent and its error text).
type Row = { key: string; name: string } & Record<string, unknown>;
const item: Row = { key: '1', name: 'A value long enough to need truncation in a narrow column' };
const registry = createV9CellRegistry();

const truncateOf = (column: ColumnDef<Row>, ctx: Partial<Parameters<typeof toDataGridColumns<Row>>[1]> = {}) => {
  const [col] = toDataGridColumns<Row>([column], { registry, ...ctx });
  const el = col.renderCell(item) as React.ReactElement<{ truncate?: boolean }>;
  return el.props.truncate;
};

const text: ColumnDef<Row> = { key: 'name', fieldName: 'name', name: 'Name', rendererType: 'text' };
const editableText: ColumnDef<Row> = { ...text, editorType: 'text' };

describe('v9 adapter — which cells truncate', () => {
  it('a read-only cell truncates', () => {
    expect(truncateOf(text)).toBe(true);
  });
  it('an editable column in an editable grid does not (click-to-edit)', () => {
    expect(truncateOf(editableText, { editable: true })).toBe(false);
  });
  it("an editable column does not with editTrigger 'always' either", () => {
    expect(truncateOf(editableText, { editable: true, editTrigger: 'always' })).toBe(false);
  });
  it('an editorType column in a NON-editable grid is read-only, so it truncates', () => {
    expect(truncateOf(editableText, { editable: false })).toBe(true);
  });
  it('a locked column in an editable grid is read-only, so it truncates', () => {
    expect(truncateOf({ ...editableText, isLocked: true }, { editable: true })).toBe(true);
  });
});
