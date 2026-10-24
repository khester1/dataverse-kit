/**
 * A GroupedGrid `look="ce"` group row: one row of the grid, laid out like the stock grid's runtime
 * "Group by" (ceForm.groupedGrid; evidence in dynamics-ui-kit
 * apps/ce-parity/reference/captures/account-temp-grouped-nested-1710.txt, DECISIONS block):
 * a checkbox in the select column (the data row's own 16px box), then — in the leading "Group by"
 * column — a 20x38 chevron 2px in and ONE semibold "Label (n)" run 12px after it; every other cell
 * empty. Filled `groupRowFill`; a 1px `groupRowRule` on top of every group row after the first.
 *
 * ★ Plain `TableRow` + `TableSelectionCell` + `DataGridCell` — see rowExtension.ts for why never
 *   `DataGridRow` / `DataGridSelectionCell` here.
 */
import React from 'react';
import {
  TableRow,
  TableSelectionCell,
  DataGridCell,
  makeStyles,
  mergeClasses,
  tokens,
  useDataGridContext_unstable,
  ColumnIdContextProvider,
} from '@fluentui/react-components';
import { ChevronDown20Regular, ChevronRight20Regular } from '@fluentui/react-icons';
import { ceForm } from '@dataverse-kit/design-tokens';
import { useExtraRowContext } from './rowExtension';

const GG = ceForm.groupedGrid;
/** Fluent v9 cells pad 16px horizontally on top of their width (see DataGrid.tsx CELL_HPAD). */
const CELL_HPAD = 16;
/**
 * The stock group label is NOT in the grid's Segoe stack: MEASURED 2026-10-02 (System Jobs,
 * read-only probe) its computed font-family is this system stack, while the Group-by header and the
 * data cells use Segoe. On Windows it resolves to Segoe UI (the same face as ours); on macOS to San
 * Francisco — "Bulk Delete (248)" read 118.8px in it and 109.2px in Segoe UI Web on the same page.
 * (Chrome serialises `BlinkMacSystemFont` as "system-ui", which is what the probe returned.)
 */
const GROUP_LABEL_FONT_FAMILY = '-apple-system, system-ui, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif';

const useStyles = makeStyles({
  row: {
    backgroundColor: tokens.colorNeutralBackground2,
    borderBottomColor: tokens.colorNeutralStroke3,
    cursor: 'default',
  },
  // Inside the same 42px pitch: the rule takes a pixel from the cells (measured: those cells are 41).
  ruleTop: { borderTop: `1px solid ${tokens.colorNeutralStroke2}` },
  // Horizontal padding stays Fluent's 8 + 8: the column width is the CONTENT box (CELL_HPAD).
  // Vertically the stock content is TOP-aligned 2px into the cell (a 1px transparent border + 1px
  // padding there), not centred — measured: the 38px chevron/label boxes sit at +2 on the first
  // group row and +3 on a ruled one (the rule is the extra pixel).
  cell: { minHeight: `${GG.groupRowHeight - 1 - 2}px`, paddingTop: '2px', alignItems: 'flex-start' },
  cellRuled: { minHeight: `${GG.groupRowHeight - 2 - 2}px` },
  lead: {
    paddingLeft: `${GG.chevronOffset}px`,
    paddingRight: `${CELL_HPAD - GG.chevronOffset}px`,
    cursor: 'pointer',
  },
  chevron: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: `${GG.chevronWidth}px`,
    height: `${GG.chevronHeight}px`,
    marginRight: `${GG.chevronToLabelGap}px`,
    color: tokens.colorNeutralForeground1,
    fontSize: `${GG.chevronIconSize}px`,
  },
  label: {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontFamily: GROUP_LABEL_FONT_FAMILY,
    fontSize: `${GG.labelFontSize}px`,
    lineHeight: `${GG.labelLineHeight}px`,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
});

export interface CeGroupRowProps {
  /** The ONE text run: "Label (n)". */
  label: string;
  expanded: boolean;
  onToggle: () => void;
  /** The first group row has no top rule. */
  first: boolean;
  /** Group checkbox state (multiselect grids only). */
  checked: boolean | 'mixed';
  onCheck: () => void;
}

export function CeGroupRow(props: CeGroupRowProps): JSX.Element {
  // Identity comes from the host's per-item Fragment slot (DataGrid.tsx), not from a key here.
  const { label, expanded, onToggle, first, checked, onCheck } = props;
  const s = useStyles();
  const ctx = useExtraRowContext();
  // The grid's composite-row tabster attribute, so arrow keys move through group rows like data rows.
  const tabsterAttr = useDataGridContext_unstable((c) => c.compositeRowTabsterAttribute);
  const cellClass = mergeClasses(s.cell, !first && s.cellRuled);
  // Space on the focused ROW toggles it (on the checkbox inside, Space selects, as on any row).
  // ★ Not Enter: the composite-row tabster groupper consumes Enter before React sees it and moves
  //   focus INTO the row — MEASURED in Chromium, and it is what puts the group checkbox within
  //   keyboard reach (Enter in, Escape out), exactly as on a data row. jsdom has no tabster, so an
  //   Enter branch here would pass there and never run in a browser.
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.target !== e.currentTarget) return;
    if (e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  };
  return (
    <TableRow
      as="div"
      data-gridkit-group-row=""
      aria-expanded={expanded}
      aria-label={label}
      tabIndex={0}
      {...tabsterAttr}
      className={mergeClasses(s.row, !first && s.ruleTop)}
      onKeyDown={onKeyDown}
    >
      {ctx.selectable &&
        (ctx.multiselect ? (
          <TableSelectionCell
            as="div"
            role="gridcell"
            checked={checked}
            aria-label={`Select all rows in ${label}`}
            onClick={onCheck}
            {...(ctx.selectCellStyle ? { style: ctx.selectCellStyle, className: ctx.selectCellClassName } : {})}
          />
        ) : (
          // Single selection has no group checkbox; keep the column's width.
          <TableSelectionCell
            as="div"
            role="presentation"
            checkboxIndicator={null}
            radioIndicator={null}
            aria-hidden="true"
            {...(ctx.selectCellStyle ? { style: ctx.selectCellStyle } : {})}
          />
        ))}
      {ctx.columnIds.map((id) =>
        id === ctx.leadingColumnId ? (
          <ColumnIdContextProvider key={id} value={id}>
            <DataGridCell focusMode="none" className={mergeClasses(cellClass, s.lead)} onClick={onToggle} {...ctx.cellProps(id)}>
              <span className={s.chevron} data-gridkit-group-chevron="" aria-hidden="true">
                {expanded ? <ChevronDown20Regular /> : <ChevronRight20Regular />}
              </span>
              <span className={s.label} data-gridkit-group-label="">
                {label}
              </span>
            </DataGridCell>
          </ColumnIdContextProvider>
        ) : (
          <ColumnIdContextProvider key={id} value={id}>
            <DataGridCell focusMode="none" aria-hidden="true" className={cellClass} {...ctx.cellProps(id)} />
          </ColumnIdContextProvider>
        ),
      )}
    </TableRow>
  );
}
