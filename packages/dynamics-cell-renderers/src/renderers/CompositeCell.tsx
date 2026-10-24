import React from 'react';
import { Icon } from '@fluentui/react';
import { CellRendererProps, CompositeSlot, ConditionalStyle } from '../types';
import { compositeCellClass } from '../styles';

/** Read a (possibly nested-free) field off the row. */
function getField(item: unknown, field?: string): unknown {
  if (!field || item === null || typeof item !== 'object') return undefined;
  return (item as Record<string, unknown>)[field];
}

/** Coerce to a number, treating empty/null/undefined as NaN (not 0). */
function asNum(x: unknown): number {
  if (x === '' || x === null || x === undefined) return NaN;
  return typeof x === 'number' ? x : Number(x);
}

/** Evaluate a single conditional-style rule against the row. */
function conditionMatches(cond: ConditionalStyle, item: unknown): boolean {
  const actual = getField(item, cond.field);
  const a = asNum(actual);
  const c = asNum(cond.value);
  const bothNumeric = Number.isFinite(a) && Number.isFinite(c);
  switch (cond.operator) {
    case 'eq':
      // Numeric equality when both sides are numbers (so 1 === '1' and
      // 5 === 5.0), else exact string compare.
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
      return String(actual ?? '')
        .toLowerCase()
        .includes(String(cond.value).toLowerCase());
    case 'between': {
      const to = asNum(cond.valueTo !== undefined ? cond.valueTo : cond.value);
      return Number.isFinite(a) && Number.isFinite(c) && Number.isFinite(to) && a >= c && a <= to;
    }
    default:
      return false;
  }
}

/** Resolve a slot's style: first matching conditional style, else default. */
function resolveSlotStyle(slot: CompositeSlot, item: unknown): React.CSSProperties {
  if (slot.conditionalStyles) {
    for (const cs of slot.conditionalStyles) {
      if (conditionMatches(cs, item)) return cs.style as React.CSSProperties;
    }
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
        <Icon
          key={slot.id}
          iconName={slot.staticValue || (bound ? String(bound) : 'CircleFill')}
          style={style}
        />
      );
    case 'image':
      return (
        <img
          key={slot.id}
          src={text}
          alt=""
          style={{ height: 20, width: 20, objectFit: 'cover', borderRadius: 2, ...style }}
        />
      );
    case 'badge':
      return (
        <span
          key={slot.id}
          style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600, ...style }}
        >
          {text}
        </span>
      );
    case 'link':
      // ★ A <button>, not an <a href="#">. The previous markup was an anchor to nowhere whose
      // onClick called preventDefault — it ANNOUNCED as a link to assistive tech, offered no
      // destination, and did nothing when activated (`jsx-a11y/anchor-is-valid`). A button is
      // what this actually is: an inert affordance styled like a link. It is keyboard-operable
      // for free (Enter/Space), where the anchor was focusable but pointless.
      //
      // Not merely a lint fix: this file is VENDORED into generated projects, and the
      // web-resource target builds through react-scripts, which turns eslint warnings into
      // ERRORS under CI — so it also failed `npm run build` in every pipeline.
      //
      // The button defaults (background/border/padding/font) are reset so the rendered result is
      // visually identical to the anchor it replaces.
      return (
        <button
          key={slot.id}
          type="button"
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            font: 'inherit',
            color: '#0078d4',
            cursor: 'pointer',
            textDecoration: 'none',
            ...style,
          }}
        >
          {text}
        </button>
      );
    case 'progress': {
      const pct = Math.min(100, Math.max(0, Number(bound) || 0));
      return (
        <span
          key={slot.id}
          style={{
            display: 'inline-block',
            width: 60,
            height: 8,
            background: '#edebe9',
            borderRadius: 4,
            overflow: 'hidden',
            ...style,
          }}
        >
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

/**
 * Composite cell renderer.
 * Renders an ordered list of slots (icon/text/badge/link/image/spacer/progress/
 * rating) in one cell, each with optional conditional styling. Configured via
 * `column.compositeSlots` / `compositeLayout` / `compositeGap`.
 *
 * NOTE: the `icon` slot uses Fluent UI's `Icon`, so the host app must call
 * `initializeIcons()` once at startup or icon slots render blank.
 */
export function CompositeCell<T>({ item, column }: CellRendererProps<T>): JSX.Element {
  const slots = column.compositeSlots || [];
  const layout = column.compositeLayout || 'horizontal';
  const gap = column.compositeGap ?? 4;

  return (
    <div
      className={compositeCellClass}
      style={{
        flexDirection: layout === 'vertical' ? 'column' : 'row',
        alignItems: layout === 'vertical' ? 'flex-start' : 'center',
        gap,
      }}
    >
      {slots.map((slot) => renderSlot(slot, item))}
    </div>
  );
}
