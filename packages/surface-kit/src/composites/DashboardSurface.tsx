import React from 'react';
import { mergeStyles, type IStyle } from '@fluentui/react';
import type { DashboardSurfaceProps } from '../types';
import { CARD_REFLOW_WIDTH, BREAKPOINTS } from '../responsive/breakpoints';

/** A reflowing grid of dashboard tiles (N cols → 2 below 900px → 1 below 480px). */
export const DashboardSurface: React.FC<DashboardSurfaceProps> = ({ tiles, columns = 2, gap = 16, className }) => {
  const cls = mergeStyles(
    {
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      gap,
      alignItems: 'start',
      selectors: {
        [`@media (max-width: ${CARD_REFLOW_WIDTH}px)`]: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
        [`@media (max-width: ${BREAKPOINTS.sm}px)`]: { gridTemplateColumns: '1fr' },
      },
    } as IStyle,
    className,
  );
  return (
    <div className={cls}>
      {tiles.map((tile, i) => (
        <div key={`tile-${i}`}>{tile}</div>
      ))}
    </div>
  );
};

export default DashboardSurface;
