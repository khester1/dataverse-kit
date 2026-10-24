import { describe, it, expect } from 'vitest';
import { fillColumnWidths } from '../core/columnFill';

describe('fillColumnWidths — the stock grid rule', () => {
  it('reproduces the MEASURED stock reading (My Active Accounts, 2026-09-29)', () => {
    // layoutxml 300/100/100/150/150 rendered as 585/195/195/293/293 in 1561px of columns.
    expect(fillColumnWidths([300, 100, 100, 150, 150], 1561)).toEqual([585, 195, 195, 293, 293]);
  });

  it('one common factor — NOT all spare width to the last column (Fluent auto-fit)', () => {
    const out = fillColumnWidths([100, 200], 600);
    expect(out).toEqual([200, 400]);
    expect(out[0] / 100).toBe(out[1] / 200);
  });

  it('sums EXACTLY to the available width (the last column takes the rounding remainder)', () => {
    const out = fillColumnWidths([97, 131, 53], 1000);
    expect(out.reduce((s, w) => s + w, 0)).toBe(1000);
  });

  it('never shrinks: columns that already need the space keep their widths (the grid scrolls)', () => {
    expect(fillColumnWidths([300, 300], 500)).toEqual([300, 300]);
    expect(fillColumnWidths([300, 300], 600)).toEqual([300, 300]);
  });

  it('unmeasured (0 / negative) or empty input is returned unchanged', () => {
    expect(fillColumnWidths([120, 80], 0)).toEqual([120, 80]);
    expect(fillColumnWidths([120, 80], -5)).toEqual([120, 80]);
    expect(fillColumnWidths([], 900)).toEqual([]);
  });
});
