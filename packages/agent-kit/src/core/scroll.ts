/** How close to the bottom still counts as "at the bottom", in CSS pixels. */
export const STICK_TO_BOTTOM_THRESHOLD_PX = 32;

export interface ScrollGeometry {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

/**
 * Should an append scroll the transcript to the bottom?
 *
 * ★ The DECISION is extracted from the EFFECT on purpose. It is what lets a unit test
 *   express "the user scrolled up, so do not yank them back" without a real scroller —
 *   jsdom reports `scrollHeight`/`clientHeight` as 0 forever, so a test that drives a real
 *   element can only ever observe "at the bottom" and the interesting branch never runs.
 *
 * ★ The rule itself carries a MEASURED defect forward. apps/form-builder's ChatPane once
 *   keyed its scroll effect on the streaming message's content length, which queued a
 *   smooth `scrollTo` per token — 10+ per second — and jittered the viewport. The fix there
 *   was to key on message COUNT and use `behavior: 'auto'`. This adds the half that was
 *   still missing: only stick if the reader was already at the bottom, so scrolling up to
 *   re-read mid-stream is not undone.
 */
export function shouldStickToBottom(
  geometry: ScrollGeometry,
  thresholdPx: number = STICK_TO_BOTTOM_THRESHOLD_PX,
): boolean {
  const { scrollTop, scrollHeight, clientHeight } = geometry;
  const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
  return distanceFromBottom <= thresholdPx;
}
