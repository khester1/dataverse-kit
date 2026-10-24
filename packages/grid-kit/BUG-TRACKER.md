# grid-kit Bug Tracker

Running list of the UI/functionality fixes before finalizing `@dataverse-kit/grid-kit` + publishing
its Storybook. Verify each in **local Storybook** (`npm run storybook` → http://localhost:6007, Node 20).

**Status key:** ⬜ not started · 🔧 changed, awaiting your Storybook verify · ✅ verified working ·
⏭️ skip (not a bug) · ⚠️ needs your input

**Altitude:** _demo_ = shared demo data / story config only · _library_ = component source change.

---

## All grids
- ⏭️ **Adjustable columns** — resizing confirmed working in Storybook (2026-07-06). Not a bug.

## File Drop
- ✅ **Cell file drop — show dropped filename** _(library — verified 2026-07-06)_ — `dnd/FileDropCell.tsx`
  now holds the dropped file name(s) in local state and shows `📎 <name>` in the cell after a successful
  drop (ellipsis + tooltip for long names). **Verify:** Cell File Drop story → drop a file on a cell →
  the cell shows the filename instead of "Drop file ⤓".
- ✅ **Row file drop — banner above grid** _(story — verified 2026-07-06)_ — moved the `MessageBar` above
  `<DataGrid>` in BOTH `RowFileDropDemo` and `CellFileDropDemo` (`dnd/FileDrop.stories.tsx`).
  **Verify:** drop a file — the notification appears above the grid in both stories.
- 🔧 **Row file drop — highlight row on drag-over** _(library — awaiting verify)_ — the old 6% tint was
  on the wrapper *behind* the DetailsRow, so the row's own background covered it (hence "faint"). Fixed
  with an **overlay on top of the row** (`pointer-events:none` so drag still works): 16% blue tint +
  dashed outline + a solid left accent bar. `hosts/DataGrid.tsx RowFileDropTarget`. Screenshot-verified.
  **Verify:** File Drop → Row File Drop → drag a file over a row.

## DataGrid
- ✅ **Star Rating shows "----"** _(library — FIXED, verified 2026-07-06)_ — root cause: the v8
  `ratingStarClass = mergeStyles({ lineHeight: 1 })` emitted `line-height: 1px` (Fluent merge-styles
  appends `px` to numeric values), collapsing each `★` to a 1px sliver → rendered as an orange dash.
  Fix: quote it to `lineHeight: '1'` in `dynamics-cell-renderers/src/styles/index.ts:143` (unitless
  multiplier, matching the v9 cell). Verified via DOM probe: star box height 1px → 16px. **This was a
  real shipped bug affecting every v8 rating (PCF, export-engine grids, all consumers), not just the
  demo.** Requires a `dynamics-cell-renderers` rebuild for Storybook/consumers to pick up.
  **Verify:** Grid Kit/Cross-Host Proof, Grid Kit/Cell Types → Rating — real stars now.
- ✅ **Add multi-select on "All"** _(demo — verified 2026-07-06)_ — `AllCellTypes` now
  `selectionMode="multiple"` + `onSelectionChanged` + select-all header. DOM-confirmed: 5 checkboxes +
  select-all present.
- ✅ **"All" needs a toolbar** _(demo — verified 2026-07-06)_ — `AllCellTypes` now has a working toolbar
  (search + New/Refresh/Delete with real `onClick`; Delete enables + shows a count when rows are
  selected) + `columnChooser`/`filterBuilder` so the injected Columns/Filters commands work too. Also
  wired the separate `WithToolbar` story's New/Refresh to real `onClick`. ⚠️ confirm this matches what
  "need toolbar option" meant.
- 🔧 **Editable — Rating** _(demo)_ — added `editorType:'number'` to `score` (EditableRatingCell already
  registered). **Verify:** Editable story → click a Rating cell → stars become editable.
- 🔧 **Editable — Created** _(demo)_ — added `editorType:'date'` to `created` (EditableDateCell already
  registered). **Verify:** Editable story → click a Created cell → date editor.
- 🔧 **Editable — Status** _(library — awaiting verify)_ — registered `coloredCell` → `edit:
  EditableOptionSetCell` (both skins) + mapped `options` in `toReusableColumn`'s coloredCell case; demo
  Status column got `editorType:'dropdown'` + `options`. Read still shows the **colored badge** (via
  `colorMap`), edit is a dropdown. DOM-confirmed: 0 → 8 dropdown nodes in the always-editable stories.
- 🔧 **Editable — Progress** _(library — awaiting verify)_ — registered `progress` → `edit:
  EditableNumberCell` (both skins) + demo Progress column got `editorType:'number'`. Read stays the
  progress bar; edit is a number input.
- 🔧 **Editable — Active** _(library — awaiting verify)_ — v8 reused the existing `makeReadWrapper`
  toggle-routing (just needed `editorType:'toggle'`); v9 got a new grid-kit-src `EditableToggleCell`
  (interactive Switch, single-click commit). A `buildCellProps` guard drops the toggle's `editorType` in
  read-only hosts so the switch renders disabled there. DOM-confirmed: enabled in editable stories,
  disabled in read-only — both skins. No dist rebuild.
- 🔧 **Editable — Owner** _(library — awaiting verify)_ — registered `link → edit` (both skins) + demo
  Owner column got `editorType:'text'`. Read stays a **blue link** (see next item), edits as text.
- 🔧 **Link / lookup letters should be blue** _(library — awaiting verify)_ — link + lookup now read as
  `#0078d4` (Dynamics blue) across both skins, even with no click handler wired:
  - **v9** `LinkCell`/`LookupCell` fell back to dark `<Text>` → now blue.
  - **v8 canonical** `LookupCell:145` + `EditableLookupCell:580` fell back to gray `<Text>`/`readOnlyClass`
    (only blue with Dynamics navigation) → now blue for real values (`-` stays muted). **Requires the
    `dynamics-cell-renderers` rebuild** (done) — this was the Round 2 editable-lookup story.
  - Editable link/lookup read stays blue too (v9 `EditableLinkCell`, v8 `makeReadOrEditWrapper` → blue
    read cell until you edit → text input).
  DOM-confirmed: Owner = `rgb(0,120,212)` in v9 Flat/Editable + v8 Round 2 EditableLookup. (v8 `LinkCell`
  was already blue via `linkCellClass`.)

## Grid Types
- ✅ **Click To Edit — Status change doesn't persist** _(story — verified 2026-07-06)_ — root cause was the
  `ClickToEdit` story binding static `demoRows` with no `onValueChange`, so committed edits were dropped.
  Lifted to component state + `onValueChange` (mirrors `EditableDemo`). **Verify:** click a Status cell,
  pick a different option — it now sticks.
- 🔧 **Always Editable — only Account editable** _(now ALL columns editable — awaiting verify)_ — every
  column type is now editable (text/link/optionset-badge/currency/number-progress/rating/date/toggle) +
  state lifted so edits persist.

## Nested & Focused
- 🔧 **Nested Side Panel — "N selected"** _(library — awaiting verify)_ — the trigger cell now tracks a
  `selectedCount` fed by the panel/drawer grid's selection and shows "N selected" (instead of the count)
  once child rows are selected — both skins (`hosts/nested/NestedTriggerCell.tsx`,
  `v9/hosts/nested/NestedTriggerCell.tsx`). Enabled `childSelectionMode:'multiple'` in the two
  NestedSidePanel stories. Trigger reads "2 selected". The selection also **persists across drawer
  close/reopen** via a new `initialSelectedKeys` prop on both DataGrids (v8: Fluent
  `Selection.setKeySelected` on mount; v9: Fluent DataGrid `defaultSelectedItems`) — the trigger tracks
  the selected keys and feeds them back to restore the remounted grid. Playwright-verified both skins:
  2 selected → still 2 after close/reopen.

## Round 2
- 🔧 **Aggregate footer / grand total / subgroup totals misalign** _(library — awaiting verify)_ — footer
  cells were fixed at `minWidth` and packed left. Fixed by matching each body's width model:
  - **v9 flat + v9 grouped**: footer cells → `flex: 1 1 0` (equal), matching the Fluent DataGrid's
    equal columns. Screenshot-verified: Σ under Revenue.
  - **v8 flat**: rendered via the DetailsList's native `onRenderDetailsFooter` using each column's
    `calculatedWidth` → **pixel-perfect** (count/Σ/avg/max under Account/Revenue/Progress/Rating).
  - **v8 grouped grand total**: measures the justified header widths (`data-item-key` cells, ResizeObserver)
    and pins the footer cells → aligned.
  - **v8 per-group subtotals**: FIXED via **React context** — the measured widths flow through
    `ColumnWidthsContext`, and a context consumer re-renders even when Fluent won't re-render the group
    footer on a prop change. Subtotals now right-align under Revenue.
  - **Also (per your follow-up):** removed the `Σ` prefix (sum shows just the value) + right-aligned all
    footer values to match the numeric body cells. Tests updated (footer text no longer unique vs body,
    so assertions count occurrences).
  - **v8 group subtotals + grand total now aligned** — two fixes: (a) the grand total is now rendered
    INSIDE the DetailsList via `onRenderDetailsFooter` (was a sibling below the list with a different
    left origin → width-dependent ~55px drift from the subtotals); (b) footer values **left-aligned** to
    match the DetailsList's left-aligned currency body cells (per user's "omit right-alignment"). Probed
    at 1900px: all footer rows left-edge 1590, body 1594 (4px, consistent). v9 footers stay right-aligned
    (v9 currency cells are right-aligned).
