import React from 'react';
import { mergeStyles, type IStyle } from '@fluentui/react';
import type { TwoColumnLayoutProps } from '../types';
import { BREAKPOINTS } from '../responsive/breakpoints';

/** Two equal columns that collapse to one below `collapseBelow` (default 'sm' = 480). */
export const TwoColumnLayout: React.FC<TwoColumnLayoutProps> = ({
  gap = 16,
  collapseBelow = 'sm',
  className,
  style,
  children,
}) => {
  const cls = mergeStyles(
    {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap,
      alignItems: 'start',
      selectors: {
        [`@media (max-width: ${BREAKPOINTS[collapseBelow]}px)`]: { gridTemplateColumns: '1fr' },
      },
    } as IStyle,
    className,
  );
  return (
    <div className={cls} style={style}>
      {children}
    </div>
  );
};

export default TwoColumnLayout;
