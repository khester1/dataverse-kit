/**
 * Inline nested grid (v9): a chevron column expands each parent row to reveal its child
 * grid indented beneath. v9's DataGrid has NO row-expansion primitive (unlike the v8
 * DetailsList `onRenderRow`), so this is a MANUAL v9 `<Table>` — a chevron cell + the
 * parent cells per row, plus a conditionally-injected full-width row hosting the child
 * v9 `<DataGrid>`. Children resolve LAZILY on first expand (the reused Fluent-free
 * `useChildren`).
 *
 * v1 scope: expand + lazy child grid + child selection/editing passthrough. Parent-row
 * selection, `requires-parent` child gating, alternate-row colors, and per-row commands
 * are deferred (parity with the v9 read DataGrid).
 */
import React, { useEffect, useMemo, type CSSProperties } from 'react';
import { Table, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell, Button, Spinner, tokens } from '@fluentui/react-components';
import { ChevronRightRegular, ChevronDownRegular } from '@fluentui/react-icons';
import type { ColumnDef } from '../../../types';
import type { V9NestedGridProps } from '../../types';
import { buildCellProps, defaultGetKey, type GridRenderContext } from '../../../adapters/context';
import { useExpanded } from './useExpanded';
import { CHILDREN_LOAD_ERROR } from '../../../hosts/nested/useChildren';
import { createV9CellRegistry } from '../../cells/registry';
import { DataGrid } from '../DataGrid';

const CHEVRON_CELL: CSSProperties = { flexBasis: 40, flexGrow: 0, flexShrink: 0, minWidth: 40 };
const dataCellStyle = (col: ColumnDef<unknown>): CSSProperties => ({
  flexBasis: col.minWidth ?? 120,
  flexGrow: 1,
  flexShrink: 1,
  minWidth: 0,
});

export function NestedInline<T extends Record<string, unknown>, C extends Record<string, unknown>>(
  props: V9NestedGridProps<T, C>,
): JSX.Element {
  const { items, columns, nested, registry: registryProp, compact, getKey, navigateTo } = props;
  // This manual-Table host has no toolbar, so `exportConfig` (inherited from V9GridProps) cannot
  // surface here — say so rather than drop it silently. `look="ce"` inline renders through
  // DataGrid and does export.
  const exportEnabled = !!props.exportConfig?.enabled;
  useEffect(() => {
    if (exportEnabled) console.warn('[grid-kit/v9] exportConfig is not supported by NestedGrid inline mode (default look) — use look="ce" or a side-panel mode.');
  }, [exportEnabled]);
  const chooserEnabled = !!props.columnChooser;
  useEffect(() => {
    if (chooserEnabled) console.warn('[grid-kit/v9] columnChooser is not supported by NestedGrid inline mode (default look) — use look="ce" or a side-panel mode.');
  }, [chooserEnabled]);
  const filtersEnabled = !!props.filterBuilder;
  useEffect(() => {
    if (filtersEnabled) console.warn('[grid-kit/v9] filterBuilder is not supported by NestedGrid inline mode (default look) — use look="ce" or a side-panel mode.');
  }, [filtersEnabled]);

  const defaultRegistry = useMemo(() => createV9CellRegistry(), []);
  const registry = registryProp ?? defaultRegistry;
  const getKeyFn = getKey ?? defaultGetKey;
  const ctx = useMemo<GridRenderContext<T>>(
    () => ({ registry, editable: false, getKey: getKeyFn, navigateTo }),
    [registry, getKeyFn, navigateTo],
  );

  const { isOpen, toggle, get } = useExpanded<T, C>(nested);

  const renderCell = (col: ColumnDef<T>, item: T): React.ReactNode => {
    const cellProps = buildCellProps(col, item, ctx);
    const Renderer = ctx.registry.resolve(col, false);
    return <Renderer {...cellProps} />;
  };

  return (
    // noNativeElements → flexbox layout (div-based), so the per-cell flexBasis/
    // flexGrow apply AND the expanded row's single cell spans the full width via
    // `flex: 1 1 100%`. A native <table> (the default) ignores those flex styles
    // and can't span columns with a div cell.
    <Table noNativeElements size={compact ? 'small' : 'medium'} aria-label="Nested grid">
      <TableHeader>
        <TableRow>
          <TableHeaderCell style={CHEVRON_CELL} />
          {columns.map((col) => (
            <TableHeaderCell key={col.key} style={dataCellStyle(col as ColumnDef<unknown>)}>
              {col.name}
            </TableHeaderCell>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const key = getKeyFn(item);
          const open = isOpen(key);
          const entry = get(key);
          return (
            <React.Fragment key={key}>
              <TableRow>
                <TableCell style={CHEVRON_CELL}>
                  <Button
                    appearance="subtle"
                    size="small"
                    icon={open ? <ChevronDownRegular /> : <ChevronRightRegular />}
                    aria-label={open ? 'Collapse' : 'Expand'}
                    onClick={() => toggle(key, item)}
                  />
                </TableCell>
                {columns.map((col) => (
                  <TableCell key={col.key} style={dataCellStyle(col as ColumnDef<unknown>)}>
                    {renderCell(col, item)}
                  </TableCell>
                ))}
              </TableRow>
              {open && (
                <TableRow>
                  {/* The expanded row is a single cell that must span the FULL table
                      width. A v9 <TableRow> is a flex container, so `width:100%` alone
                      doesn't grow the cell — it needs `flex: 1 1 100%` + `minWidth:0`,
                      and the child grid is wrapped in a full-width block so its columns
                      lay out across the row instead of collapsing to min-content. */}
                  <TableCell
                    style={{
                      flex: '1 1 100%',
                      width: '100%',
                      minWidth: 0,
                      boxSizing: 'border-box',
                      padding: '8px 8px 8px 44px',
                      background: tokens.colorNeutralBackground2,
                    }}
                  >
                    {!entry || entry.loading ? (
                      <Spinner size="tiny" label="Loading related records…" />
                    ) : entry.error !== undefined ? (
                      <span role="alert" data-gridkit-children-error="">{CHILDREN_LOAD_ERROR}</span>
                    ) : (
                      <div style={{ width: '100%' }}>
                        <DataGrid<C>
                          items={entry.rows}
                          columns={nested.childColumns}
                          registry={nested.childRegistry}
                          compact
                          selectionMode={nested.childSelectionMode}
                          onSelectionChanged={
                            nested.onChildSelectionChanged ? (sel) => nested.onChildSelectionChanged!(item, sel) : undefined
                          }
                          editable={nested.childEditable}
                          editTrigger={nested.childEditTrigger}
                          resizableColumns={nested.childResizableColumns}
                          resizableColumnsOptions={nested.childResizableColumns ? { autoFitColumns: false } : undefined}
                          onValueChange={
                            nested.onChildValueChange
                              ? (rk, fn, v, ov) => nested.onChildValueChange!(item, rk, fn, v, ov)
                              : undefined
                          }
                        />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