- 🔧 **Nested Selectable Editable** _(library — awaiting verify)_ — child selection + edits now persist
  across collapse/re-expand (v8 inline). Three parts: (1) **mount-keep** — the child grid stays mounted
  (hidden) while collapsed instead of unmounting, so its Fluent Selection + edit state survive;
  (2) story lifts child data + bumps `reloadToken` so edits show and persist; (3) the child region reads
  its data from a new **`ChildCacheContext`** (a context consumer re-renders on data change even though
  Fluent caches the parent row → edits show LIVE, not just after re-expand). Also made child `product`
  editable. `hosts/nested/NestedInline.tsx`, `useChildren.ts`. Playwright-verified: edit 4→9 shows
  immediately + persists; 2 selected → still 2 after collapse/re-expand. (v9 inline defers child
  selection/editing per package CLAUDE.md — unchanged.)
- ✅ **Nested Requires Parent** — behavior confirmed intended by user 2026-07-06 (a parent's child grid
  is selectable only while that parent row is selected). No change needed.
- 🔧 **Nested child grid — column position shifts on first open** _(library — awaiting verify)_ — the
  child DataGrid used `justified` layout, which measures async on mount → a visible re-justify (Qty
  jumps) on first expand, and a big-gap stretched look for a 2-column grid. Added a `columnLayout:'fill'
  |'fixed'` prop to `GridProps`/v8 DataGrid; nested inline + side-panel child grids now pass `'fixed'`
  (columns at minWidth, no stretch, no mount re-justify). Screenshot-verified: compact, stable layout.

