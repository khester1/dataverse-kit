# @dataverse-kit/fluent-theme

The Dynamics CE **Fluent UI v9** theme, declared once.

```bash
npm install @dataverse-kit/fluent-theme @fluentui/react-components
```

```tsx
import { FluentProvider } from '@fluentui/react-components';
import { createDynamicsV9Theme } from '@dataverse-kit/fluent-theme';

<FluentProvider theme={createDynamicsV9Theme()}>{children}</FluentProvider>;
```

## Exports

| Export | What |
|---|---|
| `dynamicsBrandRamp` | The 16-slot `BrandVariants` ramp. Slots 60/70/80 are pinned to `@dataverse-kit/design-tokens`' brand triad (`#005a9e` / `#106ebe` / `#0078d4`), so the v9 brand colours come from the same source as the v8 skins'. |
| `createDynamicsV9Theme(brand?)` | Light theme. Pass your own `BrandVariants` to rebrand. |
| `createDynamicsV9DarkTheme(brand?)` | Dark theme, same ramp. |
| `dynamicsV9Theme` / `dynamicsV9DarkTheme` | Memoized module singletons. |
| `createDynamicsCeTheme()` / `dynamicsCeTheme` | The Dynamics CE model-driven **new look**. Measured on a live org: every form colour, shadow and radius, *including the brand* (`#0f6cbd`, with links in `#115ea3`), is an unmodified `webLightTheme` token (typography is not fully stock; see design-tokens `ceForm`). Use this when a surface must look identical to a current Dynamics form, and the V9 theme above when it must match the classic `#0078d4`. Returns a copy. Evidence: `apps/ce-parity/reference/`. |

## Why this is a package

The ramp and the three builders were declared **twice** — `surface-kit/src/v9/theme.ts` and
`grid-kit/src/v9/theme.ts`, byte-identical across all sixteen slots, each with a docstring
asserting it was the canonical one. Both are now thin re-exports of this package.

It is not part of `@dataverse-kit/design-tokens` because the builders need `createLightTheme`
from `@fluentui/react-components`, and design-tokens is zero-dependency by rule. Moving only the
ramp there would have de-duplicated one export of four and left the other three duplicated.

`src/__tests__/singleDeclaration.test.ts` is the gate that keeps this true: a source scan over
`packages/*/src` asserting the ramp is declared exactly once. It runs in CI.

## Consumers

`@dataverse-kit/grid-kit/v9` · `@dataverse-kit/surface-kit/v9` — both re-export all four symbols,
so existing imports from those packages are unchanged.
