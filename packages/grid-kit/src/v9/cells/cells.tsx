/**
 * The Fluent UI v9 read cell components — the v9 counterparts of the 13 canonical
 * @khester/dynamics-cell-renderers read renderers. Each takes the SAME grid-kit
 * `GridCellProps` contract the v8 registry speaks (so the v9 adapter resolves them
 * identically) and renders over `@fluentui/react-components`, reusing the pure
 * `core/` color helpers + the `toReusableColumn` config mapping. No `@fluentui/react`
 * (v8) — the two-skins eslint guard forbids it in `src/v9/`.
 */
import React from 'react';
import { Text, Link, Switch, Button, Tooltip, tokens } from '@fluentui/react-components';
import type { GridCellProps } from '../../types';
import { getContrastColor, normalizeHexColor } from '../../core';
import {
  cellColumn,
  displayText,
  useEmptyCellText,
  badgeStyle,
  resolveIcon,
  clampFaceCount,
  selectedFaceIndex,
  emojiData,
} from './util';

const ellipsis: React.CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  display: 'block',
  maxWidth: '100%',
};

// Link/lookup values read as (themed) link-colored text (Dynamics grid convention),
// even without a click handler wired.
const linkText: React.CSSProperties = { ...ellipsis, color: tokens.colorBrandForegroundLink };

/** text / date / datetime — a formatted, ellipsised value. */
export function TextCell<T>(props: GridCellProps<T>): JSX.Element {
  const col = cellColumn(props);
  const text = displayText(props, col);
  const empty = useEmptyCellText();
  return (
    <Text title={text || undefined} style={ellipsis}>
      {text || empty}
    </Text>
  );
}

/** number — right-aligned formatted value. */
export function NumberCell<T>(props: GridCellProps<T>): JSX.Element {
  const col = cellColumn(props);
  const text = displayText(props, col);
  const empty = useEmptyCellText();
  return (
    <Text title={text || undefined} style={{ ...ellipsis, textAlign: 'right', width: '100%' }}>
      {text || empty}
    </Text>
  );
}

/** currency — right-aligned, monospace formatted value. */
export function CurrencyCell<T>(props: GridCellProps<T>): JSX.Element {
  const col = cellColumn(props);
  const text = displayText(props, col);
  const empty = useEmptyCellText();
  return (
    <Text
      title={text || undefined}
      style={{ ...ellipsis, textAlign: 'right', width: '100%', fontFamily: 'Consolas, "Courier New", monospace' }}
    >
      {text || empty}
    </Text>
  );
}

/** link — a clickable Fluent v9 Link (calls `column.onLinkClick`). */
export function LinkCell<T>(props: GridCellProps<T>): JSX.Element {
  const col = cellColumn(props);
  // Honor a user `formatValue` first (v8 parity via applyDisplayValue), else the
  // supplied/computed formattedValue, else the "(No Name)" placeholder.
  const raw = col.formatValue ? col.formatValue(props.value, props.item) : props.formattedValue;
  const text = raw !== null && raw !== undefined && raw !== '' ? String(raw) : '(No Name)';
  const onClick = col.onLinkClick;
  if (!onClick) {
    return (
      <Text title={text} style={linkText}>
        {text}
      </Text>
    );
  }
  return (
    <Link title={text} onClick={() => onClick(props.item)} style={ellipsis as React.CSSProperties}>
      {text}
    </Link>
  );
}

/** lookup — display the related record label; a Link when a click handler is wired. */
/**
 * The name a lookup cell SHOWS ('' = empty). One resolver, shared by `LookupCell` and the lookup editor's
 * starting text, so the two always agree.
 */
export function lookupDisplayText<T>(props: GridCellProps<T>): string {
  const col = cellColumn(props);
  if (col.formatValue) return String(col.formatValue(props.value, props.item) ?? '');
  if (col.lookupDisplayField && props.item && typeof props.item === 'object') {
    const v = (props.item as Record<string, unknown>)[col.lookupDisplayField];
    return v !== null && v !== undefined ? String(v) : '';
  }
  if (typeof props.value === 'object' && props.value !== null) {
    const o = props.value as Record<string, unknown>;
    return String(o.name || o.fullname || o.title || props.suppliedFormattedValue || '');
  }
  // Prefer the host-supplied / computed formatted value (a lookup's display label typically arrives as
  // the Dataverse FormattedValue, folded into formattedValue by buildCellProps), falling back to raw.
  return (
    props.suppliedFormattedValue ??
    (props.formattedValue && props.formattedValue !== ''
      ? props.formattedValue
      : props.value !== null && props.value !== undefined
      ? String(props.value)
      : '')
  );
}

