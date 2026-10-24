// Nested-trigger label helpers for the v9 nested host. `formatTriggerLabel` is a
// Fluent-free fork of the v8 src/hosts/nested/labels.ts (which also exports
// `panelTypeFor`, importing the Fluent-v8 `PanelType` ENUM at runtime — so we can't
// import that module into the v9 bundle). A drift-guard test compares the fork to the
// v8 source.
import type { NestedSidePanelSize } from '../../../types';

/**
 * Resolve a nested trigger label, substituting the `{count}` token. When the count
 * isn't known yet, the token is dropped and extra whitespace collapsed
 * ("View {count} related" → "View related"). Mirrors the v8 `formatTriggerLabel`.
 */
export function formatTriggerLabel(label: string | undefined, count: number | undefined): string {
  const base = label ?? 'View {count} related';
  if (count === undefined) {
    return base.replace(/\{count\}\s*/g, '').replace(/\s+/g, ' ').trim();
  }
  return base.replace(/\{count\}/g, String(count));
}

/** Map a side-panel size token to a v9 `OverlayDrawer` `size` (the v9 counterpart of `panelTypeFor`). */
export function drawerSizeFor(size: NestedSidePanelSize | undefined): 'small' | 'medium' | 'large' {
  return size === 'small' ? 'small' : size === 'large' ? 'large' : 'medium';
}
