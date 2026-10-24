/**
 * Shared helpers for the v9 read cell components. These REUSE the framework-agnostic
 * grid-kit layers — `toReusableColumn` (the renderer-config mapping, Fluent-free) and
 * the pure `core/` color helpers — and add only the small v9-specific bits (a Fluent
 * v9 icon-name→element map, an inline badge style, and the sentiment-emoji data). No
 * `@fluentui/react` (v8) import: the two-skins eslint guard forbids it here.
 */
import React from 'react';
import {
  MoreHorizontalRegular,
  EditRegular,
  DeleteRegular,
  OpenRegular,
  EyeRegular,
  AddRegular,
  ArrowClockwiseRegular,
  CheckmarkRegular,
  DismissRegular,
  InfoRegular,
  WarningRegular,
  CircleRegular,
} from '@fluentui/react-icons';
import type { IReusableColumn } from '@khester/dynamics-cell-renderers';
import type { GridCellProps } from '../../types';
import { toReusableColumn } from '../../registry/columnMapping';

/** Map a grid-kit `ColumnDef` → the canonical config bag every cell reads its
 *  options off (Fluent-free — the same mapping the v8 skin uses). */
export function cellColumn<T>(props: GridCellProps<T>): IReusableColumn<T> {
  return toReusableColumn(props.column);
}

/**
 * What an EMPTY cell shows: `'-'` by default (the v8 renderers' placeholder), `''` under
 * `look="ce"` — the stock Dynamics subgrid leaves an empty cell blank. Provided by the
 * DataGrid host; a cell rendered outside one gets the default.
 */
export const EmptyCellTextContext = React.createContext<string>('-');

export function useEmptyCellText(): string {
  return React.useContext(EmptyCellTextContext);
}

/**
 * The display string for a text-shaped cell, honoring the v8 precedence:
 * user `formatValue` > host-supplied formatted value (already folded into
 * `props.formattedValue` by `buildCellProps`) > `''` (empty — the caller renders
 * `useEmptyCellText()` in its place).
 */
export function displayText<T>(props: GridCellProps<T>, col: IReusableColumn<T>): string {
  if (col.formatValue) {
    const s = col.formatValue(props.value, props.item);
    return s !== null && s !== undefined && s !== '' ? String(s) : '';
  }
  return props.formattedValue && props.formattedValue !== '' ? props.formattedValue : '';
}

/** Inline badge chrome — mirrors the v8 `coloredBadge` style (padding/radius/weight). */
export const badgeStyle: React.CSSProperties = {
  padding: '2px 8px',
  borderRadius: 4,
  fontSize: 12,
  fontWeight: 600,
  display: 'inline-block',
  lineHeight: '16px',
};

/** A minimal Fluent-v9 icon-name → element map for the `icon` cell (v8 used a string
 *  `iconName`; v9 icons are components). Unknown names fall back to a neutral glyph. */
const ICON_MAP: Record<string, React.ReactElement> = {
  More: <MoreHorizontalRegular />,
  MoreVertical: <MoreHorizontalRegular />,
  Edit: <EditRegular />,
  Delete: <DeleteRegular />,
  Open: <OpenRegular />,
  OpenInNewWindow: <OpenRegular />,
  View: <EyeRegular />,
  RedEye: <EyeRegular />,
  Add: <AddRegular />,
  Refresh: <ArrowClockwiseRegular />,
  CheckMark: <CheckmarkRegular />,
  Accept: <CheckmarkRegular />,
  Cancel: <DismissRegular />,
  Clear: <DismissRegular />,
  Info: <InfoRegular />,
  Warning: <WarningRegular />,
};

/** Resolve a v8-style icon name to a v9 icon element (default: a neutral glyph). */
export function resolveIcon(iconName?: string): React.ReactElement {
  return (iconName && ICON_MAP[iconName]) || <CircleRegular />;
}

// ── sentiment-emoji data (inlined so the v9 skin stays self-contained; mirrors the
//    pure helpers in @khester/dynamics-cell-renderers' emojiRating, minus the v8 icon
//    names — v9 renders unicode faces instead of a Fluent icon-by-name). ──

/** Unicode sentiment faces per count (2–5), red→green sentiment order. */
const EMOJI_FACES: Record<number, string[]> = {
  2: ['🙁', '🙂'],
  3: ['🙁', '😐', '🙂'],
  4: ['😞', '🙁', '🙂', '😀'],
  5: ['😞', '🙁', '😐', '🙂', '😀'],
};

/** Accessible labels per count, aligned to `EMOJI_FACES`. */
const EMOJI_LABELS: Record<number, string[]> = {
  2: ['Unhappy', 'Happy'],
  3: ['Unhappy', 'Neutral', 'Happy'],
  4: ['Very Unhappy', 'Unhappy', 'Happy', 'Very Happy'],
  5: ['Very Unhappy', 'Unhappy', 'Neutral', 'Happy', 'Very Happy'],
};

/** Sentiment colors (red→green) per count, aligned to `EMOJI_FACES`. */
const EMOJI_COLORS: Record<number, string[]> = {
  2: ['#d13438', '#107c10'],
  3: ['#d13438', '#c8c820', '#107c10'],
  4: ['#d13438', '#ca5010', '#498205', '#107c10'],
  5: ['#d13438', '#ca5010', '#c8c820', '#498205', '#107c10'],
};

/** Clamp a face count into the supported 2–5 range (falls back to ratingMax, then 5). */
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

export const emojiData = { EMOJI_FACES, EMOJI_LABELS, EMOJI_COLORS };
