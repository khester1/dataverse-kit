# @dataverse-kit/calendar-kit

## 0.3.0

### Minor Changes

- 8bb4ef7: Findings from running the pull sources in a live Power Apps code app and a live Power
  Pages site:
  - **React 19 is supported.** Microsoft's code-app template ships React 19, and the `^18.2.0` peer
    made `npm install @dataverse-kit/calendar-kit` fail with ERESOLVE there. Peers are now
    `^18.2.0 || ^19.0.0`; the suite (3 time zones), typecheck and build pass on React 19, and a live
    code app rendered and saved on it.
  - **`useCalendarSource` loads once per mount.** The calendar reports its range from a child effect
    that runs before the hook's mount effect, so every mount issued two loads (three under
    StrictMode) — on Power Pages each is a billed call. Now one; a new source still re-queries.
  - README: the code-app paging field (`skipToken`) and the portal behaviours are now measured
    facts.

## 0.2.1

### Patch Changes

- e80d294: Docs only: the pull sources' DateOnly and TimeZoneIndependent `$filter` literals are now
  measured on a live org (both week edges, Pacific and a Tokyo-shaped week), and a test pins the
  east-of-UTC DateOnly case. No behaviour change.

## 0.2.0

### Minor Changes

- 6bbd65d: Pull sources for hosts that query rather than push:
  - `./adapters/code-app` — `createCodeAppSource({ service, idColumn, map, behaviors })` over a
    Power Apps code app's generated Dataverse service (`getAll` / `update`); follows paging, bounded
    by `maxRows`; an error envelope rejects instead of rendering an empty week.
  - `./adapters/portal` — `createPortalSource({ entitySet, idColumn, map, onPick })`, read-only over
    Power Pages `/_api`; follows `@odata.nextLink`, requests formatted values, and a 401/403 names
    the site setting and table permission to check.
  - `useCalendarSource(source)` in the root entry — loads each visible range (only the newest
    response lands), saves a drag through the source and reloads, and re-throws a failed save so the
    calendar reverts it.
  - `./dataverse` adds `createPullSource`, `buildODataRangeFilter`, `andFilters`, `selectFor`,
    `webApiRowAccessor`.

  Date behaviours are configuration for these hosts (neither exposes them); unlisted date columns
  are reported in `source.guessed`.

## 0.1.0

### Minor Changes

- 40fee3a: New package: a FullCalendar v7 calendar (MIT views only) fed plain events, with a
  Fluent-free root entry (Power Pages) and a Fluent v9 `./v9` entry. `./core` holds the event
  contract and zone conversion; `./dataverse` and `./adapters/pcf-dataset` encode Dataverse's three
  DateTime behaviours and the two different write contracts (Web API vs quick-create form
  parameters), all measured on a live org.
