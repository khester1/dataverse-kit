import React from 'react';
import { Icon } from '@fluentui/react';
import { CellRendererProps } from '../types';
import { ratingCellClass, ratingStarClass } from '../styles';
import { EMOJI_SETS, EMOJI_COLORS, clampFaceCount, selectedFaceIndex } from './emojiRating';

/**
 * Rating cell renderer.
 * Displays a star rating (e.g. 0–5) from a numeric value. With `ratingAllowHalf`
 * (default true) each star fills to the exact fraction of the value (so 3.5 shows
 * three and a half filled stars); set it false to floor to whole stars.
 *
 * NOTE: the default `ratingStyle: 'stars'` uses unicode stars colored via CSS
 * `background-clip: text`, so no Fluent icon registration is required. The
 * `ratingStyle: 'emoji'` (sentiment faces) variant renders Fluent `<Icon>`s and
 * therefore REQUIRES the host to have called `initializeIcons()` (same as IconCell).
 */
export function RatingCell<T>({ value, column }: CellRendererProps<T>): JSX.Element {
  // Emoji (sentiment) style: a single selected face, optionally sentiment-colored.
  if (column.ratingStyle === 'emoji') {
    const faceCount = clampFaceCount(column.ratingFaceCount, column.ratingMax);
    const set = EMOJI_SETS[faceCount];
    const idx = selectedFaceIndex(value, faceCount); // 1-based, 0 = none
    if (idx === 0) {
      return (
        <div className={ratingCellClass} role="img" aria-label="No rating">
          –
        </div>
      );
    }
    const useColor = column.ratingUseSentimentColor !== false; // default true for emoji
    const color = useColor ? EMOJI_COLORS[faceCount][idx - 1] : column.ratingColor || '#605e5c';
    return (
      <div
        className={ratingCellClass}
        role="img"
        aria-label={`${set.labels[idx - 1]} (${idx} out of ${faceCount})`}
      >
        <Icon iconName={set.icons[idx - 1]} style={{ color, fontSize: 18 }} />
      </div>
    );
  }

  const max = column.ratingMax && column.ratingMax > 0 ? Math.floor(column.ratingMax) : 5;
  const filledColor = column.ratingColor || '#ffb900';
  const emptyColor = '#c8c6c4';
  const allowHalf = column.ratingAllowHalf !== false;

  const raw = typeof value === 'number' ? value : Number(value);
  const rating = Number.isFinite(raw) ? Math.min(max, Math.max(0, raw)) : 0;

  const stars: JSX.Element[] = [];
  for (let i = 1; i <= max; i++) {
    // Fraction of THIS star that is filled (0..1).
    let frac = Math.max(0, Math.min(1, rating - (i - 1)));
    if (!allowHalf) frac = frac >= 1 ? 1 : 0; // whole-star (floor) rounding
    const pct = Math.round(frac * 100);
    stars.push(
      <span
        key={i}
        className={ratingStarClass}
        style={{
          background: `linear-gradient(90deg, ${filledColor} ${pct}%, ${emptyColor} ${pct}%)`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          WebkitTextFillColor: 'transparent',
        }}
        aria-hidden="true"
      >
        ★
      </span>
    );
  }

  // Announce what is actually shown: the exact value (half mode) or the floored
  // whole-star count.
  const announced = allowHalf ? rating : Math.floor(rating);
  return (
    <div className={ratingCellClass} role="img" aria-label={`${announced} out of ${max}`}>
      {stars}
    </div>
  );
}
