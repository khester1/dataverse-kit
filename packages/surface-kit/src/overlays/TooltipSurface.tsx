import React from 'react';
import { TooltipHost, DirectionalHint, TooltipDelay } from '@fluentui/react';
import type { TooltipSurfaceProps } from '../types';

const DELAY_MAP: Record<NonNullable<TooltipSurfaceProps['delay']>, TooltipDelay> = {
  zero: TooltipDelay.zero,
  medium: TooltipDelay.medium,
  long: TooltipDelay.long,
};

/** A tooltip wrapper (Fluent v8 TooltipHost). New surface — no codegen counterpart. */
export const TooltipSurface: React.FC<TooltipSurfaceProps> = ({
  content,
  directionalHint = 'bottomCenter',
  delay = 'medium',
  children,
}) => (
  <TooltipHost content={content} directionalHint={DirectionalHint[directionalHint]} delay={DELAY_MAP[delay]}>
    {children}
  </TooltipHost>
);

export default TooltipSurface;
