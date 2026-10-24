import React from 'react';
import { Icon } from '@fluentui/react';
import { CellRendererProps, IReusableColumn } from '../types';
import { cellClass, coloredBadgeClass } from '../styles';
import { getContrastColor, normalizeHexColor } from '@khester/dynamics-utils';

/**
 * Default colors for option set values.
 */
const DEFAULT_OPTIONSET_COLORS: Record<number, string> = {
  0: '#107c10', // Active/Yes (green)
  1: '#d13438', // Inactive/No (red)
  2: '#0078d4', // Open (blue)
  3: '#ffb900', // Pending (yellow)
  4: '#605e5c', // Closed (gray)
};

interface Badge {
  label: string;
  bg: string;
  iconName?: string;
}

/**
 * Resolve one optionset value → a badge (label + background + optional icon).
 * Returns null for empty/unlabeled values. Color precedence: per-option `color` >
 * `getBackgroundColor` > `colorMap` > numeric default > gray. Label precedence:
 * per-option `label` > `formatValue` > raw string.
 */
function resolveBadge<T>(v: unknown, column: IReusableColumn<T>, item: T): Badge | null {
  if (v === null || v === undefined || v === '') return null;

  const option = column.optionSetOptions?.find((o) => String(o.value) === String(v));
  const label = option?.label ?? (column.formatValue ? column.formatValue(v, item) : String(v));
  if (!label || label === '-') return null;

  let bg: string | undefined = option?.color;
  if (!bg && column.getBackgroundColor) bg = column.getBackgroundColor(v as string | number);
  if (!bg && column.colorMap) {
    const key = typeof v === 'number' ? v : String(v);
    bg = column.colorMap[key];
  }
  if (!bg && typeof v === 'number' && v in DEFAULT_OPTIONSET_COLORS) bg = DEFAULT_OPTIONSET_COLORS[v];
  if (!bg) bg = '#c8c6c4';

  return { label, bg: normalizeHexColor(bg), iconName: option?.iconName };
}

/**
 * OptionSet cell renderer. Displays a colored badge per value — one for a single
 * value, several for a multi-select array. Per-option `iconName` renders a Fluent
 * `<Icon>` (requires `initializeIcons()` on the host).
 */
export function OptionSetCell<T>({ item, value, column }: CellRendererProps<T>): JSX.Element {
  const multi = Array.isArray(value);
  const values = multi ? (value as unknown[]) : [value];
  const badges = values.map((v) => resolveBadge(v, column, item)).filter((b): b is Badge => b !== null);

  if (badges.length === 0) {
    return <div className={cellClass}>-</div>;
  }

  return (
    <div
      className={cellClass}
      style={multi ? { display: 'flex', gap: 4, flexWrap: 'wrap' } : undefined}
    >
      {badges.map((b, i) => (
        <span
          key={`${b.label}-${i}`}
          className={coloredBadgeClass}
          style={{
            backgroundColor: b.bg,
            color: getContrastColor(b.bg),
            ...(b.iconName ? { display: 'inline-flex', alignItems: 'center', gap: 4 } : {}),
          }}
        >
          {b.iconName && <Icon iconName={b.iconName} style={{ fontSize: 12 }} aria-hidden />}
          {b.label}
        </span>
      ))}
    </div>
  );
}
