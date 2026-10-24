/**
 * Rows in the shape the Dataverse WEB API returns (a code app's connector and Power Pages `/_api`
 * both pass it through) — deliberately NOT the dataset shape:
 *  - UserLocal: an instant, no milliseconds (`…T16:00:00Z`);
 *  - DateOnly: a BARE date (`2026-09-29`) — the dataset gives UTC midnight instead;
 *  - TimeZoneIndependent: the face value with a misleading `Z`;
 *  - choices / lookups: the raw value, with the label only in the FormattedValue ANNOTATION;
 *  - a lookup under its `_x_value` property name.
 */
const F = '@OData.Community.Display.V1.FormattedValue';

export const RANGE = {
  start: '2026-09-28T07:00:00.000Z', // Mon 28 Sep 00:00 PDT
  end: '2026-10-05T07:00:00.000Z',
  view: 'timeGridWeek',
  startDate: '2026-09-28',
  endDate: '2026-10-05',
};

export const ROWS = [
  {
    dvk_slotid: 'a1',
    dvk_name: 'Consult',
    dvk_start: '2026-09-28T16:00:00Z',
    dvk_end: '2026-09-28T17:00:00Z',
    _dvk_locationid_value: '7d1c0000-0000-0000-0000-000000000001',
    [`_dvk_locationid_value${F}`]: 'North clinic',
    statuscode: 1,
    [`statuscode${F}`]: 'Open',
  },
  {
    dvk_slotid: 'b2',
    dvk_name: 'Holiday',
    dvk_day: '2026-09-29',
    dvk_dayend: '2026-09-29',
  },
  {
    dvk_slotid: 'c3',
    dvk_name: 'Floating',
    dvk_tzi: '2026-09-30T09:00:00Z',
  },
] as const;
