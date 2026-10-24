import type * as React from 'react';
import { resolveResponsiveValue, type ResponsiveValue } from '../responsive/breakpoints';
import { useContainerBreakpoint } from './useContainerBreakpoint';

/**
 * Resolve a responsive value against the *container's* current breakpoint.
 * `const [ref, cols] = useResponsiveValue({ xs: 1, md: 2, lg: 3 });`
 */
export function useResponsiveValue<T, E extends HTMLElement = HTMLDivElement>(
  value: ResponsiveValue<T>,
): [React.RefObject<E>, T | undefined] {
  const [ref, breakpoint] = useContainerBreakpoint<E>();
  return [ref, resolveResponsiveValue(value, breakpoint)];
}
