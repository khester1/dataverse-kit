import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderHook } from '@testing-library/react';
import { scaleSpacing } from '../../tokens/density';
import { DensityContext, useDensity } from '../useDensity';

describe('density', () => {
  it('scaleSpacing: comfortable is identity, compact scales by 0.75 (rounded)', () => {
    // comfortable is x1 — this is what keeps an unset/comfortable density byte-identical.
    expect(scaleSpacing(20, 'comfortable')).toBe(20);
    expect(scaleSpacing(7, 'comfortable')).toBe(7);
    // compact x0.75, rounded (FormSurface gap/padding 20→15; Section body gap 7→5, pad 3→2).
    expect(scaleSpacing(20, 'compact')).toBe(15);
    expect(scaleSpacing(7, 'compact')).toBe(5);
    expect(scaleSpacing(3, 'compact')).toBe(2);
  });

  it('useDensity defaults to comfortable outside a provider', () => {
    const { result } = renderHook(() => useDensity());
    expect(result.current).toBe('comfortable');
  });

  it('useDensity reads the nearest DensityContext provider (FormSurface cascade)', () => {
    const { result } = renderHook(() => useDensity(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <DensityContext.Provider value="compact">{children}</DensityContext.Provider>
      ),
    });
    expect(result.current).toBe('compact');
  });
});
