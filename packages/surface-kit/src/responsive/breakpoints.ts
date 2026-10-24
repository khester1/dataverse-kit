// Named responsive breakpoints (px). The 480/768 cutoffs match the export-engine
// section/field stacking; CARD_REFLOW_WIDTH (900) matches the CardGrid reflow
// emitter (a separate cutoff). Pure-TS (no react/@fluentui).
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export const BREAKPOINTS: Record<Breakpoint, number> = {
  xs: 0,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1366,
};

/** The card-grid reflow cutoff the codegen CardGrid emitter uses (distinct from the 480/768 field/section cutoffs). */
export const CARD_REFLOW_WIDTH = 900;

const DESCENDING: Breakpoint[] = ['xl', 'lg', 'md', 'sm', 'xs'];
const ASCENDING: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl'];

/** Largest breakpoint whose min-width is <= width. */
export function resolveBreakpoint(width: number): Breakpoint {
  for (const bp of DESCENDING) {
    if (width >= BREAKPOINTS[bp]) return bp;
  }
  return 'xs';
}

export type ResponsiveValue<T> = T | Partial<Record<Breakpoint, T>>;

function isResponsiveMap<T>(v: ResponsiveValue<T>): v is Partial<Record<Breakpoint, T>> {
  return typeof v === 'object' && v !== null && ASCENDING.some((bp) => bp in (v as object));
}

/**
 * Resolve a responsive value at a breakpoint, cascading mobile-first: pick the
 * nearest defined value at or below `breakpoint`, else the nearest defined above.
 */
export function resolveResponsiveValue<T>(value: ResponsiveValue<T>, breakpoint: Breakpoint): T | undefined {
  if (!isResponsiveMap(value)) return value as T;
  const map = value;
  const idx = ASCENDING.indexOf(breakpoint);
  for (let i = idx; i >= 0; i--) {
    const v = map[ASCENDING[i]];
    if (v !== undefined) return v;
  }
  for (let i = idx + 1; i < ASCENDING.length; i++) {
    const v = map[ASCENDING[i]];
    if (v !== undefined) return v;
  }
  return undefined;
}
