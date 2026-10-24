import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMediaQuery } from '../useMediaQuery';
import { useContainerBreakpoint } from '../useContainerBreakpoint';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useMediaQuery', () => {
  it('returns false when matchMedia is unavailable (SSR / jsdom default)', () => {
    // jsdom does not implement matchMedia; the hook must guard and return false.
    vi.stubGlobal('matchMedia', undefined);
    const { result } = renderHook(() => useMediaQuery('(max-width: 600px)'));
    expect(result.current).toBe(false);
  });

  it('reflects the matchMedia match state', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((q: string) => ({
        matches: q.includes('600'),
        media: q,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
    const { result } = renderHook(() => useMediaQuery('(max-width: 600px)'));
    expect(result.current).toBe(true);
  });
});

describe('useContainerBreakpoint', () => {
  it('starts at xs / width 0 before the ResizeObserver reports (no layout in jsdom)', () => {
    const { result } = renderHook(() => useContainerBreakpoint());
    const [ref, breakpoint, width] = result.current;
    expect(ref).toBeDefined();
    expect(width).toBe(0);
    expect(breakpoint).toBe('xs');
  });
});
