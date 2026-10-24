import React from 'react';
import { Popover, PopoverSurface, type PositioningShorthand } from '@fluentui/react-components';
import type { CalloutSurfaceProps } from '../types';
import { calloutWidthPx } from '../../core/sizePresets';

// The Fluent v9 counterpart of the v8 CalloutSurface (a `<Callout>`): a controlled,
// target-anchored `<Popover>` + `<PopoverSurface>`. v8's `target` (selector / element / ref)
// is resolved to an element and passed via `positioning.target`; there is no PopoverTrigger
// because anchoring comes from the target (matching the v8 target-based API). `isBeakVisible`
// maps to `withArrow`.

function resolveTarget(target: CalloutSurfaceProps['target']): HTMLElement | null {
  if (!target) return null;
  if (typeof target === 'string') return document.querySelector<HTMLElement>(target);
  if ('current' in target) return (target.current as HTMLElement | null) ?? null;
  return target as HTMLElement;
}

/** A lightweight contextual callout (Fluent v9 `Popover`) anchored to a target. */
export const CalloutSurface: React.FC<CalloutSurfaceProps> = ({
  target,
  isOpen = true,
  onDismiss,
  width,
  position = 'below',
  align = 'start',
  isBeakVisible = true,
  className,
  children,
}) => {
  if (!isOpen) return null;
  const el = resolveTarget(target);
  // If the target can't be resolved (selector miss / target={null}), the Popover renders
  // unanchored (position defaults apply) rather than throwing — an intentional soft fallback.
  const positioning: PositioningShorthand = { position, align, ...(el ? { target: el } : {}) };

  return (
    <Popover
      open
      trapFocus={false}
      withArrow={isBeakVisible}
      positioning={positioning}
      onOpenChange={(_e, data) => {
        if (!data.open) onDismiss?.();
      }}
    >
      <PopoverSurface className={className} style={{ width: calloutWidthPx(width), padding: 16 }}>
        {children}
      </PopoverSurface>
    </Popover>
  );
};

export default CalloutSurface;
