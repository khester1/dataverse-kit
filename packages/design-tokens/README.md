# @dataverse-kit/design-tokens

The **single canonical source** of the Dynamics 365 design tokens — `colors`, `spacing`,
`typography`, `radius`, and `layout`. Pure-TypeScript, **zero dependencies** (no React, no
Fluent), so it is safe to import from any layer or framework-agnostic code.

This package exists to end the token drift: the same hex/spacing values were previously
re-declared in `@dataverse-kit/surface-kit`, `@khester/reusable-components`, and 10+ client
projects. Those packages now re-export from here; new code (and client projects) should
import the values directly.

## Install

```bash
npm install @dataverse-kit/design-tokens
```

## Usage

```ts
import { colors, spacing, typography, radius, layout } from '@dataverse-kit/design-tokens';

const styles = {
  border: `1px solid ${colors.borderNeutral}`,
  borderRadius: radius.card,
  padding: spacing.md,
  fontFamily: typography.fontFamily,
  color: colors.textPrimary,
};
```

## Exports

| Export | Shape |
|--------|-------|
| `colors` | brand / neutral / text / surface / canvas / field fills + borders (Dynamics CE palette) |
| `spacing` | `xs`…`xxl` (px scale) |
| `typography` | Segoe UI font stacks + `fontSize` + `fontWeight` |
| `radius` | `card` / `lg` corner radii |
| `layout` | `labelColWidth` (the "Label : input" field-row label column) |

All values are `as const`, so consumers keep the literal types (e.g. `typeof colors.brand`
is `'#0078d4'`).

> Note: `@khester/dynamics-utils` ships a separate, legacy spacing scale (`xs/s/m/l/xl`);
> it is intentionally **not** unified into this package.