## Grid Kit v9
- 🔧 **Editable — only Account/Revenue** _(now ALL columns editable — awaiting verify)_ — Owner (text),
  Status (dropdown), Progress (number), Rating, Created, Active (Switch) all editable in the v9 skin now.
- ✅ **Sortable — sort other columns** _(demo — verified 2026-07-06)_ — added `isSortable:true` to all
  `sample.ts` columns; the `Sortable` story already sorts in-memory + wires `onSortChange`.

## Host (v9 Hosts stories)
- ✅ **Grouped — aggregate total off** — was alignment, not math (sums were correct). Fixed by the v9
  footer `flex: 1 1 0` change above: v9 grouped subtotals + grand total now sit under Revenue.
- 🔧 **Nested Inline Expand — child rows jumbled/unreadable** _(library — awaiting verify)_ — root cause:
  the manual `<Table>` rendered as a **native `<table>`** (default), which ignored the component's own
  `flexBasis`/`flexGrow` cell styling AND confined the expanded row's single cell to one column (~150px)
  → the nested child grid collapsed to min-content and its text overlapped ("Alex ParPrimary"). Fix:
  `noNativeElements` on the `<Table>` (flexbox layout, as the flex styles intended) + `flex:1 1 100%` on
  the expanded cell so it spans full width. Screenshot-verified: child grid full width, readable, columns
  aligned; parent columns unchanged. `v9/hosts/nested/NestedInline.tsx`. Grid-kit-src (no rebuild).

---

### Batch log
- **Batch 1 (demo config, `src/_storybook/sample.ts`)** — 🔧 awaiting verify: added `editorType` to
  `score`(number)/`created`(date); added `isSortable:true` to all columns. Unlocks: Editable Rating +
  Created (v8 & v9), v9 Sortable (all columns), Always-Editable (partial).
- **Star Rating fix (`dynamics-cell-renderers/src/styles/index.ts`)** — ✅ verified 2026-07-06:
  `lineHeight: 1` → `'1'` in `ratingStarClass`; rebuilt the package dist. Star box 1px → 16px. Real
  cross-consumer bug.
- **Batch 2 (story wiring)** — ✅ verified 2026-07-06: (1) `AllCellTypes` multi-select + working toolbar;
  (2) `WithToolbar` commands wired to real onClick; (3) `ClickToEdit` + `AlwaysEditable` lift state so
  edits persist; (4) row-file-drop banner moved above the grid. Plus Cell File Drop filename display.
- **Editable completion (Status/Progress, then Owner/Active)** — 🔧 awaiting verify: registered edits for
  `coloredCell`→optionset, `progress`→number, `link`→text (both skins); new v9 `EditableToggleCell` +
  v8 toggle-routing for `active`; `buildCellProps` guard keeps toggles disabled in read-only hosts.
  All grid-kit-src (no dist rebuild). Gates: typecheck/lint/tests 170 all green. **"Editable" fully
  closed** — all 8 demo columns editable in both skins.
