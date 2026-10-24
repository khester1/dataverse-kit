import { PanelType } from '@fluentui/react';

/**
 * Resolve a nested trigger label, substituting the `{count}` token. When the
 * count isn't known yet (children not loaded), the token is dropped and extra
 * whitespace collapsed (e.g. "View {count} related" → "View related").
 */
export function formatTriggerLabel(label: string | undefined, count: number | undefined): string {
  const base = label ?? 'View {count} related';
  if (count === undefined) {
    return base.replace(/\{count\}\s*/g, '').replace(/\s+/g, ' ').trim();
  }
  return base.replace(/\{count\}/g, String(count));
}

/** Map a side-panel size token to a Fluent v8 `PanelType`. */
export function panelTypeFor(size: 'small' | 'medium' | 'large' | undefined): PanelType {
  return size === 'small' ? PanelType.smallFixedFar : size === 'large' ? PanelType.large : PanelType.medium;
}
