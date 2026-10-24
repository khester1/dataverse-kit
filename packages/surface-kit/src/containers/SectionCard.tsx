import React from 'react';
import type { SectionCardProps } from '../types';
import { colors } from '../tokens/tokens';
import { Section } from './Section';

/**
 * A Section with the Dynamics blue 3px accent top border.
 * NOTE: the accent is an inline style so it wins over the `card` variant's shorthand
 * `border` (mergeStyles class). If the accent ever moves into a class, use the
 * `borderTop*` longhand so it isn't clobbered by the shorthand `border`.
 */
export const SectionCard: React.FC<SectionCardProps> = ({
  accentColor = colors.brand,
  accentWidth = 3,
  variant = 'card',
  style,
  ...rest
}) => (
  <Section
    variant={variant}
    {...rest}
    style={{ borderTop: `${accentWidth}px solid ${accentColor}`, ...style }}
  />
);

export default SectionCard;
