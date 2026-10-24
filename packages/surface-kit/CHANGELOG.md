# @dataverse-kit/surface-kit

## 0.5.2

### Patch Changes

- Updated dependencies [f7b2fad]
- Updated dependencies [392b0e2]
  - @dataverse-kit/design-tokens@0.4.0
  - @dataverse-kit/fluent-theme@0.3.2

## 0.5.1

### Patch Changes

- Updated dependencies [70cb582]
  - @dataverse-kit/design-tokens@0.3.0
  - @dataverse-kit/fluent-theme@0.3.1

## 0.5.0

### Minor Changes

- a205df0: `CommandSurface look="ce"`: the Dynamics CE command bar card, measured against a live
  org.
  - **The card:** `shadow4`, 8px radius, 1474×46 at a 1710px window. It sits 8px below the page top
    with the page insets (16px left, 20px right), and it owns the 16px gap to the header card.
  - **Contents:**
    - optional back and pop-out buttons (new `onBack` / `onPopOut` props), each followed by a Fluent
      divider;
    - abutting 32px commands: a 16px icon, a 7px gap, and a 14px regular label;
    - menu commands (`menuItems`), ending in a 40px chevron zone;
    - split commands (`split` + `menuItems`), made of the main button, a divider and a 40px chevron.
      As measured, the chevron overhangs its 35px slot;
    - the 44px ⋮ overflow (`overflowItems`);
    - `farItems` as outlined 24px buttons, with a 20px icon and a chevron when they have a menu
      (Share).
  - **Built from stock Fluent parts** (`Toolbar`, `ToolbarButton`, `ToolbarDivider`, `Menu`,
    `Button`). Fluent's 1px transparent button border is compensated, so the measured widths land
    exactly.
  - **Verified in Chrome** against the org capture: every command within 0.2px, and the full page
    (command bar → header card → tab body) stacks exactly as the org does.
  - **Not modelled:** automatic folding of commands into ⋮ as the window narrows. Dynamics does this
    by an unmeasured rule; pass `overflowItems` explicitly.
  - **Opt-in:** only `look="ce"` draws the card. A `CommandSurface` inside a `FormSurface look="ce"`
    stays a plain toolbar, and `look="ce"` also works with no `FormSurface` at all.
  - **Default look:** unchanged for existing items. The new `menuItems` / `split` props work there
    too: a menu button, and a main button plus a chevron, with no measured geometry.
  - Primary commands keep Fluent's brand colours. Page padding lives in a class, so a host
    `className` can override it. The nav and far regions are labelled groups.

- 91a17c6: The Dynamics CE record header and header card, measured against a live org.
  - **`FormHeader look="ce"`** is the record header region. The look defaults to the ambient
    `FormSurface` look. It contains:
    - a 40px initials avatar in a 2px ring. It is a Fluent `Avatar color="colorful"` hashed from the
      title, which reproduces Dynamics' colour for the same record name;
    - the title (`h1`, 20/600/28) and `- {status}`;
    - `entityName · form switcher`: a Fluent `Menu` with `MenuItemRadio`. It matches the captured
      menu exactly, and its open trigger fill is the measured `#e0e0e0`;
    - value-over-label `headerFields` (`---` when empty), separated by 1×38 dividers;
    - the `owner` persona, with a 12px presence ring (`cePresenceBadgeStyle`);
    - an expand chevron.

    New props: `entityName`, `forms`, `activeFormId`, `onFormChange`, `headerFields`, `owner`,
    `onExpand`, `expanded`.

  - **`PivotSurface look="ce"`** plus a `header` slot draw the header card: `shadow4`, 8px radius,
    the header region, and the tab strip. The tabs are 45px, 20px apart, 16/28 text, reserve their
    semibold width, and have a 3px brand underline with 2px radius. The selected tab's content
    renders below the card in the tab body (16px top, 21px bottom), and card and body share the
    page's 8px left and 20px right insets.
  - **Verified in Chrome** against the org capture: every region of the header card matches within
    0.1px (title, status, switcher, fields, dividers, owner, presence, expand, all tab positions and
    widths), with the Segoe UI Web font the org loads.
  - **Accessibility:**
    - the owner link has Fluent's focus outline;
    - presence shows only when `owner.presence` is given;
    - `titleAs` lets an embedded header avoid a second `h1`;
    - the record avatar is decorative;
    - tabs are wired to their panel (`aria-controls` / `role="tabpanel"`) in both looks.
  - **Narrow widths:** the title truncates, header fields clip on one line, and tabs clip. This is
    provisional: Dynamics' own narrow behaviour is unmeasured.
  - **Default looks:** unchanged. `PivotSurface`'s ce look is opt-in, but a `FormHeader` under a
    `FormSurface look="ce"` now takes the ce look; that surface look is itself new in this release
    series.

