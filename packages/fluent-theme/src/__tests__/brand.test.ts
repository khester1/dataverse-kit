import { describe, it, expect } from 'vitest';
import { colors } from '@dataverse-kit/design-tokens';
import { dynamicsBrandRamp } from '../brand';
import { createDynamicsV9Theme, createDynamicsV9DarkTheme, dynamicsV9Theme } from '../theme';

// ★ A GOLDEN LITERAL, not an identity check.
//
// The obvious test after de-duplicating — `expect(surfaceKit.ramp).toBe(fluentTheme.ramp)` —
// cannot fail for the right reason: post-fix both operands ARE the same object, so editing
// a hex moves both sides together and the assertion stays green. That is
// verification-lessons.md §3, "a test whose oracle is the implementation's oracle".
//
// So the expected values are written out again, deliberately, as a second copy. Changing a
// hex in ../brand.ts now requires changing it here too, which is the point: the second copy
// is the oracle.
const GOLDEN = {
  10: '#061724',
  20: '#082338',
  30: '#0a2e4a',
  40: '#0c3b5e',
  50: '#0e4775',
  60: '#005a9e',
  70: '#106ebe',
  80: '#0078d4',
  90: '#2886de',
  100: '#479ef5',
  110: '#62abf5',
  120: '#77b7f7',
  130: '#96c6fa',
  140: '#b4d6fa',
  150: '#cfe4fa',
  160: '#ebf3fc',
} as const;

describe('dynamicsBrandRamp', () => {
  it('has all sixteen BrandVariants slots', () => {
    // Non-vacuity precheck: assert the shape is the size we expect BEFORE asserting over it.
    // An assertion over a 3-key object would otherwise "pass" on a truncated ramp.
    expect(Object.keys(dynamicsBrandRamp)).toHaveLength(16);
  });

  it('matches the pinned golden values', () => {
    expect(dynamicsBrandRamp).toEqual(GOLDEN);
  });

  it('pins 60/70/80 to the canonical design-tokens brand triad', () => {
    // The RELATIONSHIP claim, distinct from the values claim above: these three slots must
    // track design-tokens rather than being independently authored. If design-tokens rebrands,
    // this test stays green and the golden test goes red — which is the correct signal pair.
    expect(dynamicsBrandRamp[60]).toBe(colors.brandDark);
    expect(dynamicsBrandRamp[70]).toBe(colors.brandHover);
    expect(dynamicsBrandRamp[80]).toBe(colors.brand);
  });
});

describe('theme builders', () => {
  it('carries the Dynamics blue through to the built theme', () => {
    // ★ Proves the ramp is actually FETCHED, not merely declared. A builder that ignored its
    // brand argument and returned stock webLightTheme would pass any "a theme is returned"
    // check; only reading the mapped token separates the two.
    expect(dynamicsV9Theme.colorBrandBackground).toBe(colors.brand);
  });

  it('honours a caller-supplied brand ramp', () => {
    // The row where the default and the real value MUST differ — a builder that ignored its
    // argument would return the Dynamics blue here and look correct.
    const custom = { ...dynamicsBrandRamp, 80: '#ff0000' };
    expect(createDynamicsV9Theme(custom).colorBrandBackground).toBe('#ff0000');
    expect(createDynamicsV9Theme(custom).colorBrandBackground).not.toBe(colors.brand);
  });

  it('produces a dark theme that differs from the light one', () => {
    const light = createDynamicsV9Theme();
    const dark = createDynamicsV9DarkTheme();
    expect(dark.colorNeutralBackground1).not.toBe(light.colorNeutralBackground1);
  });
});
