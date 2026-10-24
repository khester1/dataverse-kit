// The Dynamics CE brand ramp for Fluent UI v9 — THE single declaration.
//
// ★ This package exists because this ramp, and the three builders beside it in ./theme,
//   were declared TWICE: packages/surface-kit/src/v9/theme.ts and
//   packages/grid-kit/src/v9/theme.ts, byte-identical across all 16 slots, each with a
//   docstring asserting it was the canonical one. grid-kit's copy even explained itself
//   ("grid-kit does not depend on @dataverse-kit/design-tokens, so the triad is inlined
//   here") — which is exactly the shape .claude/rules/verification-lessons.md §4 warns
//   about: a fix applied to one of N copies leaves the other N-1 actively defended by
//   their own comments.
//
// ★ It is NOT in @dataverse-kit/design-tokens, which would otherwise be the obvious home,
//   because the builders in ./theme need `createLightTheme` from @fluentui/react-components
//   and design-tokens is zero-dependency by rule (its tsconfig pins `"paths": {}`). Moving
//   the ramp alone would have de-duplicated one export of four and left the other three
//   duplicated — so the ramp and its builders travel together, here.
import { colors } from '@dataverse-kit/design-tokens';

/**
 * The Fluent web brand ramp (a blue family that already matches Dynamics CE), with the
 * three most-visible shades pinned to the canonical design-tokens brand triad so the v9
 * brand colours come from the same source as the v8 skins'.
 *
 * ★ `BrandVariants` is a structural `Record<Brands, string>` with sixteen required
 *   numeric-literal keys (10…160) — no nominal branding. It is typed here by inference
 *   rather than as `Record<number, string>`: an index signature does NOT satisfy those
 *   sixteen required properties, so that annotation would fail at every `createLightTheme`
 *   call site. `theme.ts` asserts the assignability for real.
 */
export const dynamicsBrandRamp = {
  10: '#061724',
  20: '#082338',
  30: '#0a2e4a',
  40: '#0c3b5e',
  50: '#0e4775',
  60: colors.brandDark, // #005a9e — colorBrandBackgroundPressed
  70: colors.brandHover, // #106ebe — colorBrandBackground(Hover/Selected)
  80: colors.brand, // #0078d4 — colorBrandBackground + colorBrandForeground1 (the Dynamics blue)
  90: '#2886de',
  100: '#479ef5',
  110: '#62abf5',
  120: '#77b7f7',
  130: '#96c6fa',
  140: '#b4d6fa',
  150: '#cfe4fa',
  160: '#ebf3fc',
} as const;
