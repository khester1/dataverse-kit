import React from 'react';
import type { IStackProps } from '@fluentui/react';

// Shared helpers for the additive, default-off `fill`/`height` grid props (v1b).
// `fill` makes a host fill its container (flex column at `height`, default 100%) and
// scroll its list/cards region internally — so a grid dropped into a surface-kit
// Section / Dialog / Panel scrolls inside the surface while the toolbar + footers
// (and the surface's own footer) stay fixed. All default-off → unchanged when unset.
//
// Consumer contract: the container MUST have a resolved height (a flex/grid parent or
// an explicit height) — `height: '100%'` against an auto-height parent renders nothing.
// v1 limitation: the DetailsList column header scrolls with the body (not pinned via
// ScrollablePane/Sticky); the surface-integration goal (grid scrolls so the surface
// footer stays put) is still met.

/** Stack root styles for a host that should fill its container. `undefined` when not filling. */
export function fillStackStyles(fill?: boolean, height?: number | string): IStackProps['styles'] {
  return fill ? { root: { height: height ?? '100%', display: 'flex', flexDirection: 'column', minHeight: 0 } } : undefined;
}

/** Wraps the scrollable region (list/cards) so it grows + scrolls inside a `fill` host; passthrough otherwise. */
export const FillRegion: React.FC<{ fill?: boolean; children: React.ReactNode }> = ({ fill, children }) =>
  fill ? <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>{children}</div> : <>{children}</>;
