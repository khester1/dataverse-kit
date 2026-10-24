import React from 'react';
import { mergeStyles, type IStyle } from '@fluentui/react';
import type { MasterDetailSurfaceProps } from '../types';
import { colors } from '../tokens/tokens';
import { BREAKPOINTS } from '../responsive/breakpoints';

/** Master (left rail) + detail (right pane) split that stacks vertically below `collapseBelow`. */
export const MasterDetailSurface: React.FC<MasterDetailSurfaceProps> = ({
  master,
  detail,
  detailFallback,
  splitRatio = 0.38,
  collapseBelow = 'md',
  className,
}) => {
  const masterFr = Math.min(90, Math.max(10, Math.round(splitRatio * 100)));
  const detailFr = 100 - masterFr;
  const collapsePx = BREAKPOINTS[collapseBelow];

  const rootCls = mergeStyles(
    {
      display: 'grid',
      gridTemplateColumns: `${masterFr}fr ${detailFr}fr`,
      minHeight: 0,
      selectors: { [`@media (max-width: ${collapsePx}px)`]: { gridTemplateColumns: '1fr' } },
    } as IStyle,
    className,
  );
  const masterCls = mergeStyles({
    minWidth: 0,
    overflow: 'auto',
    borderRight: `1px solid ${colors.borderNeutral}`,
    selectors: {
      [`@media (max-width: ${collapsePx}px)`]: {
        borderRight: 'none',
        borderBottom: `1px solid ${colors.borderNeutral}`,
      },
    },
  } as IStyle);
  const detailCls = mergeStyles({ minWidth: 0, overflow: 'auto' });

  return (
    <div className={rootCls}>
      <div className={masterCls}>{master}</div>
      <div className={detailCls}>{detail ?? detailFallback}</div>
    </div>
  );
};

export default MasterDetailSurface;
