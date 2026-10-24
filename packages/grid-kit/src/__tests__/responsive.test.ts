// Pure-logic tests for the grid-kit responsive primitives. grid-kit runs vitest in
// the `node` env (no jsdom — and jsdom does no layout, so a ResizeObserver-driven
// render test would report width 0 regardless). The width-driven HOST behavior
// (FocusedViewGrid stacking) is verified visually in Storybook; here we pin the
// pure predicates the hosts derive their layout from.
import { describe, it, expect } from 'vitest';
import { deriveIsNarrow, resolveBreakpoint, GRID_BREAKPOINTS, CARD_REFLOW_WIDTH, shedColumns } from '../core/responsive';

/** Build minimal sheddable columns: {key, responsivePriority?, aggregate?}. */
function makeCols(...defs: Array<{ key: string; p?: number; agg?: boolean }>) {
  return defs.map((d) => ({ key: d.key, responsivePriority: d.p, aggregate: d.agg ? 'sum' : undefined }));
}

describe('grid-kit responsive primitives (pure)', () => {
  describe('deriveIsNarrow', () => {
    it('treats width 0 (SSR / first paint / no-DOM) as NOT narrow → wide default, no flash-to-stacked', () => {
      expect(deriveIsNarrow(0)).toBe(false);
    });
    it('is narrow strictly below md (768)', () => {
      expect(deriveIsNarrow(1)).toBe(true);
      expect(deriveIsNarrow(360)).toBe(true);
      expect(deriveIsNarrow(767)).toBe(true);
    });
    it('is NOT narrow at or above md (768)', () => {
      expect(deriveIsNarrow(768)).toBe(false);
      expect(deriveIsNarrow(1024)).toBe(false);
    });
    it('treats a negative/garbage width as NOT narrow', () => {
      expect(deriveIsNarrow(-100)).toBe(false);
    });
  });

  describe('resolveBreakpoint', () => {
    it('maps a width to the largest breakpoint whose min-width is <= width', () => {
      expect(resolveBreakpoint(0)).toBe('xs');
      expect(resolveBreakpoint(479)).toBe('xs');
      expect(resolveBreakpoint(480)).toBe('sm');
      expect(resolveBreakpoint(767)).toBe('sm');
      expect(resolveBreakpoint(768)).toBe('md');
      expect(resolveBreakpoint(1024)).toBe('lg');
      expect(resolveBreakpoint(1366)).toBe('xl');
      expect(resolveBreakpoint(99999)).toBe('xl');
    });
  });

  it('breakpoint numbers match surface-kit (visual consistency: sm 480 / md 768 / card-reflow 900)', () => {
    expect(GRID_BREAKPOINTS.sm).toBe(480);
    expect(GRID_BREAKPOINTS.md).toBe(768);
    expect(CARD_REFLOW_WIDTH).toBe(900);
  });

  describe('shedColumns', () => {
    it('returns the input BY IDENTITY at width 0 (first paint / no-DOM) — memo-stable, no flash', () => {
      const c = makeCols({ key: 'a', p: 10 }, { key: 'b', p: 90 });
      expect(shedColumns(c, 0)).toBe(c);
    });

    it('returns identity at/above the md breakpoint (768)', () => {
      const c = makeCols({ key: 'a', p: 10 }, { key: 'b', p: 90 });
      expect(shedColumns(c, 768)).toBe(c);
      expect(shedColumns(c, 2000)).toBe(c);
    });

    it('returns identity (opt-out) when NO column declares responsivePriority, even when narrow', () => {
      const c = makeCols({ key: 'a' }, { key: 'b' }, { key: 'c' }, { key: 'd' }, { key: 'e' });
      expect(shedColumns(c, 300)).toBe(c);
    });

    it('returns identity when everything fits the width budget (no real shedding)', () => {
      // width 600 (< md, opted-in) but budget floor(600/140)=4 >= 2 columns → identity.
      const c = makeCols({ key: 'a', p: 100 }, { key: 'b', p: 50 });
      expect(shedColumns(c, 600)).toBe(c);
    });

    it('sheds the lowest-priority columns below md, preserving original order', () => {
      // width 300, minColumnWidth 140 → budget floor(300/140)=2 → keep the 2 highest priorities.
      const c = makeCols({ key: 'a', p: 100 }, { key: 'b', p: 10 }, { key: 'c', p: 50 }, { key: 'd', p: 90 });
      expect(shedColumns(c, 300).map((x) => x.key)).toEqual(['a', 'd']);
    });

    it('NEVER sheds an aggregate column (footer-cell protection)', () => {
      const c = makeCols({ key: 'a', p: 100 }, { key: 'tot', agg: true }, { key: 'b', p: 5 }, { key: 'c', p: 5 });
      const out = shedColumns(c, 320).map((x) => x.key); // budget 2: protected 'tot' + top-1 sheddable 'a'
      expect(out).toContain('tot');
      expect(out).toContain('a');
    });

    it('NEVER sheds a `__`-prefixed control column (chevron / nested trigger)', () => {
      const c = makeCols({ key: '__nested' }, { key: 'a', p: 100 }, { key: 'b', p: 1 });
      const out = shedColumns(c, 320).map((x) => x.key); // budget 2: '__nested' + 'a'; 'b' shed
      expect(out).toContain('__nested');
      expect(out).toContain('a');
      expect(out).not.toContain('b');
    });

    it('breaks priority ties by original column order', () => {
      const c = makeCols({ key: 'a', p: 50 }, { key: 'b', p: 50 }, { key: 'c', p: 50 });
      expect(shedColumns(c, 200).map((x) => x.key)).toEqual(['a']); // budget 1, tie → first
    });
  });
});
