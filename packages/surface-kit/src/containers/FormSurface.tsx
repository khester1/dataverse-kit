import React from 'react';
import { mergeStyles, type IStyle } from '@fluentui/react';
import type { FormSurfaceProps } from '../types';
import { colors } from '../tokens/tokens';
import { scaleSpacing } from '../tokens/density';
import { BREAKPOINTS } from '../responsive/breakpoints';
import { stackChildrenBelow } from '../internal/styles';
import { DensityContext } from '../hooks/useDensity';

// Ported from reusable-components Form's body grid. The outer N-column form canvas
// that Sections sit on. Stacks children to full width below `collapseBelow` — driven
// by the *container* width when `containerWidth` is supplied (PCF allocatedWidth),
// else by the viewport via @media.

/** The N-column form canvas that hosts Sections. */
export const FormSurface: React.FC<FormSurfaceProps> = ({
  columns = 12,
  gap = 20,
  padding = 20,
  density = 'comfortable',
  background = colors.canvas,
  containerWidth,
  collapseBelow = 'sm',
  maxWidth,
  className,
  style,
  children,
}) => {
  const collapsePx = BREAKPOINTS[collapseBelow];
  const forceStack = containerWidth != null && containerWidth <= collapsePx;
  // Density scales the canvas gap + padding; cascades to child Sections via context.
  // `comfortable` is x1, so an unset/comfortable density is byte-identical to before.
  const scaledGap = scaleSpacing(gap, density);
  const scaledPadding = scaleSpacing(padding, density);

  const cls = mergeStyles(
    {
      display: 'grid',
      gridTemplateColumns: forceStack ? '1fr' : `repeat(${columns}, 1fr)`,
      gap: scaledGap,
      padding: scaledPadding,
      background,
      alignItems: 'start',
      ...(maxWidth != null ? { maxWidth, marginLeft: 'auto', marginRight: 'auto' } : {}),
      // When the container forces a single column, reset child spans the same way the
      // viewport fallback does — otherwise a Section with `columnStart` references grid
      // lines that no longer exist and escapes the stack. (Mutually exclusive with the
      // @media fallback below, which only applies when containerWidth is unset.)
      ...(forceStack ? { selectors: { '> *': { gridColumn: '1 / -1' } } } : {}),
      // Viewport fallback only when the container width isn't explicitly provided.
      ...(containerWidth == null ? stackChildrenBelow(collapsePx) : {}),
    } as IStyle,
    className,
  );

  return (
    <DensityContext.Provider value={density}>
      <div className={cls} style={style}>
        {children}
      </div>
    </DensityContext.Provider>
  );
};

export default FormSurface;
