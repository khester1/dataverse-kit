# @dataverse-kit/fluent-theme

## 0.3.2

### Patch Changes

- Updated dependencies [f7b2fad]
- Updated dependencies [392b0e2]
  - @dataverse-kit/design-tokens@0.4.0

## 0.3.1

### Patch Changes

- Updated dependencies [70cb582]
  - @dataverse-kit/design-tokens@0.3.0

## 0.3.0

### Minor Changes

- db23448: CE form parity tokens, measured from a live Dynamics 365 org.
  - **design-tokens:** new `ceForm` group covering the measured layout of a Dynamics CE model-driven
    form in the UCI "new look". It includes the command bar card, record header (header fields, form
    switcher menu), tab strip, tab-body columns (340px floor), section cards and field rows (184px
    label column, 48/72px row pitch, 32px inputs). It also has `fluentTokens`, the Fluent v9 token
    that each measured colour, shadow and radius equals. The existing tokens are unchanged.
  - **fluent-theme:** new `createDynamicsCeTheme()` and `dynamicsCeTheme`. Measurement showed that
    every colour, shadow and radius of the new look is an unmodified Fluent 2 `webLightTheme` token,
    **including the brand** (`#0f6cbd`, with links in `#115ea3`), rather than the classic Dynamics
    `#0078d4` that `createDynamicsV9Theme` pins. That theme is unchanged. Typography is not fully
    stock (tabs are 16/28), so those values live in `ceForm`. There is no dark CE theme yet, because
    no dark capture exists.
  - **export-engine:** re-vendors design-tokens (adds `ceForm`; no generated-code behaviour change).

### Patch Changes

- Updated dependencies [a205df0]
- Updated dependencies [db23448]
- Updated dependencies [356bcbd]
  - @dataverse-kit/design-tokens@0.2.0

## 0.2.0

### Minor Changes

- fb385e7: New package `@dataverse-kit/fluent-theme` — the Dynamics CE Fluent v9 theme, declared
  once.

  The `dynamicsBrandRamp` `BrandVariants` ramp and the `createDynamicsV9Theme` /
  `createDynamicsV9DarkTheme` / `dynamicsV9Theme` builders were declared **twice**, byte-identical
  across all sixteen slots, in `surface-kit/src/v9/theme.ts` and `grid-kit/src/v9/theme.ts` — each
  with a docstring asserting it was the canonical one. Both are now thin re-exports of the single
  declaration, so eight declarations become four and a rebrand is a one-file change.

  It is a package rather than an addition to `@dataverse-kit/design-tokens` because the builders
  need `createLightTheme` from `@fluentui/react-components`, and design-tokens is zero-dependency by
  rule. Moving the ramp alone would have de-duplicated one export of four.

  No public API change: both packages export the same four symbols from the same paths, plus
  `dynamicsV9DarkTheme`, which previously existed only in surface-kit's copy as an unexported
  builder result.
