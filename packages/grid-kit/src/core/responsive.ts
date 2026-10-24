// Pure responsive primitives for grid-kit hosts. Framework-agnostic (no react /
// @fluentui imports) so this stays under the `src/core/**` eslint guard and is
// reusable from a future v9 layer untouched.
//
// The 480/768 cutoffs are REDECLARED locally to match
// @dataverse-kit/surface-kit's `src/responsive/breakpoints.ts` (BREAKPOINTS.sm/md)
// and CARD_REFLOW_WIDTH=900 — kept in sync by convention, NOT imported: surface-kit
// HOSTS grid-kit, so grid-kit must never import surface-kit (dependency cycle).

export type GridBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export const GRID_BREAKPOINTS: Record<GridBreakpoint, number> = {
  xs: 0,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1366,
};

/** The card-grid reflow cutoff (distinct from the 480/768 field/section cutoffs). */
export const CARD_REFLOW_WIDTH = 900;

/** Largest breakpoint whose min-width is <= `width`. */
export function resolveBreakpoint(width: number): GridBreakpoint {
  if (width >= GRID_BREAKPOINTS.xl) return 'xl';
  if (width >= GRID_BREAKPOINTS.lg) return 'lg';
  if (width >= GRID_BREAKPOINTS.md) return 'md';
  if (width >= GRID_BREAKPOINTS.sm) return 'sm';
  return 'xs';
}

/**
 * True when the measured container width is below the `md` (768px) cutoff — the
 * signal a host uses to switch to a stacked/narrow layout. Width 0 (SSR / first
 * paint / non-DOM unit test, before the ResizeObserver reports) is treated as NOT
 * narrow, so the default render is the WIDE layout and there is no flash-to-stacked.
 */
export function deriveIsNarrow(width: number): boolean {
  return width > 0 && width < GRID_BREAKPOINTS.md;
}

/** Neutral priority for a column that does not declare `responsivePriority`. Authors use 0–100; higher is kept longer. */
export const DEFAULT_RESPONSIVE_PRIORITY = 50;

export interface ShedColumnsOptions {
  /** Container width at/above which nothing sheds. Default `GRID_BREAKPOINTS.md` (768). */
  breakpoint?: number;
  /** Approx. px budget per retained column (how many fit). Default 140. */
  minColumnWidth?: number;
}

/** The minimal column shape `shedColumns` reads (a structural subset of `ColumnDef`). */
export interface SheddableColumn {
  key: string;
  responsivePriority?: number;
  aggregate?: unknown;
}

/** Never shed: grid-kit `__`-prefixed control columns (chevron / nested trigger /
 *  selection) and any column with an `aggregate` (its footer/subtotal cell must stay
 *  positionally aligned with the body). */
function isProtectedColumn(col: SheddableColumn): boolean {
  const a = col.aggregate;
  return col.key.startsWith('__') || (a != null && !(Array.isArray(a) && a.length === 0));
}

/**
 * Presentation-only column shedding for narrow containers. Returns the input array
 * BY IDENTITY (no shedding — so host `useMemo`s stay stable and existing grids are
 * byte/behavior-identical) when ANY of:
 *   - `width === 0` (SSR / first paint / no-DOM — render the wide/full set),
 *   - `width >= breakpoint` (wide enough),
 *   - no column declares `responsivePriority` (the opt-in gate).
 * Otherwise keeps, IN ORIGINAL ORDER, the protected columns plus the highest-priority
 * sheddable columns that fit the width budget (ties broken by original position).
 */
export function shedColumns<C extends SheddableColumn>(
  columns: C[],
  width: number,
  opts: ShedColumnsOptions = {}
): C[] {
  const breakpoint = opts.breakpoint ?? GRID_BREAKPOINTS.md;
  if (width === 0 || width >= breakpoint) return columns;
  if (!columns.some((c) => typeof c.responsivePriority === 'number')) return columns;

  const minColumnWidth = opts.minColumnWidth ?? 140;
  const budget = Math.max(1, Math.floor(width / minColumnWidth));

  const protectedCount = columns.filter(isProtectedColumn).length;
  const sheddable = columns.filter((c) => !isProtectedColumn(c));
  const keep = Math.max(0, budget - protectedCount);
  if (keep >= sheddable.length) return columns; // everything fits → identity

  const keptSheddable = new Set(
    sheddable
      .map((c, i) => ({ c, i, p: c.responsivePriority ?? DEFAULT_RESPONSIVE_PRIORITY }))
      .sort((a, b) => b.p - a.p || a.i - b.i)
      .slice(0, keep)
      .map((r) => r.c)
  );

  return columns.filter((c) => isProtectedColumn(c) || keptSheddable.has(c));
}
