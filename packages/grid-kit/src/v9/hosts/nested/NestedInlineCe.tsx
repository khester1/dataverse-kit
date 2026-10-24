/**
 * Inline nested grid, `look="ce"`: the stock Power Apps grid with CHILD ITEMS set, measured on a live
 * org (design-tokens `ceForm.nestedGrid`; evidence in dynamics-ui-kit
 * apps/ce-parity/reference/captures/account-temp-grouped-nested-1710.txt, stages nestedgrid.*).
 *
 * ONE `DataGrid look="ce"` (via `DataGridInner`), not the default look's manual `Table`:
 * - NO extra column: the stock 44px select cell holds a checkbox zone and then the expander, so the
 *   select column narrows to `checkboxZoneWidth` and the expander is a flush `leadingColumn` of
 *   `expanderWidth` — together 44, and data columns start where a flat grid's do.
 * - every data row after the first carries a 1px `colors.divider` rule on top, in the same 42px pitch;
 * - an expanded row is followed by a DETAIL row (`after`) holding the child as its own ce grid — own
 *   header and "Rows: N" footer, no toolbar — inset `detailInset*`; several rows can be open at once.
 *
 * Children resolve lazily on first expand (`useExpanded` → the shared `useChildren`).
 *
 * Contract = the default inline mode's: no parent row commands and no `onActiveItemChanged` (a row
 * click is not an "activate" here). Parent selection IS supported — the stock grid has a checkbox.
 */
import React from 'react';
import { Button, Spinner, TableRow, TableCell, makeStyles, tokens } from '@fluentui/react-components';
import { ChevronDown12Regular, ChevronRight12Regular } from '@fluentui/react-icons';
import { ceForm } from '@dataverse-kit/design-tokens';
import type { V9NestedGridProps } from '../../types';
import { defaultGetKey } from '../../../adapters/context';
import { DataGridInner, DataGrid } from '../DataGrid';
import type { RowExtension } from '../rowExtension';
import { useExpanded } from './useExpanded';
import { CHILDREN_LOAD_ERROR } from '../../../hosts/nested/useChildren';

const NG = ceForm.nestedGrid;

/**
 * Keyboard EXITS from a detail row's child grid back to the parent grid — MEASURED necessary in
 * Chromium: arrows walk INTO the child (it is the next mover in DOM order) and then stay there, and
 * Escape on a child row does nothing, so without these the only way out was Tab, which leaves the
 * whole grid. Each yields to anything that already handled the key (an entered cell's Escape).
 * - Escape on a child ROW → the parent row.
 * - ArrowUp in the child's header row → the parent row.
 * - ArrowDown on the child's last row → the next parent row (if any).
 */
function onDetailKeyDown(e: React.KeyboardEvent<HTMLElement>): void {
  // Ctrl+Home / Ctrl+End inside a child grid belong to the CHILD: it has already moved focus; stop the
  // key reaching the parent grid's handlers, which would move it again (measured: to the parent's
  // last row / header).
  if (e.ctrlKey && (e.key === 'Home' || e.key === 'End')) {
    e.stopPropagation();
    return;
  }
  if (e.defaultPrevented) return;
  const detail = e.currentTarget.closest<HTMLElement>('[data-gridkit-detail-row]');
  const target = e.target as HTMLElement;
  const row = target.closest<HTMLElement>('[role="row"]');
  if (!detail || !row || row === detail) return;
  const rows = [...detail.querySelectorAll<HTMLElement>('[role="row"]')].filter((r) => !r.closest('[data-gridkit-aggregate-footer]'));
  const parentRow = detail.previousElementSibling as HTMLElement | null;
  let to: HTMLElement | null = null;
  if (e.key === 'Escape' && target === row) to = parentRow;
  // From ANY element of the child's header row (a header cell or select-all is as far up as it goes).
  else if (e.key === 'ArrowUp' && row === rows[0]) to = parentRow;
  else if (e.key === 'ArrowDown' && row === rows[rows.length - 1] && target === row) to = detail.nextElementSibling as HTMLElement | null;
  if (!to) return;
  e.preventDefault();
  e.stopPropagation();
  to.focus();
}
const SG = ceForm.subgrid;
/** The expander column's id (never a field name: it is not data). */
const EXPANDER_COLUMN_ID = '__gridkit_expander';

