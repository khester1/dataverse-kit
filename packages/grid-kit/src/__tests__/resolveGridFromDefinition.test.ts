import { describe, it, expect } from 'vitest';
import { resolveGridFromDefinition } from '../adapters';
import type { GridDefinitionLike } from '../adapters';

const cols = [
  { fieldName: 'name', displayName: 'Name', dataType: 'text', rendererType: 'text' },
  { fieldName: 'revenue', displayName: 'Revenue', dataType: 'currency', rendererType: 'currency' },
];
const items = [{ key: '1', name: 'A', revenue: 100 }];

function def(extra: Partial<GridDefinitionLike>): GridDefinitionLike {
  return { columns: cols, ...extra };
}

describe('resolveGridFromDefinition', () => {
  it('standard / editable → data host', () => {
    expect(resolveGridFromDefinition(def({ gridType: 'standard' }), items).host).toBe('data');
    const editable = resolveGridFromDefinition(def({ gridType: 'editable' }), items);
    expect(editable.host).toBe('data');
    expect((editable.props as { editable?: boolean }).editable).toBe(true);
  });

  it('readonly → readonly host, selection forced none', () => {
    const r = resolveGridFromDefinition(def({ gridType: 'readonly', selectionMode: 'multiple' }), items);
    expect(r.host).toBe('readonly');
    expect((r.props as { selectionMode?: string }).selectionMode).toBe('none');
  });

  it('card-list → card host with cardView mapped', () => {
    const r = resolveGridFromDefinition(
      def({ gridType: 'card-list', cardView: { cardsPerRow: 4, titleField: 'name' } }),
      items
    );
    expect(r.host).toBe('card');
    if (r.host === 'card') {
      expect(r.props.card?.cardsPerRow).toBe(4);
      expect(r.props.card?.titleField).toBe('name');
    }
  });

  it('focused-view → focused-view host, config from legacy fields', () => {
    const r = resolveGridFromDefinition(
      def({ gridType: 'focused-view', focusedView: { primaryNameField: 'name', summaryFields: [{ label: 'Rev', fieldName: 'revenue' }] } }),
      items
    );
    expect(r.host).toBe('focused-view');
    if (r.host === 'focused-view') {
      expect(r.props.focusedView.rows[0].primaryField.fieldName).toBe('name');
      expect(r.props.focusedView.rows.some((row) => row.primaryField.fieldName === 'revenue')).toBe(true);
    }
  });

  it('nestedGridId + resolveNested → nested host with mode default by gridType', () => {
    const resolveNested = () => ({ childColumns: [], getChildren: () => [] });
    // card-list parent → side-panel default
    const r = resolveGridFromDefinition(def({ gridType: 'card-list', nestedGridId: 'child' }), items, { resolveNested });
    expect(r.host).toBe('nested');
    if (r.host === 'nested') expect(r.props.nested.mode).toBe('side-panel');
    // standard parent → inline default
    const r2 = resolveGridFromDefinition(def({ gridType: 'standard', nestedGridId: 'child' }), items, { resolveNested });
    if (r2.host === 'nested') expect(r2.props.nested.mode).toBe('inline');
  });

  it('threads nested child selection/gating from the definition', () => {
    const resolveNested = () => ({ childColumns: [], getChildren: () => [] });
    const r = resolveGridFromDefinition(
      def({
        gridType: 'standard',
        nestedGridId: 'child',
        nestedSelectionMode: 'requires-parent',
        nestedDisplay: { mode: 'inline', childSelectionMode: 'multiple', childEditable: true },
      }),
      items,
      { resolveNested }
    );
    expect(r.host).toBe('nested');
    if (r.host === 'nested') {
      expect(r.props.nested.childSelectionMode).toBe('multiple');
      expect(r.props.nested.childSelectionGating).toBe('requires-parent');
      expect(r.props.nested.childEditable).toBe(true);
    }
  });

  it('focused-view parent + nestedGridId → focused-view host with detail-pane nested', () => {
    const resolveNested = () => ({ childColumns: [], getChildren: () => [] });
    const r = resolveGridFromDefinition(
      def({ gridType: 'focused-view', nestedGridId: 'child', focusedView: { primaryNameField: 'name' } }),
      items,
      { resolveNested }
    );
    expect(r.host).toBe('focused-view');
    if (r.host === 'focused-view') expect(r.props.nested?.mode).toBe('detail-pane');
  });

  it('explicit nestedDisplay.mode overrides the default', () => {
    const resolveNested = () => ({ childColumns: [], getChildren: () => [] });
    const r = resolveGridFromDefinition(
      def({ gridType: 'standard', nestedGridId: 'child', nestedDisplay: { mode: 'hover-callout' } }),
      items,
      { resolveNested }
    );
    if (r.host === 'nested') expect(r.props.nested.mode).toBe('hover-callout');
  });
});
