import React from 'react';
import { tokens } from '@fluentui/react-components';
import type { SectionCardProps } from '../types';
import { Section } from './Section';

/**
 * A Section with the Dynamics blue accent top border (Fluent v9).
 * The accent is an inline `borderTop` so it wins over the card variant's inline `border`
 * (see Section: `style` is spread after the card chrome). Defaults to the v9 brand stroke.
 */
export const SectionCard: React.FC<SectionCardProps> = ({
  accentColor = tokens.colorBrandStroke1,
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
