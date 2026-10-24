import type { ZoneOffset } from '../core/types';

/**
 * A synthetic US-Pacific zone for 2026, from the published transition instants — so DST rules
 * are tested against KNOWN offsets, not against whatever tz database the runner has.
 *   PDT begins 2026-03-08 10:00Z (02:00 PST → 03:00 PDT)
 *   PDT ends   2026-11-01 09:00Z (02:00 PDT → 01:00 PST)
 */
export const pacific2026: ZoneOffset = (d) => {
  const t = d.getTime();
  return t >= Date.UTC(2026, 2, 8, 10) && t < Date.UTC(2026, 10, 1, 9) ? -420 : -480;
};

export const tokyo: ZoneOffset = () => 540;

/**
 * A synthetic Central-European zone for 2026 — EAST of UTC, where the overlap/gap arithmetic
 * runs the other way. (The first fromWall passed every Pacific test and was wrong here.)
 *   CEST begins 2026-03-29 01:00Z (02:00 CET → 03:00 CEST)
 *   CEST ends   2026-10-25 01:00Z (03:00 CEST → 02:00 CET)
 */
export const berlin2026: ZoneOffset = (d) => {
  const t = d.getTime();
  return t >= Date.UTC(2026, 2, 29, 1) && t < Date.UTC(2026, 9, 25, 1) ? 120 : 60;
};
