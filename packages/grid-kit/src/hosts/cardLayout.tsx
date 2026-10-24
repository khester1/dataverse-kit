import type { CSSProperties } from 'react';
import { mergeStyles } from '@fluentui/react';
import type { CardConfig, ColumnDef } from '../types';

// Shared card-layout primitives for the card hosts (`<CardGrid>` flat cards +
// `<NestedCardParent>` expandable parent cards). The derivation is a PURE function
// (no hooks) so it's unit-testable without a DOM; the mergeStyles classes are shared
// so the two hosts can't drift apart visually.

/**
 * The gap (px) between cards. Single source of truth — used both for the grid's CSS
 * `gap` AND by `cardGridStyle` to size the responsive column cap, so the three numbers
 * can't desync.
 */
export const CARD_GRID_GAP = 12;

export const cardClass = mergeStyles({
  border: '1px solid #edebe9',
  borderRadius: 4,
  padding: 12,
  background: '#fff',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
});

export const cardImageClass = mergeStyles({
  width: '100%',
  height: 96,
  objectFit: 'cover',
  borderRadius: 2,
  marginBottom: 4,
});

export const bodyRowClass = mergeStyles({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 8,
  fontSize: 13,
});

/** Resolved card layout: which fields drive title/subtitle/image + the body columns. */
export interface ResolvedCardLayout<T> {
  cardsPerRow: number;
  /** Opt-in responsive minimum card width (px); undefined → fixed `cardsPerRow` grid. */
  minCardWidth?: number;
  titleField?: string;
  subtitleField?: string;
  imageField?: string;
  cardHeight?: number;
  byField: Map<string, ColumnDef<T>>;
  bodyColumns: ColumnDef<T>[];
}

/**
 * PURE: the CSS grid style for a card grid's column track (just the bits that depend
 * on `cardsPerRow` / `minCardWidth` — the host still sets `display`, `gap`, `paddingTop`).
 *
 * - **No `minCardWidth` (default):** a FIXED `cardsPerRow`-column grid —
 *   `repeat(cardsPerRow, minmax(0, 1fr))`, byte-identical to the original behavior.
 * - **With `minCardWidth`:** a RESPONSIVE grid that reflows to the container width.
 *   `auto-fill` (NOT `auto-fit`) packs as many `minCardWidth`-floored tracks as fit, so
 *   the count drops as the container narrows (down to a single column on mobile) and a
 *   lone card keeps its width instead of stretching. `min(minCardWidth, 100%)` stops a
 *   card overflowing a viewport narrower than `minCardWidth`. The `maxWidth` cap =
 *   `cardsPerRow` cards' worth of width, which is exactly the width at which the
 *   `cardsPerRow`-th column first fits — so the grid can never show MORE than
 *   `cardsPerRow` columns (on a wider container it left-aligns at `minCardWidth` cards
 *   rather than ballooning). Below the cap, `1fr` lets the visible cards grow to fill.
 */
export function cardGridStyle(cardsPerRow: number, minCardWidth?: number): CSSProperties {
  if (!minCardWidth || minCardWidth <= 0) {
    return { gridTemplateColumns: `repeat(${cardsPerRow}, minmax(0, 1fr))` };
  }
  return {
    gridTemplateColumns: `repeat(auto-fill, minmax(min(${minCardWidth}px, 100%), 1fr))`,
    maxWidth: cardsPerRow * minCardWidth + (cardsPerRow - 1) * CARD_GRID_GAP,
  };
}

/**
 * PURE derivation of a card layout from columns + config — no React hooks, so it's
 * directly unit-testable. Hosts wrap the call in their own `useMemo`. titleField
 * defaults to the first column; bodyColumns defaults to all columns except the
 * title/subtitle/image fields (explicit `bodyFields` are honored verbatim).
 */
export function resolveCardLayout<T>(
  columns: ColumnDef<T>[],
  card: CardConfig | undefined
): ResolvedCardLayout<T> {
  const cardsPerRow = card?.cardsPerRow ?? 3;
  const titleField = card?.titleField ?? columns[0]?.fieldName;
  const { subtitleField, imageField, cardHeight, minCardWidth } = card ?? {};

  const byField = new Map<string, ColumnDef<T>>();
  columns.forEach((c) => byField.set(c.fieldName, c));

  const explicit = card?.bodyFields;
  const bodyColumns = explicit
    ? (explicit.map((f) => byField.get(f)).filter(Boolean) as ColumnDef<T>[])
    : columns.filter(
        (c) =>
          !new Set([titleField, subtitleField, imageField].filter(Boolean) as string[]).has(
            c.fieldName
          )
      );

  return { cardsPerRow, minCardWidth, titleField, subtitleField, imageField, cardHeight, byField, bodyColumns };
}
