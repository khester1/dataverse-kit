import { describe, it, expect } from 'vitest';
import { createCellRegistry, toReusableColumn } from '../registry';
import { toExportColumns, resolveExportColumns } from '../export';
import type { ColumnDef } from '../types';

describe('resolveExportColumns (export dialog column picker)', () => {
  const columns: ColumnDef[] = [
    { key: 'name', fieldName: 'name', name: 'Name', rendererType: 'text' },
    { key: 'rev', fieldName: 'rev', name: 'Revenue', rendererType: 'currency' },
    { key: 'doc', fieldName: 'doc', name: 'Doc', rendererType: 'fileDrop' },
  ];

  it('keeps only selected, non-fileDrop columns', () => {
    const result = resolveExportColumns(columns, new Set(['name', 'doc']));
    // 'doc' is fileDrop → excluded even though "selected"; 'rev' not selected → excluded.
    expect(result.map((c) => c.key)).toEqual(['name']);
  });

  it('deselecting a column narrows the export', () => {
    expect(resolveExportColumns(columns, new Set(['name', 'rev'])).map((c) => c.key)).toEqual([
      'name',
      'rev',
    ]);
    expect(resolveExportColumns(columns, new Set(['rev'])).map((c) => c.key)).toEqual(['rev']);
  });

  it('empty selection → no columns', () => {
    expect(resolveExportColumns(columns, new Set())).toEqual([]);
  });
});

describe('optionset multi-select column mapping', () => {
  it('maps multiSelect → optionSetMultiSelect and passes through string-key options + icons', () => {
    const col: ColumnDef = {
      key: 'tags',
      fieldName: 'tags',
      name: 'Tags',
      rendererType: 'optionset',
      editorType: 'dropdown',
      rendererConfig: {
        multiSelect: true,
        options: [
          { value: 'vip', label: 'VIP', iconName: 'FavoriteStar', color: '#ffb900' },
          { value: 'churn', label: 'Churn' },
        ],
      },
    };
    const mapped = toReusableColumn(col);
    expect(mapped.optionSetMultiSelect).toBe(true);
    expect(mapped.optionSetOptions?.[0]).toEqual({
      value: 'vip',
      label: 'VIP',
      iconName: 'FavoriteStar',
      color: '#ffb900',
    });
    // string key preserved (not coerced to a number)
    expect(mapped.optionSetOptions?.[0].value).toBe('vip');
  });
});

describe('toExportColumns', () => {
  it('maps fieldName → key and rendererType → canonical fieldType', () => {
    const cols: ColumnDef[] = [
      { key: 'c1', fieldName: 'name', name: 'Name', rendererType: 'text' },
      { key: 'c2', fieldName: 'rev', name: 'Revenue', rendererType: 'currency' },
      { key: 'c3', fieldName: 'pct', name: 'Progress', rendererType: 'progress' },
    ];
    expect(toExportColumns(cols)).toEqual([
      { key: 'name', name: 'Name', fieldType: 'text' },
      { key: 'rev', name: 'Revenue', fieldType: 'currency' },
      // 'progress' → canonical 'progressBar' (not the grid-kit renderer name)
      { key: 'pct', name: 'Progress', fieldType: 'progressBar' },
    ]);
  });

  it('skips fileDrop columns (no exportable value)', () => {
    const cols: ColumnDef[] = [
      { key: 'c1', fieldName: 'name', name: 'Name', rendererType: 'text' },
      { key: 'c2', fieldName: 'doc', name: 'Doc', rendererType: 'fileDrop' },
    ];
    expect(toExportColumns(cols).map((c) => c.key)).toEqual(['name']);
  });
});

describe('editable lookup + rating registration', () => {
  const reg = createCellRegistry();

  it('lookup resolves to the edit wrapper when editable + editorType:lookup', () => {
    const col: ColumnDef = {
      key: 'l',
      fieldName: 'l',
      name: 'L',
      rendererType: 'lookup',
      editorType: 'lookup',
    };
    expect(reg.resolve(col, true)).toBe(reg.get('lookup')!.edit);
    expect(reg.resolve(col, false)).toBe(reg.get('lookup')!.read);
  });

  it('rating resolves to the edit wrapper when editable + editorType:number', () => {
    const col: ColumnDef = {
      key: 'r',
      fieldName: 'r',
      name: 'R',
      rendererType: 'rating',
      editorType: 'number',
    };
    expect(reg.resolve(col, true)).toBe(reg.get('rating')!.edit);
    expect(reg.resolve(col, false)).toBe(reg.get('rating')!.read);
  });

  it('falls back to read when editable but no editorType, or when locked', () => {
    const noEditor: ColumnDef = { key: 'l', fieldName: 'l', name: 'L', rendererType: 'lookup' };
    expect(reg.resolve(noEditor, true)).toBe(reg.get('lookup')!.read);

    const locked: ColumnDef = {
      key: 'l',
      fieldName: 'l',
      name: 'L',
      rendererType: 'lookup',
      editorType: 'lookup',
      isLocked: true,
    };
    expect(reg.resolve(locked, true)).toBe(reg.get('lookup')!.read);
  });
});
