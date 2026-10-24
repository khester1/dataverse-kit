import React from 'react';
import { makeStyles, mergeClasses } from '@fluentui/react-components';
import type { TabColumnsProps } from '../types';
import { ceForm } from '../../tokens';
import { normalizeColumnShares } from '../../core/ceLayout';
import { useLook } from '../../hooks/useLook';

// A tab body's columns (Fluent v9), laid out the way Dynamics lays out a formxml tab.
//
// Each column is `flex: <normalised share> 1 0` with a `min-width`, so CSS flexbox resolves the
// widths itself: every column gets its share of the row, none goes below the floor, and a clamped
// column's shortfall is taken from the others by share. That is the measured Dynamics rule; core
// `resolveTabColumnWidths` returns the same numbers without a DOM (both normalise the shares).
// Sections stack inside a column with the same gap. Columns wrap onto a new line once even the
// floors do not fit, and the floor never exceeds the container (`min(floor, 100%)`) so a narrow
// host degrades to one full-width column instead of overflowing. Dynamics' behaviour in both
// cases is unmeasured.
//
// ★ Columns are POSITIONAL, like formxml: `widths[i]` belongs to the i-th child slot even when an
//   earlier child is `null`/`false` (a conditional column), so a hidden column never hands its
//   share to its neighbour.

const useStyles = makeStyles({
  row: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
  },
});

/** Flatten top-level children positionally: arrays are expanded; empty slots are kept as null. */
function positional(children: React.ReactNode): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const walk = (node: React.ReactNode) => {
    if (Array.isArray(node)) node.forEach(walk);
    else out.push(node);
  };
  walk(children);
  return out;
}
const isEmpty = (n: React.ReactNode) => n === null || n === undefined || typeof n === 'boolean' || n === '';

/** Tab-body columns with declared shares and a width floor (Fluent UI v9). One child per column. */
export const TabColumns: React.FC<TabColumnsProps> = ({
  widths,
  minColumnWidth,
  gap,
  look: lookProp,
  className,
  style,
  children,
}) => {
  const styles = useStyles();
  const ambientLook = useLook();
  const ce = (lookProp ?? ambientLook) === 'ce';
  const floor = minColumnWidth ?? (ce ? ceForm.tabBody.columnMinWidth : 300);
  const spacing = gap ?? (ce ? ceForm.tabBody.columnGap : 20);
  const slots = positional(children);
  // Shares are resolved over the VISIBLE columns (a hidden column takes no space), each keeping
  // its own declared share.
  const visible = slots.map((s, i) => ({ node: s, i })).filter(({ node }) => !isEmpty(node));
  const shares = normalizeColumnShares(visible.map(({ i }) => widths?.[i] ?? 1));

  return (
    <div
      className={mergeClasses(styles.row, className)}
      style={{ gap: spacing, ...style }}
      data-surface-part="tab-columns"
      data-look={ce ? 'ce' : 'default'}
    >
      {visible.map(({ node, i }, v) => (
        <div
          key={React.isValidElement(node) && node.key != null ? node.key : i}
          className={styles.column}
          style={{ flex: `${shares[v]} 1 0`, minWidth: `min(${floor}px, 100%)`, gap: ce ? ceForm.tabBody.sectionGap : spacing }}
          data-surface-part="tab-column"
          data-column-index={i}
        >
          {node}
        </div>
      ))}
    </div>
  );
};

export default TabColumns;
