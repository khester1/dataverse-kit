# @dataverse-kit/grid-kit

## 0.31.0

### Minor Changes

- 571ba24: **v9 `GroupedGrid` (default look): per-group subtotals you supply, and a grand total that
  lines up.**
  - **`groupAggregateResults`** — per-group values keyed by group key (the value's string, or the
    newly exported **`BLANK_GROUP_KEY`** for the empty group), e.g. from a server FetchXML
    `groupby`. ★ **Authoritative:** a group or field/function you leave out renders **blank** — it
    is never computed from the group's rows, which on a paged grid are only this page's share of the
    group. Setting it renders group footers without `group.showGroupAggregates`. Without
    `groupAggregateFormatted`, the column's `aggregateFormat` formats a supplied value only — an
    absent one stays blank (a `v => fmt(v ?? 0)` format would otherwise print "0" for it).
  - **`groupAggregateFormatted`** — the display strings for those values, same keys. When set, a
    group footer shows its string (missing → blank) and **never** the column's `aggregateFormat`,
    which a consumer may have written for the grand total.
  - **Grand total rebuilt.** It was an equal-flex row outside the scroller (off by the select cell,
    the "⋯" column, the panel inset and a classic scrollbar). It is now a headerless grid with the
    group grids' columns, selection cell, "⋯" column and fill, inside the scroller, sticky to its
    bottom when the grid has a `height`. Its markup changed: it carries `data-gridkit-grand-total`
    and is itself a `role="grid"` named "Grand total". It now stays visible while `isLoading` (the
    old footer did too), and its inset gutters are painted.
  - **Forwarded to every group grid:** `sort` / `onSortChange`, `rowCommands` /
    `rowCommandsDisplay`, `onActiveItemChanged`, `onRowNavigate`.
  - **Selection** is held by the GroupedGrid across groups: it survives a reload (`isLoading` true →
    false), rows that leave `items` are dropped (and the pruned set is emitted), and single
    selection is one row across all groups (it was one per group). **Expansion** also survives a
    reload.
  - Each group section carries `data-gridkit-group-key`; a group grid is named by its label (was
    "`<key>` group").
  - Group grids are not resizable (unchanged; now documented): each has its own sizing state.
  - Groups appear in the order of their first row — order rows by the group field first, then by
    `sort`.
  - `look="ce"` warns once that `groupAggregateResults` / `groupAggregateFormatted` are ignored (it
    has no per-group footers).

  Cost: +0.5 KB gzip for a `GroupedGrid` consumer; 0 for `DataGrid` / `CardGrid` consumers
  (`scripts/measure-bundle.mjs`, now with a GroupedGrid scenario).

## 0.30.0

### Minor Changes

- b670667: **v9 editable lookup — `EditableLookupCell` (opt-in).** A lookup column with
  `editorType: 'lookup'` becomes a searchable Combobox: it opens on entering edit, searches your
  fetch-free `rendererConfig.searchLookup(term)` (debounced 300 ms; results `{ id, name }` or
  `{ key, text }`), and commits `{ id, name, entitySetName }` — or `null` for "(None)" — through
  `onValueChange` (`originalValue` is the row's raw value, a GUID for a `_x_value` field; map that
  field to the navigation property before building an `@odata.bind`). A later search's results are
  never overwritten by an earlier, slower one; a failed search says "Search failed" (not "No
  results"); typing over the current name, or Tab / Enter with nothing chosen, commits nothing; the
  first Escape closes the list and restores the name, the second leaves the cell. With
  `editTrigger="always"`, a click opens the list; reopening it searches the typed text. After a
  commit the cell shows the new name (also with `displayField` configured).

  **Opt-in by import:** the Combobox costs **~3.3 KB gzip** for a grid that uses it, so the default
  registry does not carry it (a grid that does not: +0.3 KB, measured against 0.29.1). Register it —
  and the same registry as `nested.childRegistry` for child grids:

  ```tsx
  import { LookupCell, EditableLookupCell, createV9CellRegistry } from '@dataverse-kit/grid-kit/v9';
  const registry = useMemo(() => createV9CellRegistry({ lookup: { read: LookupCell, edit: EditableLookupCell } }), []);
  <DataGrid editable registry={registry} … />
  ```

  A lookup column without `searchLookup` (e.g. from a JSON grid definition) is shown read-only — no
  "Click to edit" — with one dev warning per column (once across nested child grids sharing the
  definition). A lookup with `editorType: 'lookup'` on a registry that has no lookup editor warns
  once and says how to register it. Measured with the new `scripts/measure-bundle.mjs` (consumer
  bundles, Fluent bundled).

  **Fix (all v9 editable columns): the whole cell is the click target.** The click-to-edit area was
  only as wide as the cell's text — and 0×0 on an EMPTY cell, which `look="ce"` leaves blank, so an
  empty editable cell could not be entered at all.

## 0.29.1

### Patch Changes

- ec9d401: **v9 click-to-edit editors (all of them) — six fixes.**
  - **Arrow keys no longer end an edit.** The grid's keyboard navigation moved focus to the row on
    ArrowDown / ArrowUp / ArrowLeft from inside a cell, so moving through an open choice list or the
    caret in a text or number input closed the editor before Enter. The keys an editor owns (arrows,
    Home/End, Page Up/Down, Space) now stay with it.
  - **Enter on a closed choice list opens it** instead of ending the edit; Enter on an open list
    picks the option and ends the edit. (Multi-select: Space toggles options and keeps the list
    open; Enter picks and finishes.)
  - **Clicking inside an editor no longer toggles the row's selection** (or fires
    `onActiveItemChanged` / `onRowNavigate`) — including clicks on a choice list, which renders
    outside the grid.
  - **Leaving an editor by keyboard (Enter / Escape) puts focus back on the cell**, not on `<body>`.
  - **A committed edit is what the cell shows.** After the editor closed, text, number, currency,
    date, choice, rating and link cells displayed the ORIGINAL value again (only Yes/No showed the
    edit). They now show the edited value, formatted for the column — a currency cell no longer
    falls back to the row's old formatted amount — and an edited link no longer opens the original
    row's target.
  - **The date editor opens on the stored day west of UTC.** A date-only value ("2026-06-15") was
    shown in the editor as the day before in negative-offset timezones, and committing a picked day
    flipped the input back a day. Both now keep the day (a committed date also reads as the picked
    day). Unedited date-only values in READ cells still go through `formatDate`, which has the same
    pre-existing shift without a `FormattedValue` annotation — unchanged here.

## 0.29.0

### Minor Changes

