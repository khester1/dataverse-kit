# @dataverse-kit/design-tokens

## 0.4.0

### Minor Changes

- f7b2fad: `ceForm.groupedGrid` — the stock Power Apps grid grouped at runtime ("Group by"),
  measured on a live org: the 300px "Group by: <column>" column, the 42px group row, its 20×38
  chevron (2px in, 12px to the label), the 14/38 semibold label run and the lowercase "(blank)"
  label. Two colours join `ceForm.colors` with their Fluent tokens: `groupRowFill` (`#fafafa`,
  `colorNeutralBackground2`) and `groupRowRule` (`#e0e0e0`, `colorNeutralStroke2`, the rule on top
  of every group row after the first). Every leaf is paired with the capture by ce-parity's
  `check-reference`.
- 392b0e2: `ceForm.nestedGrid` — the stock Power Apps grid with Child items set, measured on a live
  org: the 44px select cell splits into a 19.9px checkbox zone and a 24.1px expander (12px icon),
  and an expanded row's child grid sits inset 50 / 12 / 44 (left / top / right) in its detail row.
  Every leaf is paired with the capture by ce-parity's `check-reference`.

## 0.3.0

### Minor Changes

- 70cb582: `ceForm.subgrid`: the measured geometry of a stock Dynamics subgrid (the Power Apps grid
  in a form section), captured on a website record's Site Settings tab at 1710px @ dpr 2. Plus
  `ceForm.colors.rowRule` (`#f0f0f0`, `colorNeutralStroke3`). Every value is paired with its capture
  line in ce-parity's `check-reference`:
  - **Commands:** height, padding, label offset, Flow ▾ chevron zone, ⋮ width, right inset.
  - **Quick find:** size and position.
  - **Grid:** inset and the header's offset.
  - **Header and rows:** heights, the select column, the checkbox, and the cell text inset.
  - **Footer:** height.
  - **Section:** where a grid root sits in a section.

  export-engine's vendored copies of design-tokens are regenerated.

## 0.2.0

### Minor Changes

- a205df0: `ceForm.commandBar` gains the command bar's remaining measured geometry. Each value is
  paired in `apps/ce-parity/reference/check-reference.mjs` with the org capture it came from:
  - `shareIconSize` (20) and `iconGap` (7);
  - `backWidth` (42) and `popOutWidth` (40);
  - `navInsetLeft` (6);
  - `dividerHeight` (24) and `splitDividerHeight` (20);
  - `chevronZone` (40), `splitGap` (5) and `splitChevronOverhang` (5);
  - `commandsPaddingRight` (14) and `farPadding` (10).

  export-engine's vendored design-tokens copy is regenerated to match.

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

## 0.1.1

### Patch Changes

- 3e504a7: chore: add MIT license — populate the `license` field and ship a LICENSE file so npm
  reports the package as MIT (consistent with @dataverse-kit/api-service). Metadata only; no code
  change.
