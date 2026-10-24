import { describe, it, expect } from 'vitest';
import { resolveBreakpoint, resolveResponsiveValue, BREAKPOINTS, CARD_REFLOW_WIDTH } from '../breakpoints';

describe('resolveBreakpoint', () => {
  it('maps width to the largest breakpoint at/below it', () => {
    expect(resolveBreakpoint(0)).toBe('xs');
    expect(resolveBreakpoint(479)).toBe('xs');
    expect(resolveBreakpoint(480)).toBe('sm');
    expect(resolveBreakpoint(767)).toBe('sm');
    expect(resolveBreakpoint(768)).toBe('md');
    expect(resolveBreakpoint(1024)).toBe('lg');
    expect(resolveBreakpoint(1400)).toBe('xl');
  });
  it('keeps the codegen-aligned cutoffs', () => {
    expect(BREAKPOINTS.sm).toBe(480);
    expect(BREAKPOINTS.md).toBe(768);
    expect(CARD_REFLOW_WIDTH).toBe(900);
  });
});

describe('resolveResponsiveValue', () => {
  it('returns a scalar value unchanged', () => {
    expect(resolveResponsiveValue(3, 'md')).toBe(3);
  });
  it('cascades mobile-first to the nearest defined value at/below the breakpoint', () => {
    expect(resolveResponsiveValue({ xs: 1, md: 2, lg: 3 }, 'md')).toBe(2);
    expect(resolveResponsiveValue({ xs: 1, md: 2, lg: 3 }, 'sm')).toBe(1);
    expect(resolveResponsiveValue({ md: 2 }, 'xl')).toBe(2);
  });
  it('cascades up when nothing smaller is defined', () => {
    expect(resolveResponsiveValue({ lg: 4 }, 'xs')).toBe(4);
  });
  it('treats an empty object as a scalar passthrough (no breakpoint keys)', () => {
    const empty = {} as Record<string, never>;
    expect(resolveResponsiveValue(empty, 'md')).toBe(empty);
  });
});
