// Pure card-layout helpers for the v9 CardGrid — a Fluent-FREE fork of the pure
// functions in src/hosts/cardLayout.tsx (`cardGridStyle` / `resolveCardLayout` /
// `CARD_GRID_GAP`). We fork rather than import because cardLayout.tsx also declares
// top-level `mergeStyles(...)` class constants (a Fluent-v8 side effect at module
// load) — importing anything from it risks pulling @fluentui/react into the v9
// bundle. The LOGIC here is identical to the v8 source; keep the two in sync by
// convention (the responsive minCardWidth formula in particular).
import type { CSSProperties } from 'react';
import type { CardConfig, ColumnDef } from '../../types';

/** Gap (px) between cards — also feeds the responsive column-cap width. */
export const CARD_GRID_GAP = 12;

/** Resolved card layout: which fields drive title/subtitle/image + the body columns. */
export interface ResolvedCardLayout<T> {
  cardsPerRow: number;
  minCardWidth?: number;
  titleField?: string;
  subtitleField?: string;
  imageField?: string;
  cardHeight?: number;
  byField: Map<string, ColumnDef<T>>;
  bodyColumns: ColumnDef<T>[];
}

/**
 * The CSS grid column track. No `minCardWidth` → a fixed `cardsPerRow`-column grid;
 * with `minCardWidth` → a responsive `auto-fill` reflow capped at `cardsPerRow`
 * columns (down to one on mobile). Mirrors the v8 `cardGridStyle` exactly.
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

/** PURE derivation of the card layout from columns + config (mirrors v8 `resolveCardLayout`). */
export function resolveCardLayout<T>(columns: ColumnDef<T>[], card: CardConfig | undefined): ResolvedCardLayout<T> {
  const cardsPerRow = card?.cardsPerRow ?? 3;
  const titleField = card?.titleField ?? columns[0]?.fieldName;
  const { subtitleField, imageField, cardHeight, minCardWidth } = card ?? {};

  const byField = new Map<string, ColumnDef<T>>();
  columns.forEach((c) => byField.set(c.fieldName, c));

  const explicit = card?.bodyFields;
  const bodyColumns = explicit
    ? (explicit.map((f) => byField.get(f)).filter(Boolean) as ColumnDef<T>[])
    : columns.filter(
        (c) => !new Set([titleField, subtitleField, imageField].filter(Boolean) as string[]).has(c.fieldName),
      );

  return { cardsPerRow, minCardWidth, titleField, subtitleField, imageField, cardHeight, byField, bodyColumns };
}
