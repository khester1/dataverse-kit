import React from 'react';
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import type { FormSurfaceProps } from '../types';
import { scaleSpacing } from '../../tokens/density';
import { BREAKPOINTS, type Breakpoint } from '../../responsive/breakpoints';
import { DensityContext } from '../../hooks/useDensity';
import { LookContext } from '../../hooks/useLook';

// The Fluent v9 counterpart of the v8 FormSurface: the N-column form canvas that Sections
// sit on. Same logic — stacks children to full width below `collapseBelow`, driven by the
// *container* width when `containerWidth` is supplied (PCF allocatedWidth), else by the
// viewport via @media — re-skinned with griffel (makeStyles) + v9 theme tokens. The
// density/breakpoint math is the SHARED framework-agnostic layer (scaleSpacing, BREAKPOINTS).

const useStyles = makeStyles({
  root: {
    display: 'grid',
    alignItems: 'start',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  // Container forced a single column: reset every child's span the same way the @media
  // fallback does, so a Section with `columnStart` doesn't escape the stack.
  forceStackChildren: {
    '& > *': { gridColumn: '1 / -1' },
  },
  // Viewport fallbacks (used only when containerWidth is unset) — one static slot per
  // breakpoint so griffel gets literal media strings. The px come from the shared BREAKPOINTS.
  stackSm: { [`@media (max-width: ${BREAKPOINTS.sm}px)`]: { '& > *': { gridColumn: '1 / -1' } } },
  stackMd: { [`@media (max-width: ${BREAKPOINTS.md}px)`]: { '& > *': { gridColumn: '1 / -1' } } },
  stackLg: { [`@media (max-width: ${BREAKPOINTS.lg}px)`]: { '& > *': { gridColumn: '1 / -1' } } },
  stackXl: { [`@media (max-width: ${BREAKPOINTS.xl}px)`]: { '& > *': { gridColumn: '1 / -1' } } },
});

const VIEWPORT_STACK: Record<Breakpoint, keyof ReturnType<typeof useStyles> | null> = {
  xs: null, // xs = 0px, never stacks
  sm: 'stackSm',
  md: 'stackMd',
  lg: 'stackLg',
  xl: 'stackXl',
};

/** The N-column form canvas that hosts Sections (Fluent UI v9). */
export const FormSurface: React.FC<FormSurfaceProps> = ({
  columns = 12,
  gap = 20,
  padding,
  density = 'comfortable',
  background,
  containerWidth,
  look = 'default',
  collapseBelow = 'sm',
  maxWidth,
  className,
  style,
  children,
}) => {
  const styles = useStyles();
  if (look === 'ce') {
    // A plain block (see FormSurfaceProps.look): the CE page is chrome stacked top to bottom and
    // its columns are TabColumns'. As a grid it put CommandSurface/TabColumns into ONE of 12
    // tracks, and `1fr` tracks (min-width: auto) let no-wrap header content widen the page.
    return (
      <DensityContext.Provider value={density}>
        <LookContext.Provider value={look}>
          <div
            className={className}
            data-surface-part="form-surface"
            data-look="ce"
            style={{
              display: 'flow-root',
              minWidth: 0,
              padding: padding ?? 0,
              ...(background != null ? { background } : {}),
              ...(maxWidth != null ? { maxWidth, marginLeft: 'auto', marginRight: 'auto' } : {}),
              ...style,
            }}
          >
            {children}
          </div>
        </LookContext.Provider>
      </DensityContext.Provider>
    );
  }
  const collapsePx = BREAKPOINTS[collapseBelow];
  const forceStack = containerWidth != null && containerWidth <= collapsePx;
  // Density scales the canvas gap + padding; cascades to child Sections via context.
  const scaledGap = scaleSpacing(gap, density);
  const scaledPadding = scaleSpacing(padding ?? 20, density);

  const viewportStackSlot = containerWidth == null ? VIEWPORT_STACK[collapseBelow] : null;

  const cls = mergeClasses(
    styles.root,
    forceStack && styles.forceStackChildren,
    viewportStackSlot ? styles[viewportStackSlot] : undefined,
    className,
  );

  const inlineStyle: React.CSSProperties = {
    gridTemplateColumns: forceStack ? '1fr' : `repeat(${columns}, 1fr)`,
    gap: scaledGap,
    padding: scaledPadding,
    ...(background != null ? { background } : {}),
    ...(maxWidth != null ? { maxWidth, marginLeft: 'auto', marginRight: 'auto' } : {}),
    ...style,
  };

  return (
    <DensityContext.Provider value={density}>
      <LookContext.Provider value={look}>
        <div className={cls} style={inlineStyle}>
          {children}
        </div>
      </LookContext.Provider>
    </DensityContext.Provider>
  );
};

export default FormSurface;
