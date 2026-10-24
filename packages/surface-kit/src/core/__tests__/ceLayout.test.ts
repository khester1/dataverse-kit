import { describe, it, expect } from 'vitest';
import {
  resolveTabColumnWidths,
  normalizeColumnShares,
  CE_TAB_COLUMN_MIN_WIDTH,
  CE_LABEL_ABOVE_BELOW_ROW_WIDTH,
} from '../ceLayout';

// ★ GOLDEN VALUES MEASURED on a live Dynamics org (dynamics-ui-kit apps/ce-parity/reference/captures,
//   2026-09-29): the rendered column widths of the stock Account form's tabs. They are the oracle —
//   written out here, not computed — so a wrong rule cannot agree with itself.
//   `available` = tab panel width − 2 (right pad) − 8 (left inset) − 16 × (columns − 1).
const MEASURED: Array<{ shares: number[]; available: number; widths: number[]; note: string }> = [
  { shares: [33, 42, 25], available: 1450, widths: [478.5, 609, 362.5], note: 'Summary @1710 — no column clamped' },
  { shares: [33, 42, 25], available: 1240, widths: [396, 504, 340], note: 'Summary @1500 — the 25% column hits the floor' },
  { shares: [33, 42, 25], available: 1106, widths: [340, 426, 340], note: 'Summary @1366 — BOTH side columns hit the floor' },
  { shares: [34, 33, 33], available: 1450, widths: [493, 478.5, 478.5], note: 'Details @1710' },
];

describe('resolveTabColumnWidths — the measured Dynamics rule', () => {
  it('has four measured layouts to check (non-vacuous)', () => {
    expect(MEASURED).toHaveLength(4);
  });

  for (const m of MEASURED) {
    it(`reproduces ${m.note}`, () => {
      const got = resolveTabColumnWidths(m.shares, m.available).map((w) => Math.round(w * 10) / 10);
      expect(got).toEqual(m.widths);
    });
  }

  it('the 1366 case needs a SECOND clamping pass (a single-pass rule gives 337 for column 1)', () => {
    // The row where a naive "clamp once, then split" and the real rule must differ.
    const [first] = resolveTabColumnWidths([33, 42, 25], 1106);
    expect(first).toBe(340);
  });

  it('defaults the floor to the measured 340', () => {
    expect(CE_TAB_COLUMN_MIN_WIDTH).toBe(340);
  });

  it('with every column at the floor, returns the floors (overflow is the caller\'s to wrap)', () => {
    expect(resolveTabColumnWidths([33, 42, 25], 600)).toEqual([340, 340, 340]);
  });

  it('empty and degenerate inputs are normalised (and TabColumns renders the same normalised shares)', () => {
    expect(resolveTabColumnWidths([], 1000)).toEqual([]);
    expect(resolveTabColumnWidths([0, 0], 1000)).toEqual([500, 500]);
    // A share sum below 1 is not "leave space unused" (raw CSS would give 340/340): shares are ratios.
    expect(resolveTabColumnWidths([0.3, 0.3], 1000)).toEqual([500, 500]);
    expect(resolveTabColumnWidths([0.33, 0.42, 0.25], 1450).map((w) => Math.round(w * 10) / 10)).toEqual([478.5, 609, 362.5]);
  });
});

describe('normalizeColumnShares', () => {
  it('scales to 100, zeroes bad values, and makes all-zero equal', () => {
    expect(normalizeColumnShares([33, 42, 25])).toEqual([33, 42, 25]);
    expect(normalizeColumnShares([1, 3])).toEqual([25, 75]);
    expect(normalizeColumnShares([-5, Number.NaN, 10])).toEqual([0, 0, 100]);
    expect(normalizeColumnShares([0, 0])).toEqual([50, 50]);
  });
});

describe('CE_LABEL_ABOVE_BELOW_ROW_WIDTH', () => {
  it('lies inside the MEASURED bracket: beside at a 362px row, above at a 306px row', () => {
    // Provisional point value; the bracket is what was observed.
    expect(CE_LABEL_ABOVE_BELOW_ROW_WIDTH).toBeGreaterThan(306);
    expect(CE_LABEL_ABOVE_BELOW_ROW_WIDTH).toBeLessThanOrEqual(362);
  });
});