const useStyles = makeStyles({
  // Every data row after the first: a 1px rule on top, taken out of the cells (measured 41px) so the
  // pitch stays 42.
  ruled: {
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    '& > [role="gridcell"]': { minHeight: `${SG.rowHeight - 2}px` },
  },
  expander: {
    width: `${NG.expanderWidth}px`,
    minWidth: `${NG.expanderWidth}px`,
    maxWidth: `${NG.expanderWidth}px`,
    alignSelf: 'stretch',
    height: 'auto',
    padding: 0,
    borderRadius: 0,
    color: tokens.colorNeutralForeground3,
    fontSize: `${NG.expanderIconSize}px`,
  },
  // A detail row: one full-width cell; no rule of its own (the next row's top rule is the line).
  detailRow: { borderBottomStyle: 'none', cursor: 'default' },
  detailCell: {
    flex: '1 1 100%',
    minWidth: 0,
    boxSizing: 'border-box',
    paddingTop: `${NG.detailInsetTop}px`,
    paddingLeft: `${NG.detailInsetLeft}px`,
    paddingRight: `${NG.detailInsetRight}px`,
    // Not measured: below the child's footer the org leaves 7px, under a 27px band its child root
    // reserves and we do not draw (see the parity notes). The top inset is reused.
    paddingBottom: `${NG.detailInsetTop}px`,
    display: 'block',
  },
});

export function NestedInlineCe<T extends Record<string, unknown>, C extends Record<string, unknown>>(
  props: V9NestedGridProps<T, C>,
): JSX.Element {
  const { nested, getKey } = props;
  const s = useStyles();
  const getKeyFn = getKey ?? defaultGetKey;
  const { isOpen, toggle, get } = useExpanded<T, C>(nested);
  const selectable = (props.selectionMode ?? 'none') !== 'none';

  const ext: RowExtension<T> = {
    leadingColumn: {
      columnId: EXPANDER_COLUMN_ID,
      width: NG.expanderWidth,
      flush: true,
      renderHeader: () => null,
      headerAriaLabel: 'Expand row',
      renderCell: (item) => {
        const key = getKeyFn(item);
        const open = isOpen(key);
        return (
          <Button
            appearance="transparent"
            className={s.expander}
            icon={open ? <ChevronDown12Regular /> : <ChevronRight12Regular />}
            aria-label={open ? 'Collapse' : 'Expand'}
            aria-expanded={open}
            data-gridkit-expander=""
            onClick={(e) => {
              // The row's own click would toggle its selection; expanding is not selecting.
              e.stopPropagation();
              toggle(key, item);
            }}
            // …nor is a double-click on it a row "navigate" (the row's onDoubleClick).
            onDoubleClick={(e) => e.stopPropagation()}
          />
        );
      },
    },
    // Without a selection column there is no stock geometry to split; the expander stands alone.
    ...(selectable ? { selectCellWidth: NG.checkboxZoneWidth } : {}),
    rowClassName: (_item, isFirst) => (isFirst ? undefined : s.ruled),
    after: (item) => {
      const key = getKeyFn(item);
      if (!isOpen(key)) return null;
      const entry = get(key);
      return (
        <TableRow as="div" data-gridkit-detail-row="" className={s.detailRow}>
          <TableCell as="div" role="gridcell" className={s.detailCell} onKeyDown={onDetailKeyDown}>
            {!entry || entry.loading ? (
              <Spinner size="tiny" label="Loading related records…" />
            ) : entry.error !== undefined ? (
              <span role="alert" data-gridkit-children-error="">{CHILDREN_LOAD_ERROR}</span>
            ) : (
              <DataGrid<C>
                look="ce"
                items={entry.rows}
                columns={nested.childColumns}
                registry={nested.childRegistry}
                selectionMode={nested.childSelectionMode}
                onSelectionChanged={nested.onChildSelectionChanged ? (sel) => nested.onChildSelectionChanged!(item, sel) : undefined}
                editable={nested.childEditable}
                editTrigger={nested.childEditTrigger}
                resizableColumns={nested.childResizableColumns}
                resizableColumnsOptions={nested.childResizableColumns ? { autoFitColumns: false } : undefined}
                // The child sizes its columns by the parent's rule (the stock child is proportional too).
                columnFill={props.columnFill}
                onValueChange={nested.onChildValueChange ? (rk, fn, v, ov) => nested.onChildValueChange!(item, rk, fn, v, ov) : undefined}
                aria-label="Related records"
              />
            )}
          </TableCell>
        </TableRow>
      );
    },
  };

  // `ext` is rebuilt each render on purpose: it reads the current expansion.
  return (
    <DataGridInner<T>
      {...props}
      look="ce"
      getKey={getKeyFn}
      // The inline contract: no parent row commands, no "activate" on a row click.
      rowCommands={undefined}
      onActiveItemChanged={undefined}
      rowExtension={ext}
      aria-label={props['aria-label'] ?? 'Nested grid'}
    />
  );
}