export function LookupCell<T>(props: GridCellProps<T>): JSX.Element {
  const col = cellColumn(props);
  const empty = useEmptyCellText();
  // '' = empty: rendered as `empty` ('-', or blank under look="ce") and never as a link.
  const text = lookupDisplayText(props);
  if (col.onLinkClick && text) {
    const onClick = col.onLinkClick;
    return (
      <Link title={text} onClick={() => onClick(props.item)} style={ellipsis as React.CSSProperties}>
        {text}
      </Link>
    );
  }
  // A resolved lookup value reads as a blue link (Dynamics convention); an empty
  // value stays muted.
  return (
    <Text title={text || undefined} style={text ? linkText : ellipsis}>
      {text || empty}
    </Text>
  );
}

const DEFAULT_OPTIONSET_COLORS: Record<number, string> = {
  0: '#107c10',
  1: '#d13438',
  2: '#0078d4',
  3: '#ffb900',
  4: '#605e5c',
};

interface ResolvedBadge {
  label: string;
  bg: string;
}

function resolveBadge<T>(v: unknown, props: GridCellProps<T>): ResolvedBadge | null {
  if (v === null || v === undefined || v === '') return null;
  const col = cellColumn(props);
  const option = col.optionSetOptions?.find((o) => String(o.value) === String(v));
  const label =
    option?.label ??
    (col.formatValue ? col.formatValue(v, props.item) : props.suppliedFormattedValue ?? String(v));
  if (!label || label === '-') return null;

  let bg: string | undefined = option?.color;
  if (!bg && col.getBackgroundColor) bg = col.getBackgroundColor(v as string | number);
  if (!bg && col.colorMap) bg = col.colorMap[typeof v === 'number' ? v : String(v)];
  if (!bg && typeof v === 'number' && v in DEFAULT_OPTIONSET_COLORS) bg = DEFAULT_OPTIONSET_COLORS[v];
  if (!bg) bg = '#c8c6c4';
  return { label: String(label), bg: normalizeHexColor(bg) };
}

/** optionset — one colored badge per value (single value or a multi-select array). */
export function OptionSetCell<T>(props: GridCellProps<T>): JSX.Element {
  const multi = Array.isArray(props.value);
  const values = multi ? (props.value as unknown[]) : [props.value];
  const badges = values.map((v) => resolveBadge(v, props)).filter((b): b is ResolvedBadge => b !== null);
  const empty = useEmptyCellText();
  if (badges.length === 0) return <Text>{empty}</Text>;
  return (
    <span style={multi ? { display: 'flex', gap: 4, flexWrap: 'wrap' } : undefined}>
      {badges.map((b, i) => (
        <span key={`${b.label}-${i}`} style={{ ...badgeStyle, backgroundColor: b.bg, color: getContrastColor(b.bg) }}>
          {b.label}
        </span>
      ))}
    </span>
  );
}

/** coloredCell — text with a value-derived colored background (plain text if none). */
export function ColoredCell<T>(props: GridCellProps<T>): JSX.Element {
  const col = cellColumn(props);
  const text = displayText(props, col);
  const empty = useEmptyCellText();
  if (!text) return <Text>{empty}</Text>;
  let bg: string | undefined;
  if (col.getBackgroundColor && props.value !== null && props.value !== undefined) {
    bg = col.getBackgroundColor(props.value as string | number);
  } else if (col.colorMap && props.value !== null && props.value !== undefined) {
    bg = col.colorMap[typeof props.value === 'number' ? props.value : String(props.value)];
  }
  if (!bg) {
    return (
      <Text title={text} style={ellipsis}>
        {text}
      </Text>
    );
  }
  const normalized = normalizeHexColor(bg);
  return (
    <span style={{ ...badgeStyle, backgroundColor: normalized, color: getContrastColor(normalized) }} title={text}>
      {text}
    </span>
  );
}

/** boolean / toggle — a read-only v9 Switch reflecting the boolean value. */
export function ToggleCell<T>(props: GridCellProps<T>): JSX.Element {
  const col = cellColumn(props);
  const on = Boolean(props.value);
  const label = on ? col.toggleOnText || 'Yes' : col.toggleOffText || 'No';
  return <Switch checked={on} disabled aria-label={label} />;
}

