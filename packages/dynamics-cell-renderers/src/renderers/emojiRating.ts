/**
 * Shared emoji-rating data + helpers for the 'emoji' rating style.
 *
 * Ported from the form-designer rating control (sentiment faces, 2–5 count).
 * Used by both the read-only `RatingCell` (single selected face) and the
 * `EditableRatingCell` (clickable face row).
 *
 * NOTE: the emoji style renders Fluent `<Icon>` faces, which require the host to
 * have called `initializeIcons()`. The 'stars' style stays icon-registration-free.
 */

/** Fluent icon names + accessible labels per face count (2–5). */
export const EMOJI_SETS: Record<number, { icons: string[]; labels: string[] }> = {
  2: { icons: ['EmojiDisappointed', 'Emoji'], labels: ['Unhappy', 'Happy'] },
  3: {
    icons: ['EmojiDisappointed', 'EmojiNeutral', 'Emoji'],
    labels: ['Unhappy', 'Neutral', 'Happy'],
  },
  4: {
    icons: ['EmojiDisappointed', 'Sad', 'Emoji2', 'Emoji'],
    labels: ['Very Unhappy', 'Unhappy', 'Happy', 'Very Happy'],
  },
  5: {
    icons: ['EmojiDisappointed', 'Sad', 'EmojiNeutral', 'Emoji2', 'Emoji'],
    labels: ['Very Unhappy', 'Unhappy', 'Neutral', 'Happy', 'Very Happy'],
  },
};

/** Sentiment colors (red→green) per face count, aligned to `EMOJI_SETS`. */
export const EMOJI_COLORS: Record<number, string[]> = {
  2: ['#d13438', '#107c10'],
  3: ['#d13438', '#c8c820', '#107c10'],
  4: ['#d13438', '#ca5010', '#498205', '#107c10'],
  5: ['#d13438', '#ca5010', '#c8c820', '#498205', '#107c10'],
};

/** Clamp a face count into the supported 2–5 range, falling back to ratingMax then 5. */
export function clampFaceCount(faceCount?: number, ratingMax?: number): number {
  const raw = faceCount ?? ratingMax ?? 5;
  const n = Math.floor(Number(raw));
  return Math.max(2, Math.min(5, Number.isFinite(n) ? n : 5));
}

/** 1-based selected face index from a numeric value (0 = none/unset). */
export function selectedFaceIndex(value: unknown, faceCount: number): number {
  const raw = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.min(faceCount, Math.max(1, Math.round(raw)));
}
