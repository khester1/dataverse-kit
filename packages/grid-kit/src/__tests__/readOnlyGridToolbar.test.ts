import { describe, it, expect } from 'vitest';
import type { ReactElement } from 'react';
import { ReadOnlyGrid } from '../hosts/ReadOnlyGrid';
import type { ColumnDef, GridCommand, ReadOnlyGridProps } from '../types';

/**
 * ReadOnlyGrid is a pure preset wrapper (no hooks) — it returns
 * `<DataGrid {...props} selectionMode="none" editable={false} />`. So we can
 * invoke it directly and inspect the returned element's props without a DOM
 * renderer (grid-kit's test setup has none).
 *
 * Regression guard for the A-full toolbar consolidation: ReadOnlyGrid used to
 * STRIP `toolbar.commands` (re-emitting only showSearch/searchPlaceholder/onSearch),
 * which forced the export-engine read-only subgrid to render an external command
 * bar. It now FORWARDS the full toolbar so New/Refresh/Export consolidate into the
 * single host `<GridToolbar>`. selectionMode stays "none".
 */
interface Row extends Record<string, unknown> {
  key: string;
  name: string;
}

const columns: ColumnDef<Row>[] = [
  { key: 'name', fieldName: 'name', name: 'Name', rendererType: 'text', minWidth: 120 },
];
const items: Row[] = [{ key: '1', name: 'A' }];
const commands: GridCommand[] = [
  { key: 'new', text: 'New', iconName: 'Add' },
  { key: 'refresh', text: 'Refresh', iconName: 'Refresh' },
];

function call(props: ReadOnlyGridProps<Row>): ReactElement {
  return ReadOnlyGrid<Row>(props) as ReactElement;
}

describe('ReadOnlyGrid toolbar forwarding', () => {
  it('forwards toolbar.commands through to the inner DataGrid (no longer strips them)', () => {
    const el = call({ items, columns, toolbar: { showSearch: true, commands } });
    expect(el.props.toolbar).toBeDefined();
    expect(el.props.toolbar.commands).toEqual(commands);
    expect(el.props.toolbar.showSearch).toBe(true);
  });

  it('forces selectionMode="none" and editable=false regardless of forwarded toolbar', () => {
    const el = call({ items, columns, toolbar: { commands } });
    expect(el.props.selectionMode).toBe('none');
    expect(el.props.editable).toBe(false);
  });

  it('forwards filterBuilder/columnChooser so the injected Filter/Columns share the one bar', () => {
    const el = call({ items, columns, filterBuilder: true, columnChooser: true, toolbar: { commands } });
    expect(el.props.filterBuilder).toBe(true);
    expect(el.props.columnChooser).toBe(true);
  });

  it('leaves toolbar undefined when none is supplied (display-only preset unchanged)', () => {
    const el = call({ items, columns });
    expect(el.props.toolbar).toBeUndefined();
    expect(el.props.selectionMode).toBe('none');
  });
});
