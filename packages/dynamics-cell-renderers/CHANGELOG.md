# @khester/dynamics-cell-renderers

## 1.2.1

### Patch Changes

- a5cb733: Stop emitting dead bindings in generated forms — they were hard `npm run build` failures
  on the `web-resource` target.

  Unused named imports and unused locals are `@typescript-eslint/no-unused-vars` warnings, and the
  `web-resource` target builds through react-scripts, which promotes warnings to **errors** whenever
  `process.env.CI` is set. Seven dead bindings therefore broke the build in every pipeline while
  compiling fine on a laptop.

  **`pruneUnusedNamedImports`** — a post-pass at the `generateFormCode` funnel, alongside
  `dedupeImportStatements` / `mergeNamedImports` / `narrowStylesImport`. It drops named import
  specifiers the finished file never references.

  A per-emitter fix would not have worked. `generateLinkedSubgrid` adds the v8 DetailsList family
  (`DetailsList`, `DetailsListLayoutMode`, `SelectionMode`, `IColumn`, `ColumnActionsMode`)
  unconditionally — they are needed by the simple-case non-grid-kit fallthrough and by
  `generateColumnEntries`' IColumn literals — but the host is chosen _later_, and a grid-kit subgrid
  uses none of them. Only the finished file knows. The same is true of `PresenceBadge` (the emitter
  renders `<Avatar badge={{…}}>`, never a `<PresenceBadge>` element) and `createTableColumn` (since
  PR6b every v9 flat subgrid routes through grid-kit/v9 and the bespoke bodies that called it were
  deleted).

  Handles what this generator emits: single-line and multi-line brace blocks, an optional default
  import (never touched), inline `type` specifiers, and `X as Y` aliases. Usage detection excludes
  JSX-attribute-name positions — a Fluent `styles={{…}}` prop is not a use of an imported `styles`.
  Only ever removes, and every inexactness fails **open**, keeping the import.

  Also:
  - **`dynamicsCeColors`** deleted from `@khester/dynamics-cell-renderers` — declared, never read,
    and vendored into every generated project.
  - **The read-only grid host no longer emits a `setSelectedIndices` setter.** It is deliberately
    inert (`selectionMode="none"`, no `onSelectionChanged`), so nothing could ever write it.

  Three test assertions were inverted rather than worked around, because each was pinning the
  over-emission as expected behaviour: `PresenceBadge` imported, `DetailsList` imported into a v9
  form, and `createTableColumn` imported once. That is now the fourth place this codebase had
  recorded a dead binding as intended.

  ⚠️ Not the whole `CI=true` story. Two unrelated classes still fail that build and are recorded in
  `web-resource-v8-subgrid.spec.ts`: the emitted search `useMemo` omits `SEARCH_KEYS` from its deps,
  and vendored `CompositeCell.tsx` renders an `<a>` with no navigable `href` — the latter a real
  accessibility defect, not a lint nag.

- f22631e: Fix the last two classes blocking a clean `web-resource` CI build, and turn the gate on.

  **A missing hook dependency.** The emitted subgrid search declared `SEARCH_KEYS` as a plain
  component-scope const and omitted it from the search `useMemo`'s dep array —
  `react-hooks/exhaustive-deps`, and therefore a hard build failure on the `web-resource` target
  where react-scripts turns warnings into errors under CI. Adding it to the deps _alone_ would have
  silenced the lint and broken the memo: a fresh array literal every render means a new identity
  every render, so the memo would recompute every time. `SEARCH_KEYS` is now stabilised with an
  empty dep list and then listed, keeping the memoization real.

  **An accessibility defect.** `CompositeCell`'s `link` slot rendered `<a href="#">` with an
  `onClick` that called `preventDefault` — it announced as a link to assistive technology, offered
  no destination, and did nothing when activated (`jsx-a11y/anchor-is-valid`). Replaced with a
  `<button type="button">` styled to be visually identical, which is what the affordance actually is
  and is keyboard-operable for free. Worth fixing on its own merits; the build failure was how it
  got noticed.

  With these, `tests/e2e/web-resource-v8-subgrid.spec.ts`'s `CI=true` case is **un-skipped**. That
  path — an ordinary export for a maker — now builds clean in a real pipeline for the first time.

## 1.2.0

### Minor Changes

- d1c404b: Widen the `react` / `react-dom` peer range to `>=16.14.0 <19` (was `>=17.0.0`).

  Same root cause as the matching `@dataverse-kit/grid-kit` change: a `control-type="virtual"` PCF
  control renders through the **platform's** React, so it must compile against a version the
  platform serves. Microsoft's table is `allowed 16.14.0`, _"Version loaded: 17.0.2 (Model), 16.14.0
  (Canvas)"_ — so **16.14.0 is the floor both hosts satisfy**, and pinning there is what makes a
  control portable between a model-driven form and a custom page. A `>=17.0.0` peer made that pin
  impossible: `create-dynamics-app`'s `pcf-dataset` template hit `ERESOLVE` on a bare `npm install`
  once it was corrected to React 16.

  The package is React-16-safe — `src/` uses no `createRoot`, `react-dom/client`,
  `useSyncExternalStore`, `useId`, `useTransition`, `useDeferredValue` or `useInsertionEffect`. Its
  Fluent v8 peer (`^8.115.6`) already supports React `>=16.8`.

  Non-breaking for React 17/18 consumers — the range only widens downward.

## 1.1.2

### Patch Changes

- 7ae176f: grid-kit UI/functionality bug-fix pass (both skins).

  **@khester/dynamics-cell-renderers** (patch — cross-consumer bug fixes):
  - Star rating rendered as dashes: `ratingStarClass` used a numeric `lineHeight` that merge-styles
    emitted as `line-height: 1px`, collapsing the `★` glyph. Quoted to `'1'`.
  - Lookup values (`LookupCell` / `EditableLookupCell` read fallbacks) now read as blue link-colored
    text even when no navigation is wired, matching the Dynamics grid convention.

  **@dataverse-kit/grid-kit** (minor — fixes + new API):
  - New `GridProps`/`V9GridProps` options: `initialSelectedKeys` (uncontrolled initial selection,
    for restore-on-remount) and `columnLayout: 'fill' | 'fixed'` (v8).
  - v9 link/lookup read as themed link color; all demo column types editable (rating, created,
    status, progress, active toggle, link-as-text).
  - Aggregate footers align to each body's width model (v9 flex; v8 `calculatedWidth` via
    `onRenderDetailsFooter`; grouped grand-total rendered inside the list; grouped subtotals
    reactive via a column-width context), `Σ` prefix removed, left-aligned.
  - Nested: side-panel trigger shows "N selected" and the selection persists across close/reopen;
    inline child selection + edits persist across collapse/re-expand; v9 inline-expand layout fixed;
    nested child grids use a fixed column layout.

## 1.1.1

### Patch Changes

- 3e504a7: chore: add MIT license — populate the `license` field and ship a LICENSE file so npm
  reports the package as MIT (consistent with @dataverse-kit/api-service). Metadata only; no code
  change.
- Updated dependencies [3e504a7]
  - @khester/dynamics-utils@1.2.1
