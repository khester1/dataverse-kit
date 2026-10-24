# @dataverse-kit/calendar-kit

A calendar for the Microsoft stack, built on [FullCalendar v7](https://fullcalendar.io) (MIT
views only). You give it plain event objects; it knows nothing about Dataverse. The Dataverse
rules live in separate entries, so the same calendar serves a PCF control, a Power Apps code app
and a Power Pages site.

```bash
npm install @dataverse-kit/calendar-kit
# peers: react@18 or 19, react-dom@18 or 19; @fluentui/react-components@9 only for ./v9
```

## Entries

| Import | What | Pulls in |
|---|---|---|
| `@dataverse-kit/calendar-kit` | `CalendarView` — no Fluent (use this on Power Pages) | React, FullCalendar |
| `…/v9` | `FluentCalendar` — themed from the surrounding `FluentProvider` | + Fluent v9 |
| `…/core` | event contract, value kinds, zone conversion, colours | nothing |
| `…/dataverse` | DateTime behaviours, column mapping, Web API / form-parameter writers | nothing |
| `…/adapters/pcf-dataset` | PCF dataset → events, range filter, not-found detection | nothing |
| `…/adapters/code-app` | a code app's generated Dataverse service as a data source (read + drag) | nothing |
| `…/adapters/portal` | Power Pages `/_api` as a **read-only** data source (pick a slot) | nothing |
| `…/fake` | seeded sample events and an in-memory data source | nothing |

## Use it

```tsx
import { FluentCalendar } from '@dataverse-kit/calendar-kit/v9';

<FluentCalendar
  events={[
    { id: '1', title: 'Consultation', start: '2026-09-30T15:00:00Z', end: '2026-09-30T15:30:00Z' },
    { id: '2', title: 'Clinic closed', start: '2026-10-02', end: '2026-10-03' },
  ]}
  view="week"
  editable
  onEventChange={async (change) => {
    await save(change); // reject → the event snaps back and a message is shown
  }}
  onSelectRange={(slot) => openQuickCreate(slot)}
  onEventClick={(event) => openRecord(event.id)}
  onRangeChange={(range) => load(range)}
/>;
```

### Values: the shape of the text is its meaning

| Text | Kind | Dataverse behaviour |
|---|---|---|
| `2026-09-29` | a day (all-day) | DateOnly |
| `2026-09-29T23:30:00` | a wall-clock time, same face everywhere | TimeZoneIndependent |
| `2026-09-30T06:30:00Z` | an instant, shown in the viewer's zone | UserLocal |

An event keeps its kind through a drag. All-day `end` is **exclusive** (the day after).

### Time zone

Pass `zone` — a function returning minutes **east** of UTC for an instant. In a PCF control that
is the Dynamics user's zone:

```ts
const zone = (d: Date) => context.userSettings.getTimeZoneOffsetMinutes(d);
```

Without it the browser's zone is used, which is wrong whenever the two differ.

### In a PCF dataset control

```ts
import { resolveColumnMap, resolveBehaviors, readDatasetEvents, buildRangeFilter } from '@dataverse-kit/calendar-kit/adapters/pcf-dataset';
import { toWebApiPatch, toQuickCreateParameters } from '@dataverse-kit/calendar-kit/dataverse';
```

Map columns with manifest property-sets named `startColumn`, `endColumn`, `titleColumn`,
`colorColumn`, `groupColumn`, `allDayColumn`.

### In a Power Apps code app

The generated service (`pa app add data-source --connector dataverse --table <t>`) is passed in as is — the kit does not import
the code-apps SDK. `useCalendarSource` loads each visible range, saves a drag and reloads.

```tsx
import { useCalendarSource } from '@dataverse-kit/calendar-kit';
import { FluentCalendar } from '@dataverse-kit/calendar-kit/v9';
import { createCodeAppSource } from '@dataverse-kit/calendar-kit/adapters/code-app';
import { DateTimeBehavior } from '@dataverse-kit/calendar-kit/dataverse';
import { AppointmentsService } from './generated/services/AppointmentsService';

const source = useMemo(() => createCodeAppSource({
  service: AppointmentsService,
  idColumn: 'activityid',
  map: { start: 'scheduledstart', end: 'scheduledend', title: 'subject', group: '_ownerid_value' },
  behaviors: { scheduledstart: DateTimeBehavior.UserLocal, scheduledend: DateTimeBehavior.UserLocal },
  filter: 'statecode eq 0',
}), []);
const cal = useCalendarSource(source);
return <FluentCalendar {...cal.props} view="week" />;
```

- ★ **Code apps do not run in the Power Apps mobile player** — browser and Windows only.
- ★ Column names are **Web API property names**: a lookup is `_ownerid_value`, not `ownerid`.

