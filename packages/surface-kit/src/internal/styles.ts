// Shared Dynamics-CE style fragments used across containers. Not part of the public
// API. Fluent v8 mergeStyles `IRawStyle` fragments built from the canonical tokens.
import type { IRawStyle } from '@fluentui/react';
import { colors, typography, radius } from '../tokens/tokens';

/** Dynamics section/header title (Segoe UI Semibold 14 / #323130). */
export const sharedTitleStyle: IRawStyle = {
  fontWeight: typography.fontWeight.semibold,
  fontSize: typography.fontSize.md,
  color: colors.textPrimary,
  fontFamily: typography.fontFamilySemibold,
  paddingBottom: 0,
  marginBottom: 0,
};

/** White card with subtle neutral border + soft rounding (Dynamics card chrome). */
export const dynamicsCardStyle: IRawStyle = {
  background: colors.surface,
  border: `1px solid ${colors.borderNeutral}`,
  borderRadius: radius.card,
  overflow: 'hidden',
};

/** The subtle Fluent elevation used on Dynamics form cards. */
export const cardShadow =
  '0 1.6px 3.6px rgba(0, 0, 0, 0.08), 0 0.3px 0.9px rgba(0, 0, 0, 0.05)';

/** Stack direct grid children to full width below `maxPx` (viewport @media). */
export function stackChildrenBelow(maxPx: number): IRawStyle {
  return {
    selectors: {
      [`@media (max-width: ${maxPx}px)`]: {
        selectors: { '> *': { gridColumn: '1 / -1' } },
      },
    },
  };
}