- 4122013: **v9 `DataGrid` gets the filter builder** — `filterBuilder={GridFilterBuilderV9}`,
  `onFilterChange`, and `initialFilterModel`. **Opt-in by import**, as the column chooser:
  `import { DataGrid, GridFilterBuilderV9 } from '@dataverse-kit/grid-kit/v9'`.
  `filterBuilder={true}` alone warns and adds nothing. A "Filters" toolbar command ("Filters (n)"
  while n conditions apply) opens a drawer of field · operator · value conditions combined with All
  / Any; Cancel discards, Apply drops incomplete rows. The panel uses native-backed controls only
  (`Select`, `Input`, a checkbox list for "is one of", `<input type="date">`). The filter drives the
  rows, selection, export, the aggregate footer (and `aggregateItems`) and `look="ce"`'s `Rows: N`.
  **Whenever the shown rows change, the selection is trimmed to the rows still shown** (an Apply, a
  data refresh, columns arriving; `onSelectionChanged` emits once), so a row the user filtered out
  can no longer be exported or acted on — or reappear selected when the filter is cleared. To do
  this the grid holds the selection itself, so with a filter panel a selection also survives an
  `isLoading` reload (without one, it restarts from `initialSelectedKeys`, as before). Hiding a
  column in the chooser never drops its filter. Honoured by `DataGrid`, `ReadOnlyGrid`, and
  `NestedGrid` side-panel / hover-callout / `look="ce"` inline; the default-look inline `NestedGrid`
  warns. Dev warnings: a paginated grid filters only its page, and `aggregateResults` (server
  totals) are not filtered. The drawer is shared with the column chooser, so a grid that uses both
  pays for it once.

  Bundle (measured against 0.28.0, consumer bundles): a v9 grid that does **not** use filters grows
  +7.6 KB min / +2.3 KB gzip (the shared filter logic the grid runs; the panel is absent); one that
  does grows +47.2 / +12.6 more; adding the chooser to a filtering grid costs +2.2 KB min.

  **New on both skins: `initialFilterModel`** — restore a model persisted from `onFilterChange`. A
  condition filters and counts only while the grid offers its field, so `columns` may arrive after
  mount; the panel shows only those, and its next Apply drops the rest. Does not fire
  `onFilterChange`.

  **Filter behaviour changes, v8 included** (shared `core/filter`):
  - Text operators (contains / does not contain / begins with / ends with, and equals / does not
    equal on text and lookup columns) match the text the grid **shows** as well as the raw value — a
    lookup "contains Contoso" now matches the account name, not only its GUID. Choice, Yes/No, date,
    number and currency columns still compare the raw value.
  - Date-and-time values compare by the viewer's **local** day (what the cell shows); they compared
    by UTC day, so a record late in the day could match the wrong date. Date-only values compare as
    their stored calendar day everywhere. (Known, unchanged: west of UTC a date-only cell WITHOUT a
    `FormattedValue` annotation displays the previous day — a `dynamics-utils` formatting bug — so
    there the filter matches the data, not the cell.)
  - Multi-select choice values (arrays) now match: "equals" = contains the option, "is one of" = any
    overlap. Before, they never matched, and "is not one of" matched everything.
  - A condition on a column the grid no longer offers is ignored and not counted. Before, it read an
    empty value and could empty the grid while "Filters (1)" still showed.
  - The filter panel no longer offers host-injected `__…` columns (NestedGrid's "Related").

  New exports from both entries: `applyColumnFilters`, `activeFilterCount`, `evalConditionForField`,
  `pruneFilterModel`, `columnDisplayText`, and types `FilterField`, `FilterFieldOption`. From `./v9`
  also `applyFilters`, `evalCondition`, `isConditionComplete`, `operatorRequiresValue`,
  `operatorIsMultiValue`, `fieldTypeForRenderer`, `getOperatorsForFieldType` and the filter types
  (as the root), plus `filterableFields`, `toFilterField` and `filterFieldOptions` (`./v9` only).

## 0.28.0

### Minor Changes

- 84c92bf: **v9 `DataGrid` gets the column chooser** — `columnChooser={GridColumnChooserV9}` and
  `onColumnOrderChange`. **Opt-in by import**, unlike v8's boolean:
  `import { DataGrid, GridColumnChooserV9 } from '@dataverse-kit/grid-kit/v9'`. The drawer costs ~10
  KB gzip, so the grid does not import it — a v9 grid that does not use the chooser grows ~1.4 KB
  gzip, not ~10 (measured against 0.27.0; PCF bundles are one file, so nothing could be tree-shaken
  or lazy-loaded later). `columnChooser={true}` alone warns and adds nothing. A "Columns" toolbar
  command ("Edit columns" under `look="ce"`) opens a drawer to show/hide and reorder columns (Move
  up / Move down; at least one column stays shown; Cancel discards). The choice drives the header,
  the aggregate footer, sizing and responsive shedding; export still writes every column.
  Host-injected columns (NestedGrid's "Related") are not listed and always render last. Honoured by
  `DataGrid`, `ReadOnlyGrid`, and `NestedGrid` side-panel / hover-callout / `look="ce"` inline; the
  default-look inline `NestedGrid` warns that it cannot show it. Focus returns to the command when
  the drawer closes, or to `⋮` when the command was folded into it
  (`V9GridCommand.restoreFocusTarget`, usable by your own commands). A reorder on a resizable
  auto-fit grid now moves the stretch to the new last column (Fluent kept its old sizing state on a
  pure reorder; each column's ideal width now carries its position as a sub-pixel offset so any
  reorder is seen).

  **New on both skins: `initialVisibleOrder`** — restore a choice you persisted from
  `onColumnOrderChange`: its keys show in that order, other columns present at mount start hidden,
  columns added later appear. If the grid mounts with no columns yet (a PCF control before its view
  metadata arrives), the choice waits and applies when the columns arrive; a saved choice that
  matches none of the current columns falls back to showing them all, never an empty grid.

  **Fix (v8 behaviour change): a hidden column no longer reappears.** The v8 chooser re-showed every
  hidden column whenever the grid received a new `columns` array with the same keys — every PCF
  `updateView`, every inline `columns={[…]}`. Hidden now stays hidden; a column the grid has never
  seen still appears. Also on v8: host-injected `__…` columns (NestedGrid's "Related") are no longer
  offered in the chooser panel or included in `onColumnOrderChange`, and a panel holding only stale
  keys can no longer apply an empty grid. The pure logic moved to `core/columnOrder`
  (`orderVisibleColumns`, `initialColumnChoice`, `reconcileColumnChoice`, `applyColumnOrder`,
  `isHostColumnKey`, type `ColumnChoice`), exported from both entries.

  Also: a consumer command on the export key no longer prints a collision warning while export is
  off, and an export-key collision no longer suppresses the Columns command (collisions are per
  feature).

## 0.27.0

### Minor Changes

- ce66723: **v9 `DataGrid` gets turnkey export** — `exportConfig`, the same `GridExportConfig` as
  v8. It adds an Export command to the toolbar (a toolbar is synthesized when there is none; under
  `look="ce"` a `layout: 'dynamics'` one). With `layout: 'dynamics'` the formats are an `Export ▾`
  menu that folds into `⋮` like any command; the default toolbar cannot render a menu, so it gets
  one button per format (`Export CSV`, `Export JSON`). Scope follows v8: `'all'`, `'selected'`, or
  (unset) the selection when non-empty, else every item. The selection is resolved against the
  current `items` when you click, so a refreshed or shortened list never exports a stale or removed
  row, and a loading round-trip exports the selection the grid shows afterwards. Honoured by
  `DataGrid`, `ReadOnlyGrid` (which warns on `scope: 'selected'` — it has no selection column), and
  `NestedGrid` side-panel / hover-callout / `look="ce"` inline; the default-look inline `NestedGrid`
  warns that it cannot show it. `dialog: true` is not supported on v9 yet: it warns and exports
  directly. Host-injected `__…` columns (NestedGrid's "Related") are not exported.

  **Behaviour change, v8 and v9: CSV now carries what the grid shows.** A cell with a Dataverse
  `@OData.Community.Display.V1.FormattedValue` exports that text — the choice label instead of its
  code (`Active`, not `1`), the lookup name instead of the GUID, the org-formatted money instead of
  `$`/en-US. Cells without one keep the previous formatting. JSON is unchanged and keeps the raw
  values.

## 0.26.0

### Minor Changes

- ed0eb9d: v9 `FocusedViewGrid` gains `look` (`'default'` | `'ce'`): with `look="ce"` the detail
  pane's child grid (`nested`: the "Related" section for mode `'detail-pane'`, or the whole pane
  with `focusedView.childOnly`) renders as a `DataGrid look="ce"`, the measured stock subgrid. Only
  the child changes. The rail and pane are not a measured stock surface, so they keep their look.
  Before this, the child always rendered the default look.

### Patch Changes

- db87b03: v9 `DataGrid` with `resizableColumns` and Fluent's default auto-fit: the columns now fill
  the grid's content box beside a classic vertical scrollbar, in both looks. Fluent auto-fits to the
  grid's parent's border box, which includes the scrollbar (and, under `look="ce"`, the subgrid
  inset), so a grid with a `height` and enough rows to scroll overflowed by the scrollbar's width
  (measured: 15px). The offset is now measured as border box minus content box, so it covers the
  inset and the scrollbar alike. A grid with no inset and no scrollbar keeps Fluent's default, so
  most default-look grids render as before.
- 4a4e5d0: Nested and focused grids no longer spin forever when `nested.getChildren` fails. A
  rejected promise or a synchronous throw left a "Loading related records…" spinner (or "Loading…")
  up for good, and a throw could crash the host. Every host that fetches children (inline
  `NestedGrid` default and `look="ce"`, the cards layout, the side panel, the hover preview, and the
  `FocusedViewGrid` detail pane, in both the v8 and v9 skins) now shows "Couldn't load related
  records." (`role="alert"`) in place of the child grid. A trigger never reads "0 related" after a
  failure. Any rejection counts, including a bare `Promise.reject()` with no reason: every failure
  is normalised to an `Error`. A failure is not cached as final, so expanding or opening again (or
  choosing another record) retries, and a failed `reloadToken` refresh shows the error until the
  next successful one.

## 0.25.0

### Minor Changes

- f7b2fad: v9 `GroupedGrid` gains `look="ce"` (plus `totalRowCount`, `columnFill` and `aria-label`):
  ONE Dynamics-styled grid whose group rows sit between its data rows, measured against the stock
  grid's runtime "Group by" (design-tokens `ceForm.groupedGrid`). A "Group by: <column>" column
  comes first; groups are ordered by label, start collapsed (unless
  `group.collapsedByDefault: false`) and label empty values "(blank)"; the label and count are one
  run in the stock grid's own font stack; a group checkbox selects the group's rows. Space on a
  focused group row (or a click on its Group-by cell) expands it; Enter moves into the row, to its
  checkbox, as on every row. Per-group subtotals (`group.showGroupAggregates`) are not rendered
  under `look="ce"` (a console warning); the overall aggregate row still shows. The default look is
  unchanged.
- 392b0e2: v9 `NestedGrid` inline mode honours `look="ce"` (it ignored `look` before): ONE
  Dynamics-styled grid measured against the stock grid with Child items (design-tokens
  `ceForm.nestedGrid`). The expander sits inside the select cell's 44px (the select cell narrows to
  19.9px and the expander is a 24.1px column, header "Expand row"), so data columns start where a
  flat grid's do; every row after the first carries the stock top rule; an expanded row is followed
  by a detail row holding the child as its own `look="ce"` grid (own header and "Rows: N", no
  toolbar, sized by the parent's `columnFill`). Several rows can be open at once; expanding never
  selects the row; parent selection works. Keyboard: ArrowRight moves checkbox → expander and Enter
  expands; arrows walk into the child and back out (ArrowUp off its header, ArrowDown off its last
  row, or Escape on a child row); Ctrl+Home/End stay in the grid they are pressed in. The narrowed
  select cell's checkbox and its click target stay inside the cell. The default inline look is
  unchanged (its expand logic now shares `useExpanded`, which fetches outside the state updater).

### Patch Changes

- 59474c3: v9 `DataGrid look="ce"` with `resizableColumns` and Fluent's default auto-fit: the
  columns now fill the grid's content box. Fluent auto-fits to the grid's parent element's border
  box, which under `look="ce"` carries the subgrid inset (20 + 32px), so the columns overflowed by
  exactly that (measured: 1448px of columns in a 1396px box). The offset now includes the inset,
  with and without a selection column. `autoFitColumns: false` grids (fixed view widths, as in the
  measured recipe) are unaffected.
- 38a00f1: v9 `NestedGrid` side-panel: the drawer's child grid now takes the parent grid's `look`
  (with `look="ce"` the child is a ce grid — blank empty cells, the measured row metrics — instead
  of silently falling back to the default look). The hover-callout preview keeps the default look on
  purpose (the ce inset and "Rows: N" footer do not belong in a popover).
- Updated dependencies [f7b2fad]
- Updated dependencies [392b0e2]
  - @dataverse-kit/design-tokens@0.4.0
  - @dataverse-kit/fluent-theme@0.3.2

## 0.24.1

### Patch Changes

- 551df39: v9 `NestedGrid`: Escape now returns keyboard focus to the trigger.
  - **side-panel** — closing the drawer (Escape or Close) left focus on `<body>`: the drawer is
    opened from a plain `Button` with controlled `open`, and Fluent restores focus only to a marked
    restore target. The trigger is now one (`useRestoreFocusTarget`).
  - **hover-callout** — Escape closed the popover and focus jumped to the PARENT ROW: tabster's
    groupper handles Escape in a window-level capture listener ("exit the cell to its row"), before
    the badge sees the key. While the popover is open the badge now opts out of that
    (`ignoreKeydown: { Escape }`), MERGED with the restore target `PopoverTrigger` already sets — so
    focus that was inside the callout still returns to the badge. With it closed, the badge's
    attributes are untouched and Escape still exits to the row.

  Measured in Chrome with real keys against the nested-grid gallery bundle, on published 0.24.0 vs
  0.24.0 + this change.

## 0.24.0

### Minor Changes

- 6e24464: v9 `look="ce"`: an empty cell is now blank, as on the stock Dynamics subgrid, instead of
  `-`. The default look still shows `-`. Applies to the text, number, currency, date, lookup,
  optionset and coloredCell read cells. New exports `EmptyCellTextContext` / `useEmptyCellText` let
  a custom cell follow the same rule.

  Also, on every look:
  - a v9 lookup cell whose resolved label is `''` (from `formatValue`, `lookupDisplayField`, or the
    formatted value) now shows the empty placeholder, where it used to render a blank link —
    clickable when `onLinkClick` was set;
  - a real value of `-` is now a value, not "empty": a lookup whose label is `-` renders as a link,
    and a coloredCell whose value is `-` goes through `colorMap` / `getBackgroundColor`.

## 0.23.0

### Minor Changes

- 70cb582: v9 `DataGrid look="ce"`: the measured stock Dynamics subgrid. Pair it with surface-kit
  `Section look="ce"`; the metrics come from `@dataverse-kit/design-tokens` `ceForm.subgrid` (now a
  dependency).
  - **Rows and header:** 42px rows with a `#f0f0f0` rule; a 43px header with 42px semibold cells and
    a `#e0e0e0` rule; cell text 12px in. The select column was already 44px.
  - **Grid inset:** 20px left and 32px right inside the grid root.
  - **The `layout: 'dynamics'` toolbar:**
    - commands are 42px tall, with regular-weight labels 44px in;
    - a menu command ends in a 30px chevron zone, and ⋮ is 44×42;
    - quick find (180×32) sits on its own row under the commands, right-aligned.
  - **A "Rows: N" footer** when there is no `pagination`. The new `totalRowCount` prop sets N for a
    paged total.

  The ce-parity gate checks it against the org capture, region by region, relative to the section
  card. Commands, quick find, header and header cells (including their rule), rows, link text and
  the footer match within 0.3px. There are three stated exceptions: the header checkbox (0.5px), the
  row checkbox (1px left: Fluent v9's checkbox vs the org's v8) and the value text (0.5px high). The
  sabotages listed in dynamics-ui-kit#417 each turned the gate red.

  The default look is unchanged.

  Icon-only commands use the measured ⋮ box (44×42). The ce toolbar renders nothing when it has no
  title, commands or search, and "Rows: N" is hidden while loading.

  Not modelled: the stock grid's blank empty cell (ours still shows `-`), the command icon box
  (unmeasured), the 18px classic-scrollbar gutter, and an always-visible ⋮ (ours appears when a
  command is pinned or overflows).

- e1c9f98: v9 grids: row commands can now show as a visible "⋯" button. Before this they were
  reachable only by right-click. A new `rowCommandsDisplay` prop chooses where they appear:
  - `'context'` (the default): right-click only, as before.
  - `'button'`: a trailing "⋯" column.
  - `'both'`: the "⋯" column, and right-click too. Right-clicking the "⋯" button opens the same
    menu.

  The "⋯" column:
  - is exported as `ROW_COMMANDS_COLUMN_ID`;
  - is never dropped on narrow screens;
  - has a matching empty cell in the aggregate footer;
  - is 44px wide in a non-resizable grid. In a resizable grid it starts at 44px, but with Fluent's
    default `autoFitColumns` it absorbs any spare width. The button stays right-aligned when that
    happens.

  Using the button or its menu never selects, activates or navigates the row. This needed a guard.
  The menu is a portal, and React passes a portal's events up the component tree. Fluent's row
  toggles selection on any click that reaches it. Without the guard, clicking a menu item would also
  select the row.

  A command's `visible` rule is applied once per row, and the result feeds both the button and the
  right-click menu.

  Support by grid:
  - Supported: `DataGrid`, `ReadOnlyGrid`, and the `NestedGrid` modes built on `DataGrid`
    (`side-panel`, `hover-callout`, `detail-pane`). In those modes the "⋯" column comes after the
    "Related" column.
  - Not supported: `NestedGrid` `inline` mode, and the card, grouped and focused grids.

### Patch Changes

- Updated dependencies [70cb582]
  - @dataverse-kit/design-tokens@0.3.0
  - @dataverse-kit/fluent-theme@0.3.1

## 0.22.2

### Patch Changes

- 39d0864: v9 grids: a long value in a read-only cell no longer runs into the next column. Read-only
  cells now render Fluent's `TableCellLayout` with `truncate`. Fluent's cell is a flex container, so
  without it the content span grew to the width of its text and the cells' own ellipsis never
  applied. This shows whenever a column is narrower than its text: a grid in a side column, a
  resized column, or a narrow custom page. A full-width grid usually has room, which is how the bug
  went unnoticed.

  Two kinds of cell are deliberately **not** truncated:
  - **Editable columns.** `truncate` is `overflow: hidden`, which would clip the edit shell's
    dirty/error accent (drawn into the cell padding) and its error message (which hangs below the
    cell).
  - **The `onRender` escape hatch.** Custom content owns its own overflow.

  Found by the ce-parity "Details beside a grid" recipe. The overflow is gated in a real browser at
  two frame widths, and the per-cell decision by unit tests.

- Updated dependencies [db23448]
  - @dataverse-kit/fluent-theme@0.3.0

## 0.22.1

### Patch Changes

- 4483348: **v9 `columnFill: 'proportional'` now fills to the pixel. A formatted blank footer cell
  renders empty.**
  - **Fill accounts for Fluent's cell padding.** Fluent v9 header and body cells add 8px of
    horizontal padding on each side on top of the `width` they are given. MEASURED in real Chrome:
    every column rendered exactly +16px over the width asked for. So 0.22.0's fill overflowed the
    grid by 16px per column and skewed the ratios (a constant +16 is a larger share of a narrow
    column), and at narrow widths the columns sat 16px over the view widths. Fill now works in
    **rendered** widths. Resizable grids set `idealWidth` to the filled width − 16. Non-resizable
    grids use flex basis = the base width − 16, with grow ∝ the base width, so the rendered widths
    are exactly base × one factor. Measured after the fix: factors 1.180 / 1.184 / 1.180 / 1.180 at
    900px, and the columns plus the selection cell equal the grid width exactly (900 = 900, 1300 =
    1300).
  - **A consumer `aggregateFormat` that returns `''` renders a blank cell**, not a bare `avg` /
    `min` label. 0.22.0 blanked a `null` only when no format function was supplied.

## 0.22.0

### Minor Changes

- 8789b1a: **grid-kit: several aggregates per column, and a v9 footer that lines up with its
  columns.**
  - **`ColumnDef.aggregate` accepts `fn | fn[]`** (for example `['sum', 'avg']`). The v9 hosts
    render **one footer row per distinct function**, in the order each first appears. The v8 hosts
    keep their single-row footer and use the first function. New core helpers `aggregateList(col)` /
    `hasAggregate(col)` replace every `if (col.aggregate)` check: an empty array is truthy and would
    otherwise render an empty footer. `computeAggregates` keeps its one-result-per-column contract.
    `computeAggregateRows` is new.
  - **`aggregateResults`** (v9 `DataGrid`, and the `GroupedGrid` grand total): precomputed values
    per `(fieldName, fn)`, for example server-side totals over every matching record. A pair that is
    present wins, and a present `null` renders blank. An absent pair is computed over
    `aggregateItems ?? items`.
  - **The v9 `DataGrid` footer now renders INSIDE the grid.** Each cell is a `DataGridCell` under
    `ColumnIdContextProvider`, so it takes its width from the grid's own column-sizing state. It
    stays aligned after a column resize and scrolls horizontally with the body. It is sticky to the
    bottom **only when the grid has a `height`** (otherwise it sits statically after the last row),
    takes no tab stop, and on a selectable grid carries a selection cell with **no checkbox**.
    Ctrl+End still reaches the last body row (Fluent targets the last `[role="row"]`, which is now
    the total row; the host redirects it). ★ Fluent's `TableSelectionCell invisible` is only
    `opacity: 0`: its checkbox stays focusable and clickable, which is why it is not used.
  - **Breaking (types, read side; hence the minor bump on 0.x):** code that READS `col.aggregate`
    and passes it where an `AggregateFunction` is expected, or switches on it, no longer compiles,
    because the value may be an array. Narrow it with `aggregateList(col)[0]` (the v8 behaviour).
    **The DOM moves too:** the v9 footer is now `rowgroup > row` INSIDE `role="grid"`, so a consumer
    test that counts the grid's `[role="row"]` sees N more (one per function).
  - `aggregateList`, `hasAggregate`, `computeAggregateRows` and the `AggregateSpec` /
    `AggregateValues` / `AggregateRowResult` types are exported from both `.` and `./v9`. In
    `aggregateResults`, `undefined` counts as absent (computed) and only `null` means blank.
  - **`columnFill: 'proportional'`** (v9 `DataGrid`, default `'none'` = unchanged) applies the
    **stock Dynamics grid's column spacing**. MEASURED on "My Active Accounts": view widths
    300/100/100/150/150 render as 585/195/195/293/293, one common factor (about 1.95) filling the
    grid. Fluent's `autoFitColumns` instead hands all spare width to the last column.
    `fillColumnWidths(bases, available)` (exported) is the rule: it never shrinks a column (a narrow
    container scrolls horizontally), and the last column takes the rounding remainder. Non-resizable
    grids get CSS flex; resizable grids measure the scroll container and feed the filled widths as
    `idealWidth` with auto-fit forced off. A container resize refills, and so resets any widths the
    user dragged.
  - ★ Fixed on the way: passing `style={undefined}` to a v9 `DataGridCell`/`DataGridHeaderCell`
    **wipes a resizable column's width** (Fluent spreads `...props` after its sizing props). Styles
    are now spread only when defined.
  - A `null` aggregate now renders blank, where it used to render a bare `avg` / `min` label.
  - `GroupedGrid`: per-group subtotals render inside each group's grid. The grand total stays below
    the groups (approximate alignment: it spans several grids) and is the only footer that
    `aggregateResults` reaches.
  - export-engine: the vendored grid-kit snapshot is regenerated (types/core only; the v9 skin is
    never vendored).

## 0.21.0

### Minor Changes

- 42e6fdc: **grid-kit v9 nested: resizable child grids, and a hover-callout that works from the
  keyboard and on touch.**
  - **`NestedConfig.childResizableColumns`** (new, default `false`): the child grid in a
    `side-panel` drawer and under an `inline` row gets `resizableColumns` — with
    `autoFitColumns: false`, because Fluent's autofit clamps every drag whenever the columns
    overflow their container, which a drawer routinely does. Reported from a live nested-grid form:
    truncated drawer cells could not be widened; the drawer's grid was built with no resize props at
    all.
  - **`hover-callout` trigger fixed** (v9). It was a bare `<span>` — no role, no tabIndex,
    unreachable by keyboard; only `mouseenter` fetched, so a click-open showed an endless spinner;
    Fluent's trigger toggles on click, so a tap opened and closed it at once; and `hoverDelay` was
    never read, so every row the pointer crossed fired a child query. The Popover is now controlled:
    the trigger is a `Button`, opening by any route loads the children, `hoverDelay` (default 300ms)
    gates both the open and the fetch, and `(hover: none)` devices get tap-to-open only.
  - export-engine: vendored grid-kit snapshot re-extracted (the shared `NestedConfig` type gained
    the field; no v9 file enters the snapshot).

## 0.20.0

### Minor Changes

- fef7f95: **grid-kit: `layout: 'dynamics'` for `GridToolbar` (v8 and v9).** An opt-in toolbar that
  mimics the model-driven subgrid command bar, for surfaces the platform does not decorate — custom
  pages above all. The title sits on the left, subtle icon+text commands are right-aligned, commands
  that do not fit fold into a vertical `⋮` menu (last command first), and search sits far right.
  - Per command: `iconOnly`, `position: 'overflow'` (always in `⋮`), `minSelectionCount` /
    `maxSelectionCount`. On v9, `menuItems` renders a menu button (Dynamics' "Flow ▾"), and becomes
    a submenu once it folds into `⋮`. On v8, `subMenuProps` without `split` does the same.
  - Per toolbar: `layout`, `title`, `iconOnly`, `selectedCount` (supplied by the consumer — mirror
    the host's `onSelectionChanged`), `selectionGating: 'hide' | 'disable'`, and
    `overflowAriaLabel`.
  - On v8 `DataGrid` with the dynamics layout, the injected Export / Open / Columns / Filters
    commands go after the consumer's, so they are the first to collapse.
  - Pure helpers `gateCommands`, `partitionCommands` and `mergeToolbarCommands` are exported from
    the root entry.

  **The default layout renders exactly as before.** A DOM and CSS baseline recorded before the
  change pins this. Setting a dynamics-only field without `layout: 'dynamics'` logs one warning.

  Consumer notes:
  - **v8:** register icons once with `initializeIcons()`. grid-kit does not do it for you.
  - **v9 in a PCF:** the `⋮` menu and icon-only tooltips are portals. Give each control instance its
    own `IdPrefixProvider`, or they render unthemed.
  - **v9 `standard` control on a model-driven form:** it needs tabster isolation, because Toolbar
    and Menu use arrow navigation.
  - **No toolbar above `LiteTable` yet.** That pairing is the next increment.

  **export-engine:** the vendored grid-kit snapshot has been regenerated. Generated projects carry
  the new source but render the same toolbar, because the emitter still produces the default layout.

## 0.19.1

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

## 0.19.0

### Minor Changes

- 8050370: `LiteTable`: add `cellClassName`, a per-body-cell class hook.

  `classes.td` is one class for every cell, and `choice-grid` — the third and last control in the
  convergence — cannot be expressed with one. Its text cells need `overflow: hidden` +
  `text-overflow: ellipsis` to truncate at 320px; its **editable** cells need `overflow: visible` so
  the badge's focus ring is not clipped, on a control whose entire selling point is changing a value
  without opening the record. Two opposite requirements in one table.

  ```tsx
  cellClassName={({ column }) =>
    canEdit(column) ? mergeClasses(styles.td, styles.editingCell) : styles.td}
  ```

  ★ It takes the same `LiteCellContext` as `renderCell` (row, column, index, resolved text), and it
  **replaces** `classes.td` rather than composing with it — the same rule `leading.cellClassName`
  already follows, so one place decides a cell's final class and a caller can also take the uniform
  class away. A caller wanting both composes them itself.

  ★★ THE ALTERNATIVE WAS TO REFACTOR THE CONTROL'S CSS, AND THAT IS THE TAIL WAGGING THE DOG. The
  thesis of this arc is that the three hand-rolled tables were deliberate and the host was what was
  missing — not that the controls should conform. A per-cell class is something a table host owes
  its consumers; reshaping a shipped, org-verified control to fit a host limitation is the inversion
  this extraction exists to undo.

  Measured, this tree:
  - `dist/lite.esm.js` 2,589 → 3,260 bytes. Still no `DataGridBody`, `DataGridRow`, `react-table`,
    `createTableColumn` or `tabster`; still imports only `Link` and `react/jsx-runtime`.
  - The export-engine vendor snapshot is **unchanged** — content hash `2a5fcaf472a3`, 91 files, with
    `npm run build:gridkit-vendor` exiting 0. `src/lite/` is excluded from the vendor map alongside
    `src/v9/`, and an unchanged artefact only means anything once the regenerating command is known
    to have succeeded.
  - Three new tests, each watched failing from the defect's own site. The fixture makes two cells in
    one render want **different** classes and has one column return `undefined` — a fixture where
    every cell wants the same class cannot tell this implementation from the one before it, and a
    fallback-only test passes with the prop never read at all.

## 0.18.0

### Minor Changes

- 95f4bec: Add `@dataverse-kit/grid-kit/lite` — a semantic `<table>` host with no Fluent `DataGrid`
  and no `react-table`.

  Three gallery controls (`choice-grid`, `ordering-grid`, `inline-create-grid`) each hand-rolled
  this table **deliberately**, to keep Fluent v9's `DataGrid` — and the tabster singleton hazard it
  drags — out of a control that only needs rows and cells. grid-kit only offered one way through, so
  this is the host it was missing rather than a lesser `DataGrid`.

  `LiteTable` always keys cells `name#index`. A Dataverse view can carry the same column twice (once
  plain, once through a property-set), and keying by name alone gives React two children with one
  key so both cells react to one interaction — a bug `choice-grid` already fixed and the other two
  still carry. Adopting this host fixes them.

  New subpath `./lite`; existing `.` and `./v9` entries are unchanged.

## 0.17.0

### Minor Changes

- 62e31b6: v9 `DataGrid`: forward `resizableColumnsOptions` to Fluent, so `autoFitColumns` can be
  turned off.

  Fluent's `autoFitColumns` defaults to **true** and routes every resize through
  `adjustColumnWidthsToFitContainer(...)`, so in any container narrower than the columns need — i.e.
  every Dataverse subgrid — the new width is clamped straight back and dragging a resize handle does
  nothing at all. grid-kit never forwarded the option, so no consumer could turn it off.

  MEASURED in Chrome against a shipped PCF bundle, same build, only the container width varying: 6
  columns needing 1024px inside a 445px subgrid cell were completely inert; at 1400px, where they
  fit, resizing worked. Forcing `autoFitColumns: false` at 445px: column 0 went 144px → 204px and
  the handle count went 5 → 6, the last column gaining one exactly as Fluent's
  `isLastColumn && autoFitColumns ? null : handle` predicts.

  Pure pass-through, left `undefined` by default — no existing consumer changes behaviour. A grid
  inside a horizontal scroller wants `{ autoFitColumns: false }`.

## 0.16.1

### Patch Changes

- 99130c3: Make grid-kit compile under TypeScript 4.9 / `target: es5` — a generated `web-resource`
  with a Fluent v8 subgrid could not build at all.

  Three hard compile errors, all in grid-kit and all invisible to every existing gate:

  ```
  core/filter.ts:49,50    TS2322  Set<string> not assignable to ReadonlySet<FilterOperator>
  hosts/buildGroups.ts:31 TS2802  Map iteration needs --downlevelIteration or target es2015+
  ```

  **Why only there.** The `web-resource` export target is pinned to **TypeScript 4.9** and
  `target: es5` — react-scripts 5 peers `typescript@^4`, and this repo's own note records that
  bumping it breaks the CRA dependency tree. Every other target is TS 5.3 / es2015+, where 4.9's
  contextual-typing gap (`new Set([...])` widening to `Set<string>` despite the annotation) and the
  downlevel-iteration rule simply do not apply. A toolchain difference, not a logic change — which
  is why it compiled everywhere anyone looked.

  **Why nobody looked.** The `web-resource` × Fluent-**v8** × subgrid combination had no spec.
  Mapping every e2e spec by its own options: `web-resource.spec.ts` builds web-resource with **no**
  subgrid; `subgrid-v9-webresource.spec.ts` builds web-resource + subgrid but **v9**; the nine other
  subgrid specs are all `static-web-app`; the PCF specs are `pcf`. So every v8 grid-kit subgrid was
  built on a TS 5.3 target, and every web-resource build was subgrid-free or v9.

  Fixes are type-level only, no behaviour change: an explicit `new Set<FilterOperator>(…)`, and
  `Array.from(buckets.entries())` in place of iterating the Map directly (same order). Vendored
  snapshot regenerated in the same change, per the drift guard.

  New gate: `tests/e2e/web-resource-v8-subgrid.spec.ts` builds exactly that combination. Verified by
  reverting the fix and watching it fail on `Failed to compile`.

  `withBuiltProject` also gains an opt-in `buildEnv`, applied after the `CI` strip, so a caller can
  deliberately restore `CI` — the strip is right for a render smoke test and wrong when the question
  is whether a generated project survives a pipeline.

- Updated dependencies [a5cb733]
- Updated dependencies [f22631e]
  - @khester/dynamics-cell-renderers@1.2.1

## 0.16.0

### Minor Changes

- d1c404b: Widen the `react` / `react-dom` peer range to `>=16.14.0 <19` (was `^18.2.0`).

  This unblocks a real defect rather than relaxing a constraint for convenience.

  A `control-type="virtual"` PCF control returns a `ReactElement` that the **platform** renders with
  the platform's own React, so it must declare a `<platform-library>` React version the platform
  actually serves. Read off a live model-driven page (2026-08-01, `orge2e285aa`):

  ```
  Reactv16:            object, version 17.0.2   // the alias says 16; the served React is 17.0.2
  Reactv18:            undefined
  FluentUIReactv81211: object
  ```

  There is no React 18 in a model-driven host — `pcf-scripts`' `PlatformLibraryVersions.json` has an
  18.3.1 row, but the runtime does not serve it. So a grid-kit-based virtual control has to declare
  React `16.14.0`, and with the old peer that was impossible: `create-dynamics-app`'s `pcf-dataset`
  template pins React to match its manifest, and a bare `npm install` then hit `ERESOLVE` against
  grid-kit. The control that did ship (declaring 18.3.1) built green and failed to instantiate in
  the org with "An error has occurred."

  The library is genuinely React-16-safe, so nothing is being papered over: `src/` uses only
  `useState`, `useEffect`, `useMemo`, `useRef`, `useCallback`, `useContext`, `useLayoutEffect`,
  `createContext`, `createElement`, `isValidElement` and type-only React imports — no `createRoot`,
  `react-dom/client`, `useSyncExternalStore`, `useId`, `useTransition`, `useDeferredValue` or
  `useInsertionEffect`. It imports no runtime `react-dom` at all.

  Non-breaking for React 18 consumers — the range only widens downward.

### Patch Changes

- Updated dependencies [d1c404b]
  - @khester/dynamics-cell-renderers@1.2.0

## 0.15.0

### Minor Changes

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

### Patch Changes

- Updated dependencies [7ae176f]
  - @khester/dynamics-cell-renderers@1.1.2

## 0.14.0

### Minor Changes

- 506a7ea: Add per-row **`rowCommands`** (a right-click context menu) to the Fluent UI v9 grid skin
  (`./v9`) flat `<DataGrid>` and its `<ReadOnlyGrid>` preset — the v9 counterpart of the v8
  `GridProps.rowCommands` / `useRowContextMenu`.
  - New prop type **`V9RowCommand<T>`**
    (`{ key; text; icon?: ReactElement; onClick(item); visible?(item); disabled?(item) }`) +
    `rowCommands?: V9RowCommand<T>[]` on `V9GridProps`. It mirrors the v8 `RowCommand` exactly
    except the icon is a rendered v9 `ReactElement` (like `V9GridCommand.icon`), not a v8 `iconName`
    string.
  - Each row is wrapped in a per-row `<Menu openOnContext>` when it has at least one command whose
    `visible(item)` is not `false`; right-clicking the row opens the menu at the cursor and
    suppresses the native browser menu. A row with no visible commands (or no `rowCommands`) is left
    as a bare row so the native menu stays intact. Because `<Menu>`/`<MenuTrigger openOnContext>`
    add no DOM and the popover portals only while open, row selection, composite keyboard
    navigation, and inline click-to-edit are untouched.
  - Scope: the flat `<DataGrid>`/`<ReadOnlyGrid>` only — card / grouped / nested / focused v9 hosts
    are a follow-on increment (mirroring the v8 rollout). The default (v8) `.` entry and the
    export-engine-vendored output are unchanged.

## 0.13.0

### Minor Changes

- f7dca25: Add **`<NestedGrid>`** to the Fluent UI v9 grid skin (`./v9`) — the final v9 grid host.
  It dispatches on `nested.mode`:
  - **`inline`** — a MANUAL v9 `<Table>` (v9's DataGrid has no row-expansion primitive) whose
    chevron expands a child v9 `<DataGrid>` indented under the parent row; children resolve lazily
    on first expand.
  - **`side-panel`** — a per-row trigger opens a v9 `OverlayDrawer` hosting the child grid.
  - **`hover-callout`** — a count badge shows a v9 `Popover` preview of the top-N child rows.
  - **`detail-pane`** — falls back to `side-panel` (use `<FocusedViewGrid>` for a true inline pane).

  Reuses the Fluent-free `useChildren` lazy-fetch hook verbatim; forks `formatTriggerLabel` into
  `src/v9/hosts/nested/labels.ts` (the v8 `labels.ts` runtime-imports the Fluent-v8 `PanelType`
  enum), drift-guarded against the v8 source. New prop type: `V9NestedGridProps`.
  `parentLayout:'cards'` + parent-row selection / `requires-parent` gating in the inline mode are
  follow-on increments.

  **This completes the v9 grid-host set** (`DataGrid` read+edit · `CardGrid` · `FocusedViewGrid` ·
  `GroupedGrid` · `NestedGrid`). The default (v8) `.` entry + generated output are unchanged.

## 0.12.0

### Minor Changes

- 79e4885: Add **`<GroupedGrid>`** to the Fluent UI v9 grid skin (`./v9`). v9's DataGrid has no
  native grouping primitive (unlike the v8 DetailsList `IGroup[]`), so this buckets rows by
  `group.groupBy` and renders a v9 `<Accordion>` — one collapsible `<AccordionItem>` per group, each
  hosting a v9 `<DataGrid>` over that group's slice (collapse/expand + count badges + per-group
  select-all come from the Accordion + each group's DataGrid). Selection is aggregated across
  groups; per-group subtotals are opt-in (`group.showGroupAggregates`) alongside an overall footer.

  The bucketing/labeling logic is a Fluent-free fork of the v8 `buildGroups`
  (`src/v9/hosts/buildGroups.ts`, returning an Accordion-friendly shape instead of the v8
  `IGroup[]`), drift-guarded by a test that compares it to the v8 source. New prop type:
  `V9GroupedGridProps`. The default (v8) `.` entry + generated output are unchanged. The **nested**
  host is the final v9 grid-host increment.

## 0.11.0

### Minor Changes

- d66bc60: Add two more hosts to the Fluent UI v9 grid skin (`./v9`):
  - **`<CardGrid>`** — a v9 card-view grid (each row a v9 `<Card>`), with the responsive
    `card.minCardWidth` reflow and checkbox selection. Fields render through the same v9 cell
    registry + `buildCellProps` as the v9 `<DataGrid>`.
  - **`<FocusedViewGrid>`** — a master-detail host: a summary rail (from `focusedView.rows`) + a
    detail pane (the active record's `detailFields`, or a nested `mode:'detail-pane'` child v9
    `<DataGrid>`), with search and container-relative rail-stacking below the `md` breakpoint.

  Both reuse the framework-agnostic core (`buildCellProps` / `getFieldValue` / `deriveIsNarrow` /
  `useContainerWidth` + the v9 registry). New props: `V9CardGridProps`, `V9FocusedViewGridProps`.
  The GROUPED + NESTED v9 hosts (no native v9 grouping / row-expansion primitive), editable lookup,
  and DnD remain follow-on v9 increments. The default (v8) `.` entry + generated output are
  unchanged.

## 0.10.0

### Minor Changes

- 16d15f3: Add inline editing to the Fluent UI v9 grid (`./v9`). The flat `<DataGrid>` now supports
  per-cell **click-to-edit** (and `editTrigger="always"`) with 5 v9 editable cells —
  `EditableTextCell`, `EditableNumberCell` (number + currency), `EditableDateCell` (date +
  datetime), `EditableOptionSetCell` (single + multi), and `EditableRatingCell` (click-to-set stars
  / sentiment faces) — over `@fluentui/react-components` (`Input` / `Dropdown` / interactive
  rating), plus a v9 `EditCellWrapper` (focus-on-enter, commit-on-blur, portal-aware).

  It reuses the SAME framework-agnostic edit-state pipeline as the v8 skin — the Fluent-free
  `useEditState` buffer + `buildCellProps` render context — and bubbles changes via
  `onValueChange(rowKey, fieldName, value, originalValue)`; `column.validate` feeds
  `onValidationError`. New v9 props: `editable`, `editTrigger`, `onValueChange`. The default (v8)
  `.` entry is unchanged and the v9 skin is still not vendored into export-engine (generated output
  stays v8). Editable **lookup** (async searchLookup) and the card / grouped / nested / focused
  hosts remain follow-on v9 increments.

## 0.9.0

### Minor Changes

- 97411bc: Add a Fluent UI v9 skin under the `./v9` subpath — a flat **read** `<DataGrid>` (over
  `@fluentui/react-components`) with the 13 read cell types re-skinned to v9, plus selection,
  controlled sort, loading, pagination, an aggregate footer, responsive column shedding, and a lean
  toolbar (`createV9CellRegistry`, `toDataGridColumns`, `createDynamicsV9Theme`).

  The v9 skin **shares the framework-agnostic core** with the default (v8) skin — the `ColumnDef`
  contract, the pure formatters / color / aggregate / responsive-shedding helpers, and the
  Fluent-free `buildCellProps` render context are reused, never forked. The default `.` (Fluent v8)
  entry is **unchanged**; the v9 Fluent packages (`@fluentui/react-components`,
  `@fluentui/react-icons`) are **optional peers** pulled only by `./v9` consumers. The v9 skin is
  **not vendored** into export-engine (generated projects stay Fluent v8). Inline editing and the
  card / grouped / nested / focused hosts remain v8-only — they are follow-on v9 increments (the v9
  registry keeps an `edit` seam open).

## 0.8.1

### Patch Changes

- 3e504a7: chore: add MIT license — populate the `license` field and ship a LICENSE file so npm
  reports the package as MIT (consistent with @dataverse-kit/api-service). Metadata only; no code
  change.
- Updated dependencies [3e504a7]
  - @khester/dynamics-cell-renderers@1.1.1
  - @khester/dynamics-utils@1.2.1

## 0.8.0

### Minor Changes

- 24c4cf1: DetailsList-backed hosts (DataGrid, ReadOnlyGrid, GroupedGrid, NestedGrid/NestedInline)
  now shed low-priority columns when their container narrows below the `md` (768px) breakpoint.
  Opt-in via a new `ColumnDef.responsivePriority` (higher = kept longer) + a pure `shedColumns`
  helper in `core/responsive.ts`; when no column declares a priority, nothing sheds (every existing
  grid is byte/behavior-identical). Shedding is presentation-only — the data, CSV export, filter,
  and aggregate scope keep the full column set, and the aggregate footer/subtotals are fed the same
  shed set so their cells stay aligned. Columns that declare an `aggregate`, and grid-kit's
  `__`-prefixed control columns (the nested-expand chevron and the `__nested` side-panel/hover
  trigger), are never shed. Container width is measured by a zero-height sentinel so the existing
  `fill` flex-height contract is untouched.

## 0.7.0

### Minor Changes

- 051e6ef: Add a container-relative responsive primitive and make `<FocusedViewGrid>` adapt to
  narrow containers. New pure `core/responsive.ts` (`GRID_BREAKPOINTS`, `resolveBreakpoint`,
  `deriveIsNarrow` — breakpoint numbers redeclared from surface-kit to avoid a dependency cycle) + a
  `useContainerWidth` ResizeObserver hook (ported from surface-kit's `useContainerSize`, SSR/no-DOM
  safe). Below the `md` (768px) container width, FocusedViewGrid collapses its fixed 320px rail +
  detail pane into a single full-width pane — the rail until a row is picked, then the detail pane
  with a Back affordance. At/above `md` (and at width 0 / first paint) the layout is the unchanged
  two-pane master/detail. Always-on and internal — no new props.

## 0.6.0

### Minor Changes

- 7939191: `<CardGrid>` / `<NestedCardParent>`: opt-in **responsive card columns** via the new
  `CardConfig.minCardWidth`. When set, the card grid reflows to the container width — `auto-fill`
  columns floored at `minCardWidth`, capped at `cardsPerRow` on wide screens, down to a single
  full-width column on mobile — instead of the fixed `cardsPerRow` layout. Unset keeps the existing
  fixed grid, so there is **no behavior change** for current consumers. The column track is built by
  a new shared pure helper `cardGridStyle(cardsPerRow, minCardWidth?)` reused by both card hosts
  (and the card gap is the shared `CARD_GRID_GAP`), so the two hosts can't drift. Requires modern
  CSS Grid + `min()`/`max()` (evergreen Chromium / Power Pages modern runtime; not IE11, consistent
  with CardGrid's existing modern-grid baseline).

## 0.5.0

### Minor Changes

- 70fb3cb: `<ReadOnlyGrid>` now forwards the full `toolbar` config — including `commands` — to its
  inner `<DataGrid>` instead of stripping everything but search. A read-only grid can therefore host
  non-selection toolbar actions (New / Refresh / Export) in the single host `<GridToolbar>`,
  alongside the injected Filter / Columns, rather than requiring an external command bar.
  `selectionMode` is still forced to `"none"`, so selection-dependent commands (delete/activate)
  remain inert and the consumer is expected to omit them; display-only read-only grids (no
  `toolbar`) are unchanged.

  This is the grid-kit half of the "A-full" subgrid toolbar consolidation: it lets the export-engine
  read-only subgrid emit one consolidated toolbar instead of two stacked bars. No existing consumer
  passes `toolbar.commands` to `<ReadOnlyGrid>`, so the change is behavior-neutral for current
  usage.

## 0.4.0

### Minor Changes

- edb21ce: Grouped grids: selection-gated multi-select toolbar (audit #11 follow-up — Phase B).

  **grid-kit `<GroupedGrid>`** now builds a Fluent v8 `Selection` (ported from `<DataGrid>`): it
  wires `onSelectionChanged`, passes a `selection` + a `getKey` to its grouped
  `ShimmeredDetailsList`, and reads the consumer's `getKey` via `useGridContext`. Row checkboxes
  (and group-header select-all) now drive `onSelectionChanged` with the checked rows.
  `selectionMode` defaults to `'none'`, so display-only / per-row-menu-only grids are unchanged.

  **export-engine** flips the grouped emitter from the read-only posture to the editable posture
  (mirroring the card host): a LIVE grouped grid whose toolbar renders now threads `selectionMode` +
  `onSelectionChanged` onto the emitted `<GroupedGrid>`, so the command bar's selection-gated
  buttons (delete/activate of the checked rows) populate from the selection. The delete-confirmation
  dialog gate widens to a bar Delete (`flatBarHasDelete`) since a bar Delete can now fire on
  grouped. A context-menu-only grouped grid threads no selection (its per-row menu acts on the
  right-clicked `__rowIndex`); display-only / mock / no-DAL / v9 grids stay unchanged.

  This completes the grouped-grid CRUD arc (Phase A shipped per-row CRUD + a non-selection toolbar
  in 1.14.0; Phase B adds the selection-gated multi-select toolbar). Cross-package: the grid-kit
  host change is re-vendored into export-engine in the same release (drift guard stays green).

## 0.3.0

### Minor Changes

- 03ff385: `NestedConfig` gains an optional `reloadToken?: string | number`. Bumping it invalidates
  and re-fetches the already-loaded children of expanded parents **in place** (old rows stay visible
  until the fresh ones arrive — no spinner flash). `useChildren` (inline + card-parent hosts),
  `NestedTriggerCell` (side-panel / hover-callout), and `FocusedViewGrid`'s detail pane all honor
  it. Use it to refresh a nested grid after associating/adding a child without forcing a collapse +
  re-expand. Backward-compatible (unset = a static child list, as before).

## 0.2.0

### Minor Changes

- 764d872: Per-row right-click context menus (`rowCommands`) for flat card-view subgrids.

  grid-kit `<CardGrid>` now honors `GridProps.rowCommands` — a per-card right-click context menu via
  the shared `useRowContextMenu` hook (mirroring `NestedCardParent`). The export-engine emitter
  wires a live v8 card subgrid's wired context-menu items onto `<CardGrid rowCommands={[…]}>`,
  reusing the same `handleGridCommand` dispatcher as the flat read-only/editable and nested paths
  (LIVE + v8 only; v9 cards fall back to the native DataGrid; in-memory cards stay menu-less).