/** icon — a subtle v9 icon button (calls `column.onIconClick`). */
export function IconCell<T>(props: GridCellProps<T>): JSX.Element {
  const col = cellColumn(props);
  const title = col.iconTitle || col.name || 'Action';
  const btn = (
    <Button
      appearance="subtle"
      size="small"
      icon={resolveIcon(col.iconName)}
      aria-label={title}
      onClick={(e) => {
        e.stopPropagation();
        col.onIconClick?.(props.item);
      }}
    />
  );
  return (
    <Tooltip content={title} relationship="label" withArrow>
      {btn}
    </Tooltip>
  );
}

/** progress — a horizontal bar (arbitrary `progressColor` + optional % label). */
export function ProgressBarCell<T>(props: GridCellProps<T>): JSX.Element {
  const col = cellColumn(props);
  const numeric = typeof props.value === 'number' ? props.value : 0;
  const max = col.progressMax || 100;
  const pct = Math.min(100, Math.max(0, (numeric / max) * 100));
  const color = col.progressColor || '#0078d4';
  const showLabel = col.showProgressLabel !== false;
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
      <span
        style={{ flex: 1, height: 8, backgroundColor: '#edebe9', borderRadius: 4, overflow: 'hidden' }}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ display: 'block', height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: 4 }} />
      </span>
      {showLabel && (
        <span style={{ fontSize: 12, color: '#605e5c', minWidth: 40, textAlign: 'right' }}>{Math.round(pct)}%</span>
      )}
    </span>
  );
}

