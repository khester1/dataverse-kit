# @dataverse-kit/surface-kit

Responsive form shells, containers, sections, and overlay surfaces for Dynamics 365, built on Fluent UI v8 to match Dynamics CE.

## What it does

surface-kit is the shared surface/layout layer for Dynamics 365 React apps. It provides the form canvas (`FormSurface`), positioned card sections (`Section`, `SectionCard`), responsive layouts (`ColumnLayout`, `TwoColumnLayout`, `FieldRow`), chrome (`FormHeader`, `CommandSurface`, `ActionBar`, `PivotSurface`, `Footer`), and overlay surfaces (`FormDialogSurface`, `ModalSurface`, `PanelSurface`, `CalloutSurface`, `TooltipSurface`) — all styled to match Dynamics CE and to host grid-kit grids. Every responsive stacking decision flows through shared breakpoints, so viewport (`@media`) and container (PCF `allocatedWidth`) layouts behave identically. The `./core` (pure sizing scalars) and `./responsive` (pure breakpoint/style builders) subpaths are framework-agnostic — no React or Fluent — and are inlined by the export-engine codegen at zero React cost.

## When to use it

Reach for surface-kit when you need the **form shell** — the page canvas, sections, tabs, command bars, and dialog/panel/modal/callout overlays that wrap your content. For the data **grids** that sit inside those sections, use `@dataverse-kit/grid-kit` instead (surface-kit containers just render `children`; you pass the grid in). For one-off custom-page business controls, use `reusable-components`. surface-kit is the responsive, Dynamics-CE-matching chrome around everything else.

## Install

```bash
npm install @dataverse-kit/surface-kit
```

Requires React 18 and Fluent UI v8 as peer dependencies: `react`, `react-dom`, and `@fluentui/react` (^8.115.6).

## Minimal example

```tsx
import { FormSurface, Section, TwoColumnLayout } from '@dataverse-kit/surface-kit';
import { TextField } from '@fluentui/react';

export function AccountForm() {
  return (
    <FormSurface columns={12} maxWidth={1200}>
      <Section title="Account Information" columnSpan={12} collapsible>
        <TwoColumnLayout>
          <TextField label="Account Name" />
          <TextField label="Phone" />
        </TwoColumnLayout>
      </Section>

      <Section title="Address" columnSpan={6} variant="flat">
        <TextField label="City" />
      </Section>
    </FormSurface>
  );
}
```

## Key exports

| Export | Purpose |
|--------|---------|
| `FormSurface` | The N-column form canvas that hosts Sections; stacks to one column below a breakpoint (viewport or PCF container width). |
| `Section` / `SectionCard` | Dynamics-CE form section — a grid-positioned card with header, optional command bar, and an internal field grid; supports `card`/`flat`/`placeholder` variants and collapse. |
| `TwoColumnLayout` / `ColumnLayout` / `FieldRow` | Responsive field layouts that collapse to a single column below `collapseBelow`. |
| `FormDialogSurface` / `ModalSurface` / `PanelSurface` / `CalloutSurface` / `TooltipSurface` | Fluent v8 overlay surfaces sized to match the Dynamics CE / codegen presets. |
| `FormHeader` / `CommandSurface` / `ActionBar` / `PivotSurface` / `Footer` | Form chrome — header, command bars, tabs, and footer. |
| `MasterDetailSurface` / `DashboardSurface` | Composite multi-pane surfaces. |
| `fromFormDefinition` | Adapter that builds a surface tree from a (duck-typed) form definition. |
| `createDynamicsTheme` | Canonical Dynamics token theme factory. |
| `./core`, `./responsive` (subpaths) | Pure-TS sizing scalars and breakpoint/style builders — framework-agnostic, shared with the export-engine codegen. |
| `./v9`: `CommandSurface look="ce"` | The Dynamics command bar card: back / pop-out, abutting commands (16px icons), menu and split commands, ⋮ overflow, outlined far items (Share). Every command within 0.2px of the org. Pass 16px icons for commands, 20px for far items; overflow folding is explicit (`overflowItems`). |
| `./v9`: `FormHeader` + `PivotSurface look="ce"` | The Dynamics record header (avatar, title + status, entity · form switcher, header fields, owner, expand) inside the header card with the tab strip; the selected tab's content renders below the card. `PivotSurface`'s ce look is opt-in (`look="ce"`), and it needs a width-constrained parent (`minWidth: 0` on a grid/flex item) so a long header truncates inside the card. Measured against the org to 0.1px at full width. |
| `./v9`: `FieldRow`, `TabColumns`, `FormSurface look="ce"` | Fluent v9 layouts for forms that look identical to Dynamics CE. Under `look="ce"` they follow the model-driven form measured on a live org: 184px label column, 44/48px rows, the label moving above the control on narrow rows, and tab columns by declared share with a 340px floor. Pair with `dynamicsCeTheme` and stock Fluent controls using `appearance="filled-darker"`. Evidence: `apps/ce-parity/reference/`. |

### Dynamics-identical form (v9)

```tsx
import { FluentProvider, Input } from '@fluentui/react-components';
import { FormSurface, TabColumns, Section, FieldRow, dynamicsCeTheme } from '@dataverse-kit/surface-kit/v9';

<FluentProvider theme={dynamicsCeTheme}>
  <FormSurface look="ce">
    <TabColumns widths={[33, 42, 25]}>
      <Section title="ACCOUNT INFORMATION">
        <FieldRow label="Account Name" htmlFor="name" required>
          <Input id="name" appearance="filled-darker" placeholder="---" />
        </FieldRow>
      </Section>
      <Section>{/* … */}</Section>
      <Section>{/* … */}</Section>
    </TabColumns>
  </FormSurface>
</FluentProvider>
```

> Put `FieldRow`s in a `Section`: under `look="ce"` it is the measured Dynamics section (shadow4
> card, 8px radius, title as given, gap-free body that pulls rows up so the first sits at 8px). For a
> multi-column section pass `internalColumns={2}` and one child per column (equal columns, 21px
> gutter). Verified against the org in a real browser: `apps/ce-parity` *Tab layouts* stories.

> See [`CLAUDE.md`](./CLAUDE.md) for the full architecture / contributor reference.