- 7db4a10: surface-kit v9 layouts for Dynamics-identical forms, measured against a live org.
  - **`FieldRow`** (v9): the label/control row. Under `look="ce"` it follows the measured Dynamics
    row: a 184px label column, rows 8px top-padded when first in their section and 12px otherwise
    (so they pitch at 44/48px beside and 68/72px above), the required marker at the end of the label
    column, and the control inset 2px from the right. `labelPosition: 'auto'` flips the label above
    the control on a narrow row using a container query on the row itself. The switch point is
    provisional: it was measured only as between 306 and 362px. Wrap stock Fluent controls with
    `appearance="filled-darker"`, which is exactly the measured field.
  - **`TabColumns`** (v9): tab-body columns with declared shares (the formxml `33% / 42% / 25%`) and
    a 340px floor, laid out by CSS flexbox exactly as Dynamics does. Verified in a real browser: it
    reproduces the org's column widths at all three measured window sizes.
  - **`FormSurface look`** (`'default' | 'ce'`) cascades the look through a new `LookContext` /
    `useLook`, next to density. The default is unchanged.
  - **core:** `resolveTabColumnWidths()` (the same rule without a DOM), `CE_TAB_COLUMN_MIN_WIDTH`,
    `CE_LABEL_ABOVE_BELOW_ROW_WIDTH`, and the `SurfaceLook` type.
  - Re-exports `ceForm` (design-tokens) and `createDynamicsCeTheme` / `dynamicsCeTheme`
    (fluent-theme) from `./v9`.
  - **export-engine:** re-vendors surface-kit (core, hooks and the tokens re-export of `ceForm`; no
    generated-code change).

- 356bcbd: `Section look="ce"`: the measured Dynamics CE form section.
  - **surface-kit:** v9 `Section` and `SectionHeader` gain `look`, which defaults to the ambient
    `FormSurface` look. Under `'ce'`, the `card` variant draws:
    - the measured card: `shadow4`, 8px radius, padding 4/16/16/16, and a transparent 1px border;
    - the title as given, in an `<h2>` at 14/600/20 with 4px top padding and no rule. Dynamics does
      not uppercase section titles;
    - a gap-free body that pulls rows up by `ceFieldRowFirstOffset`, so the first `FieldRow` sits at
      8px.

    With `internalColumns > 1`, a CE section takes **one child per column**, as in formxml (section
    → columns → rows). The columns are equal, with a 21px gutter on every column but the last. This
    was measured on a `columns="11"` section. Verified in a real browser against the org at 1710 and
    1366px and on the two-column capture: section sizes and field positions are identical. The
    default look, and the `flat`/`placeholder` variants, are unchanged.

  - **design-tokens:** `ceForm.section.columnGutter` (21).
  - **export-engine:** re-vendors design-tokens.

### Patch Changes

- 3e9c843: `FormHeader look="ce"`: the open form switcher now matches the org with the pointer still
  on it. Before, hover's `#f5f5f5` beat the measured open fill (`#e0e0e0`), and the open text stayed
  `#424242` where the org shows `#242424` (`colorNeutralForeground1`). Found by the new ce-parity
  gate, which checks the open trigger with the pointer on it and away from it.
- 39d0864: `FormSurface look="ce"` is now a plain block, not the 12-column grid. A Dynamics form is
  page chrome stacked top to bottom (command bar, header card, tab body), and its columns belong to
  `TabColumns`. Before, a bare `<FormSurface look="ce">` put `CommandSurface` and `TabColumns` into
  one of 12 tracks and added 20px of padding. Every ce story had to pass
  `columns={1} padding={0} gap={0}` and wrap its content in a `minWidth: 0` div, and the documented
  snippets did neither.

  Under `ce`, `columns`, `gap` and `collapseBelow` are ignored, and `padding` defaults to 0. The
  default look is unchanged; a test pins both looks.

