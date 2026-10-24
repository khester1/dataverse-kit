import { describe, it, expect } from 'vitest';
import { createCellRegistry } from '../registry';
import { toDetailsListColumns, toGridCustomizerOverrides } from '../adapters';
import { demoColumns } from '../_storybook/sample';
import type { CellRendererType } from '../types';

const ALL_TYPES: CellRendererType[] = [
  'text', 'link', 'lookup', 'optionset', 'currency', 'number',
  'date', 'datetime', 'boolean', 'toggle', 'icon', 'progress',
  'coloredCell', 'rating', 'composite',
];

describe('cross-host cell registry', () => {
  it('registers a read renderer for every built-in cell type', () => {
    const r = createCellRegistry();
    for (const t of ALL_TYPES) {
      expect(typeof r.get(t)?.read).toBe('function');
    }
  });

  it('resolve() picks edit only when editable + editorType + not locked', () => {
    const r = createCellRegistry();
    const col = demoColumns.find((c) => c.key === 'name')!; // text + editorType 'text'
    expect(r.resolve(col, false)).toBe(r.get('text')!.read);
    expect(r.resolve(col, true)).toBe(r.get('text')!.edit);
    expect(r.resolve({ ...col, isLocked: true }, true)).toBe(r.get('text')!.read);
  });

  it('the SAME registry drives both host adapters', () => {
    const r = createCellRegistry();
    const dlColumns = toDetailsListColumns(demoColumns, { registry: r, getKey: (x) => x.key });
    const overrides = toGridCustomizerOverrides(demoColumns, r);

    expect(dlColumns).toHaveLength(demoColumns.length);
    expect(dlColumns.every((c) => typeof c.onRender === 'function')).toBe(true);
    for (const c of demoColumns) {
      expect(typeof overrides[c.fieldName]).toBe('function');
    }
  });

  it('register() overrides a built-in renderer', () => {
    const r = createCellRegistry();
    const Custom = () => null;
    r.register('progress', { read: Custom });
    expect(r.get('progress')!.read).toBe(Custom);
  });

  it('unknown renderer types fall back to text (no blank cells)', () => {
    const r = createCellRegistry();
    const renderer = r.resolve({ key: 'x', fieldName: 'x', name: 'X', rendererType: 'mystery' as CellRendererType }, false);
    expect(renderer).toBe(r.get('text')!.read);
  });
});
