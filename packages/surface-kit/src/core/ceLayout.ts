// Pure-TS layout rules MEASURED on a live Dynamics 365 CE model-driven form (the UCI "new look").
// Evidence: dynamics-ui-kit apps/ce-parity/reference/ (captures + ce-layout-reference.json).
// No React / Fluent imports: this file is inlined by export-engine like the rest of core/.

/** The appearance family a surface renders in: the kit's existing look, or the measured CE form. */
export type SurfaceLook = 'default' | 'ce';

/**
 * A Dynamics tab column never renders narrower than this (px). Measured: a 25% column in a
 * 1106px tab body renders 340, not 276.5.
 */
export const CE_TAB_COLUMN_MIN_WIDTH = 340;

/**
 * Normalise declared column shares so they sum to 100: negative or non-finite shares count as 0,
 * and all-zero (or empty-of-positive) input becomes equal shares. `TabColumns` renders the
 * NORMALISED shares, and `resolveTabColumnWidths` normalises too, so the CSS and this function
 * always agree. (CSS flexbox treats a flex-grow sum below 1 differently — it leaves free space
 * unused — and never grows a flex-grow-0 item; normalising removes both divergences.)
 */
export function normalizeColumnShares(shares: readonly number[]): number[] {
  const clean = shares.map((s) => (Number.isFinite(s) && s > 0 ? s : 0));
  const total = clean.reduce((a, b) => a + b, 0);
  if (total <= 0) return shares.map(() => 100 / (shares.length || 1));
  return clean.map((s) => (s / total) * 100);
}

/**
 * Resolve the rendered width of each tab column, the way Dynamics does.
 *
 * Each column takes its declared share (the formxml column `width`, e.g. 33 / 42 / 25) of the
 * space left after the gaps, but never goes below `minWidth`. The shortfall of a clamped column is
 * taken from the unclamped columns in proportion to their declared shares. That is CSS flexbox
 * with `flex: <share> 1 0` and `min-width` over NORMALISED shares (see normalizeColumnShares),
 * which is how `TabColumns` renders it.
 * This function exists so the rule can be tested and used where there is no DOM (e.g. sizing
 * from a PCF `allocatedWidth`).
 *
 * Verified against every measured layout: 33/42/25 at a 1450, 1240 and 1106px row gives
 * 478.5/609/362.5, 396/504/340 and 340/426/340; 34/33/33 at 1450 gives 493/478.5/478.5.
 *
 * @param shares   Declared column shares (percentages are the usual case; they are normalised).
 * @param available Row width in px AFTER subtracting the gaps between columns.
 * @param minWidth Minimum rendered column width. Defaults to the measured 340.
 * @returns Widths in px, in column order. If every column hits the floor the widths sum to more
 *          than `available`; the caller wraps or scrolls (Dynamics' behaviour there is unmeasured).
 */
export function resolveTabColumnWidths(
  shares: readonly number[],
  available: number,
  minWidth: number = CE_TAB_COLUMN_MIN_WIDTH,
): number[] {
  if (shares.length === 0) return [];
  shares = normalizeColumnShares(shares);
  const clamped = new Set<number>();
  let widths: number[] = [];
  // Resolve like the flexbox algorithm: distribute, freeze violators, redistribute, until none violate.
  for (let pass = 0; pass <= shares.length; pass++) {
    const free = available - clamped.size * minWidth;
    const total = shares.reduce((sum, s, i) => (clamped.has(i) ? sum : sum + Math.max(0, s)), 0);
    widths = shares.map((s, i) => {
      if (clamped.has(i)) return minWidth;
      return total > 0 ? (Math.max(0, s) / total) * free : free / (shares.length - clamped.size);
    });
    // CSS Flexbox §9.7: when the total violation is positive (only min-width constraints exist
    // here, so it always is), freeze EVERY min-violating item at once, then redistribute.
    const violators = widths.map((w, i) => (!clamped.has(i) && w < minWidth ? i : -1)).filter((i) => i >= 0);
    if (violators.length === 0) break;
    violators.forEach((i) => clamped.add(i));
  }
  return widths;
}

/**
 * Row width (px) below which a field label declared "beside" (formxml `Left`) is drawn ABOVE its
 * input instead.
 *
 * ★ PROVISIONAL. Measured only as a bracket: beside at a 362px row, above at a 306px row. 340 is
 *   the column floor and sits inside the bracket, but the exact switch point has NOT been
 *   observed. It is an open item in the reference; re-measure before relying on the exact value.
 */
export const CE_LABEL_ABOVE_BELOW_ROW_WIDTH = 340;
