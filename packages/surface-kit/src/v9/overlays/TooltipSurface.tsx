import React from 'react';
import { Tooltip } from '@fluentui/react-components';
import type { TooltipSurfaceProps } from '../types';

const DELAY_MS: Record<NonNullable<TooltipSurfaceProps['delay']>, number> = {
  zero: 0,
  medium: 250,
  long: 500,
};

/** A tooltip wrapper (Fluent v9 `Tooltip`). */
export const TooltipSurface: React.FC<TooltipSurfaceProps> = ({
  content,
  position = 'above',
  delay = 'medium',
  relationship = 'label',
  children,
}) => (
  <Tooltip content={content} relationship={relationship} positioning={position} showDelay={DELAY_MS[delay]}>
    {children}
  </Tooltip>
);

export default TooltipSurface;
