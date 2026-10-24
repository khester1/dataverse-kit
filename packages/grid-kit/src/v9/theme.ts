// The Dynamics CE Fluent v9 theme now lives in ONE place: @dataverse-kit/fluent-theme.
//
// ★ This file used to DECLARE the ramp and the three builders. So did grid-kit's copy
//   (or surface-kit's — whichever you are not reading), byte-identical across all sixteen
//   slots, each with a docstring claiming to be canonical. That is verification-lessons.md
//   §4 exactly: "a fix applied to one of N copies leaves the other N-1 actively defended by
//   their own docstrings." Both are now re-exports of the single declaration.
//
// ★ Kept as a module rather than deleted so the ten internal `./theme` / `../theme` import
//   sites (stories, tests, the v9 barrel) and this package's public API are unchanged.
export {
  dynamicsBrandRamp,
  createDynamicsV9Theme,
  createDynamicsV9DarkTheme,
  dynamicsV9Theme,
  dynamicsV9DarkTheme,
} from '@dataverse-kit/fluent-theme';
