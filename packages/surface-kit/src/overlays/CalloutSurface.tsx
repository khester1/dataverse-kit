import React from 'react';
import { Callout, DirectionalHint, type ICalloutProps } from '@fluentui/react';
import type { CalloutSurfaceProps } from '../types';
import { calloutWidthPx } from '../core/sizePresets';

// Extracted from export-engine generateCalloutForm (v8 <Callout> branch): width 320 +
// bottomLeftEdge + padding 16. beak/gap are additive opt-ins (the form-callout path omits
// them; sourced from the embedded-callout defaults).

/** A lightweight contextual callout (Fluent v8 Callout) anchored to a target. */
export const CalloutSurface: React.FC<CalloutSurfaceProps> = ({
  target,
  isOpen = true,
  onDismiss,
  width,
  directionalHint = 'bottomLeftEdge',
  isBeakVisible = true,
  beakWidth = 16,
  gapSpace = 0,
  className,
  children,
}) => {
  if (!isOpen) return null;
  return (
    <Callout
      target={(target ?? undefined) as ICalloutProps['target']}
      onDismiss={onDismiss}
      directionalHint={DirectionalHint[directionalHint]}
      isBeakVisible={isBeakVisible}
      beakWidth={beakWidth}
      gapSpace={gapSpace}
      className={className}
      styles={{ root: { width: calloutWidthPx(width), padding: 16 } }}
    >
      {children}
    </Callout>
  );
};

export default CalloutSurface;