- Updated dependencies [a205df0]
- Updated dependencies [db23448]
- Updated dependencies [356bcbd]
  - @dataverse-kit/design-tokens@0.2.0
  - @dataverse-kit/fluent-theme@0.3.0

## 0.4.1

### Patch Changes

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

- Updated dependencies [fb385e7]
  - @dataverse-kit/fluent-theme@0.2.0

## 0.4.0

### Minor Changes

- 480bd5e: Surface review fixes + additive container props:
  - **Section**: `box-sizing: border-box` so a card's padding + border stay inside its `width:100%`
    — cards no longer render ~42px wider than their grid cell. Fixes dashboard / page-section
    run-off and section fields being clipped inside dialogs and panels.
  - **ActionBar**: the `alignment` prop (left / center / right) now controls the right button
    cluster even when a left-positioned button is present (it was always forced to `space-between`,
    so alignment did nothing). New `inverted` prop reverses the right cluster so the primary action
    leads.
  - **Modal / Dialog surfaces**: the `footer` is now rendered bare, so an `ActionBar` footer
    supplies the single full-width divider — removes the doubled border line above the buttons and
    under grids. Note: a footer must now provide its own divider/padding/alignment (use `ActionBar`
    or `Footer`); raw content passed as `footer` (e.g. a lone `<button>`) previously inherited the
    wrapper's border + padding and now renders flush against the body.
  - **FormHeader**: new `headerFields` prop renders Dynamics-style header fields as value-over-label
    summary tiles separated by hairline dividers (mirrors the form-runtime header SummaryTile).
  - **PivotSurface**: new `SurfaceTab.tooltip` shows a Fluent tooltip on hover — useful for
    Info-icon "information" tabs; disabled tabs now read as disabled and block selection.

## 0.3.0

### Minor Changes

- 4ba43c9: Add a Fluent UI v9 skin under the new `./v9` subpath. `@dataverse-kit/surface-kit/v9`
  ships the same containers (FormSurface, PageSurface, Section, SectionCard, SectionHeader,
  FormHeader, PivotSurface, CommandSurface, ActionBar, Footer) and overlays (FormDialogSurface,
  ModalSurface, PanelSurface, CalloutSurface, TooltipSurface) as the default v8 entry, re-skinned
  over `@fluentui/react-components` (Dialog / OverlayDrawer / Popover / Tooltip / TabList /
  Toolbar). It reuses the framework-agnostic `core` (sizing scalars), `responsive` (breakpoints),
  `tokens` (design-tokens palette), density scale, and `useDensity` hook — those layers are shared,
  not forked. Also adds a v9-native prop contract and `createDynamicsV9Theme()` (a Dynamics-blue
  `BrandVariants` ramp seeded from the same design-tokens brand triad as the v8 theme).

  `@fluentui/react-components` and `@fluentui/react-icons` are **optional peer dependencies** — only
  consumers of the `./v9` subpath need them; the default v8 entry is unchanged. The v9 skin is a
  bundled entry (`dist/v9.*`); the `core`/`responsive` subpaths stay framework-agnostic (the
  `assert-no-react` gate is unchanged).

## 0.2.1

### Patch Changes

- 3e504a7: chore: add MIT license — populate the `license` field and ship a LICENSE file so npm
  reports the package as MIT (consistent with @dataverse-kit/api-service). Metadata only; no code
  change.
- Updated dependencies [3e504a7]
  - @dataverse-kit/design-tokens@0.1.1

## 0.2.0

### Minor Changes

- feea4f0: `FormSurface` + `Section` now support an opt-in `density` prop (`'comfortable'` |
  `'compact'`). `'compact'` scales spacing by 0.75: `FormSurface` scales its grid gap + padding and
  cascades the density to child `Section`s via a new `DensityContext` (one switch on the form drives
  the whole thing), and `Section` scales its card padding + internal field gap (with an optional
  per-section override). `'comfortable'` (the default) is byte-identical to before. Adds
  `useDensity` + `DensityContext` to the public API.

### Patch Changes

- 91eb17f: Tokens are now re-exported from the new canonical `@dataverse-kit/design-tokens` package
  instead of an inline copy (retires the "SYNCED FROM reusable-components" duplication). No
  public-API or value change — `colors`/`spacing`/`typography`/`radius`/`layout` export the same
  values, and `createDynamicsTheme`/`density` are unchanged.