### On a Power Pages site

```tsx
import { CalendarView, useCalendarSource } from '@dataverse-kit/calendar-kit';
import { createPortalSource } from '@dataverse-kit/calendar-kit/adapters/portal';

const source = useMemo(() => createPortalSource({
  entitySet: 'dvk_slots',
  idColumn: 'dvk_slotid',
  map: { start: 'dvk_start', end: 'dvk_end', title: 'dvk_name', group: '_dvk_locationid_value' },
  behaviors: { dvk_start: DateTimeBehavior.UserLocal, dvk_end: DateTimeBehavior.UserLocal },
  filter: 'statuscode eq 1',            // open slots only
  onPick: (slot) => setChosen(slot),    // booking is the page's job, not the calendar's
}), []);
const cal = useCalendarSource(source);
return <CalendarView {...cal.props} view="week" />;
```

Read-only by design: it never writes, so it needs no anti-forgery token. The site needs
`Webapi/<table>/enabled`, `Webapi/<table>/fields` listing **every** mapped column (a missing one is
dropped silently, not an error), and a Read table permission for the visitor's web role. Every
call counts against portal capacity; the range filter keeps each one to the visible weeks.

### Date behaviours are configuration outside PCF

Neither host can tell you a column's DateTime behaviour: a code app's `getMetadata` returns base
`AttributeMetadata` only (the behaviour is on the derived type), and Power Pages has no metadata
endpoint. Pass `behaviors`. An unlisted date column is treated as UserLocal and listed in
`source.guessed` — a TimeZoneIndependent column guessed that way shows shifted, so check it once.

## Measured facts this package encodes

Measured on a live Dataverse org, not taken from documentation; each is pinned by a test.

- A dataset's `getValue()` on a date column returns an **ISO string**, not a `Date` — for all three
  behaviours. DateOnly arrives as UTC midnight, so reading it through `new Date()` gives the
  previous day west of UTC.
- TimeZoneIndependent and UserLocal columns report the same `dataType`; only metadata
  (`Behavior` 1/2/3) tells them apart.
- `webAPI.updateRecord` and `navigation.openForm` parameters are **different contracts** — see
  `src/dataverse/dates.ts`. A bare `YYYY-MM-DD` quick-create parameter stored the previous day.
- A dataset range filter is ANDed with the view's own filter.
- **Code app (live, 2026-09-29, React 19 template):** the generated service returns
  `{ success, data, skipToken, count, error }`; the next page arrives as **`skipToken`** (a Dataverse
  paging cookie), which the adapter passes back — 2 + 2 + 1 rows at `maxPageSize: 2`. Rows are Web
  API shaped (`…Z` instants, FormattedValue annotations included without asking). A move written
  through `service.update` changed exactly that row (`modifiedon` witness).
- **Power Pages (live, traditional portal):** the range + `statuscode` filter returned exactly the
  open slots; a lookup's FormattedValue label came back for a role with **no** read permission on
  the target table. On a PRIVATE site a signed-in maker previews as the **Anonymous** web role.
- Both hosts: one load per mount. (Before 0.3.0 the hook loaded twice — the calendar reports its
  range from a child effect that runs first.)
- The pull sources' `$filter` literals, checked at both edges of a week on the Web API: a
  DateOnly column needs a **bare day** (an instant is compared by its UTC date, which is wrong for
  any week east of UTC), and a TimeZoneIndependent column needs the **wall clock + `Z`** (an
  instant was 7 hours out in Pacific). Measured through the Dataverse Web API; the code-app
  connector and Power Pages `/_api` pass the same `$filter` through but were not run themselves.

## Known limits

- The root and `./v9` entries import FullCalendar (ESM) and its CSS, so they are for **bundlers**
  (Vite, webpack, pcf-scripts). Their `.cjs` builds cannot be `require()`d from plain Node. The
  pure entries (`./core`, `./dataverse`, `./adapters/*`, `./fake`) work anywhere.
- Importing both the root and `./v9` bundles `CalendarView` twice. Pick one.
- Paging is capped (`maxRows`, default 1000) so a connector that always returns a page token stops.
- Power Pages `/_api` ignored `Prefer: odata.maxpagesize` (measured at 2: all rows came back in one
  page). The adapter's `@odata.nextLink` loop is correct but was only exercised by unit tests.
- On a spring-forward day a selection inside the missing hour has zero length (that hour does
  not exist in the zone).

## Licensing

MIT. Uses only FullCalendar's MIT views (day grid, time grid, list, multi-month, interaction).
FullCalendar Premium (resource and timeline views) is **not** included or required.

**Stack:** React 18 · FullCalendar 7.1 · Fluent UI v9 (optional) · TypeScript · tsup
