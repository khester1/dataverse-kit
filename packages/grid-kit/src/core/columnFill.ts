/**
 * Proportional column fill — the rule the stock Dynamics grid applies to a view's column
 * widths. MEASURED 2026-09-29 on "My Active Accounts" (orge2e285aa, 1900px window): layoutxml
 * widths 300/100/100/150/150 rendered as 585/195/195/293/293 — every column scaled by the SAME
 * factor (~1.95) to fill the grid. Fluent v9's own `autoFitColumns` does something else: it
 * hands ALL spare width to the last column (`adjustColumnWidthsToFitContainer`).
 *
 * Framework-agnostic (no React / Fluent — src/core/** lint guard).
 */

/**
 * Scale `bases` up by one common factor so they sum to `available`. Never shrinks a column:
 * when the columns already need `available` or more, the bases come back unchanged (the grid
 * scrolls horizontally, as the stock grid does). Widths are rounded, and the last column
 * absorbs the rounding remainder so the total is exactly `available` (no stray scrollbar).
 * `available <= 0` (not measured yet — SSR, jsdom, first paint) → the bases, unchanged.
 */
export function fillColumnWidths(bases: ReadonlyArray<number>, available: number): number[] {
  const out = [...bases];
  if (out.length === 0 || !(available > 0)) return out;
  const sum = out.reduce((s, b) => s + b, 0);
  if (!(sum > 0) || available <= sum) return out;
  const f = available / sum;
  for (let i = 0; i < out.length; i++) out[i] = Math.round(out[i] * f);
  out[out.length - 1] += available - out.reduce((s, w) => s + w, 0);
  return out;
}
