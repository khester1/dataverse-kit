// @dataverse-kit/surface-kit/v9 — the Fluent UI v9 skin of the Dynamics surfaces.
//
// The same containers + overlays as the default (v8) `.` entry, re-skinned over
// @fluentui/react-components. It SHARES the framework-agnostic layers with the v8 skin —
// the pure-TS sizing scalars (../core), the responsive breakpoint builders (../responsive),
// the design-token palette (../tokens), the density scale, and the React `useDensity`
// context/hook (../hooks) are imported, never forked. Only the container/overlay component
// bodies + the v9 prop contract (./types) + the v9 theme (./theme) are v9-specific.
//
// Usage:
//   import { FluentProvider } from '@fluentui/react-components';
//   import { FormSurface, createDynamicsV9Theme } from '@dataverse-kit/surface-kit/v9';
//   <FluentProvider theme={createDynamicsV9Theme()}><FormSurface>…</FormSurface></FluentProvider>

// Shared framework-agnostic layers (re-exported so a v9-only consumer gets sizing scalars,
// breakpoints, columns, and the density scale without also importing the v8 barrel).
export * from '../core';
export * from '../responsive';
export { colors, spacing, typography, radius, layout, ceForm } from '../tokens';
export { type Density, densityScale, scaleSpacing } from '../tokens/density';
export {
  useContainerSize,
  type ContainerSize,
  useContainerWidth,
  useContainerBreakpoint,
  useResponsiveValue,
  useMediaQuery,
  DensityContext,
  useDensity,
} from '../hooks';
// The look cascade is v9-only (no v8 component reads it), so it is NOT on the root barrel: with
// tsup `splitting: false` a second copy there would be a different context that silently never
// reaches v9 rows.
export { LookContext, useLook } from '../hooks/useLook';

// v9-specific: prop contract, theme, and surfaces.
export * from './types';
export * from './theme';
export * from './containers';
export * from './layouts';
export * from './overlays';