/** rating — gradient stars (default) or a single sentiment emoji face. */
export function RatingCell<T>(props: GridCellProps<T>): JSX.Element {
  const col = cellColumn(props);

  if (col.ratingStyle === 'emoji') {
    const faceCount = clampFaceCount(col.ratingFaceCount, col.ratingMax);
    const idx = selectedFaceIndex(props.value, faceCount);
    if (idx === 0) {
      return (
        <span role="img" aria-label="No rating">
          –
        </span>
      );
    }
    const useColor = col.ratingUseSentimentColor !== false;
    const color = useColor ? emojiData.EMOJI_COLORS[faceCount][idx - 1] : col.ratingColor || '#605e5c';
    return (
      <span
        role="img"
        aria-label={`${emojiData.EMOJI_LABELS[faceCount][idx - 1]} (${idx} out of ${faceCount})`}
        style={{ fontSize: 18, color, lineHeight: 1 }}
      >
        {emojiData.EMOJI_FACES[faceCount][idx - 1]}
      </span>
    );
  }

  const max = col.ratingMax && col.ratingMax > 0 ? Math.floor(col.ratingMax) : 5;
  const filledColor = col.ratingColor || '#ffb900';
  const emptyColor = '#c8c6c4';
  const allowHalf = col.ratingAllowHalf !== false;
  const raw = typeof props.value === 'number' ? props.value : Number(props.value);
  const rating = Number.isFinite(raw) ? Math.min(max, Math.max(0, raw)) : 0;

  const stars: JSX.Element[] = [];
  for (let i = 1; i <= max; i++) {
    let frac = Math.max(0, Math.min(1, rating - (i - 1)));
    if (!allowHalf) frac = frac >= 1 ? 1 : 0;
    const pct = Math.round(frac * 100);
    stars.push(
      <span
        key={i}
        aria-hidden="true"
        style={{
          fontSize: 16,
          lineHeight: 1,
          userSelect: 'none',
          background: `linear-gradient(90deg, ${filledColor} ${pct}%, ${emptyColor} ${pct}%)`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          WebkitTextFillColor: 'transparent',
        }}
      >
        ★
      </span>,
    );
  }
  const announced = allowHalf ? rating : Math.floor(rating);
  return (
    <span role="img" aria-label={`${announced} out of ${max}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {stars}
    </span>
  );
}

// ── composite ────────────────────────────────────────────────────────────────

interface CompositeSlot {
  id: string;
  type: 'icon' | 'text' | 'badge' | 'link' | 'image' | 'spacer' | 'progress' | 'rating';
  fieldBinding?: string;
  staticValue?: string;
  defaultStyle?: Record<string, string>;
  conditionalStyles?: Array<{
    field: string;
    operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'between';
    value: string | number;
    valueTo?: string | number;
    style: Record<string, string>;
  }>;
}

function getField(item: unknown, field?: string): unknown {
  if (!field || item === null || typeof item !== 'object') return undefined;
  return (item as Record<string, unknown>)[field];
}
function asNum(x: unknown): number {
  if (x === '' || x === null || x === undefined) return NaN;
  return typeof x === 'number' ? x : Number(x);
}
function conditionMatches(cond: NonNullable<CompositeSlot['conditionalStyles']>[number], item: unknown): boolean {
  const actual = getField(item, cond.field);
  const a = asNum(actual);
  const c = asNum(cond.value);
  const bothNumeric = Number.isFinite(a) && Number.isFinite(c);
  switch (cond.operator) {
    case 'eq':
      return bothNumeric ? a === c : String(actual) === String(cond.value);
    case 'gt':
      return bothNumeric && a > c;
    case 'lt':
      return bothNumeric && a < c;
    case 'gte':
      return bothNumeric && a >= c;
    case 'lte':
      return bothNumeric && a <= c;
    case 'contains':
      return String(actual ?? '').toLowerCase().includes(String(cond.value).toLowerCase());
    case 'between': {
      const to = asNum(cond.valueTo !== undefined ? cond.valueTo : cond.value);
      return Number.isFinite(a) && Number.isFinite(c) && Number.isFinite(to) && a >= c && a <= to;
    }
    default:
      return false;
  }
}
function resolveSlotStyle(slot: CompositeSlot, item: unknown): React.CSSProperties {
  if (slot.conditionalStyles) {
    for (const cs of slot.conditionalStyles) if (conditionMatches(cs, item)) return cs.style as React.CSSProperties;
  }
  return (slot.defaultStyle as React.CSSProperties) || {};
}

function renderSlot<T>(slot: CompositeSlot, item: T): React.ReactNode {
  const style = resolveSlotStyle(slot, item);
  const bound = getField(item, slot.fieldBinding);
  const text = bound !== undefined && bound !== null ? String(bound) : slot.staticValue ?? '';
  switch (slot.type) {
    case 'spacer':
      return <span key={slot.id} style={{ flex: 1, ...style }} />;
    case 'icon':
      return (
        <span key={slot.id} style={{ display: 'inline-flex', alignItems: 'center', ...style }}>
          {resolveIcon(slot.staticValue || (bound ? String(bound) : undefined))}
        </span>
      );
    case 'image':
      return <img key={slot.id} src={text} alt="" style={{ height: 20, width: 20, objectFit: 'cover', borderRadius: 2, ...style }} />;
    case 'badge':
      return (
        <span key={slot.id} style={{ ...badgeStyle, ...style }}>
          {text}
        </span>
      );
    case 'link':
      return (
        <Link key={slot.id} onClick={(e) => e.preventDefault()} style={style}>
          {text}
        </Link>
      );
    case 'progress': {
      const pct = Math.min(100, Math.max(0, Number(bound) || 0));
      return (
        <span key={slot.id} style={{ display: 'inline-block', width: 60, height: 8, background: '#edebe9', borderRadius: 4, overflow: 'hidden', ...style }}>
          <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: '#0078d4' }} />
        </span>
      );
    }
    case 'rating': {
      const r = Math.round(Number(bound) || 0);
      return (
        <span key={slot.id} style={{ color: '#ffb900', ...style }}>
          {'★'.repeat(Math.max(0, r))}
          {'☆'.repeat(Math.max(0, 5 - r))}
        </span>
      );
    }
    case 'text':
    default:
      return (
        <span key={slot.id} style={style}>
          {text}
        </span>
      );
  }
}

/** composite — an ordered row/column of icon/text/badge/link/image/spacer/progress/rating slots. */
export function CompositeCell<T>(props: GridCellProps<T>): JSX.Element {
  const col = cellColumn(props);
  const slots = (col.compositeSlots ?? []) as CompositeSlot[];
  const layout = col.compositeLayout || 'horizontal';
  const gap = col.compositeGap ?? 4;
  return (
    <span
      style={{
        display: 'flex',
        flexDirection: layout === 'vertical' ? 'column' : 'row',
        alignItems: layout === 'vertical' ? 'flex-start' : 'center',
        gap,
      }}
    >
      {slots.map((slot) => renderSlot(slot, props.item))}
    </span>
  );
}
