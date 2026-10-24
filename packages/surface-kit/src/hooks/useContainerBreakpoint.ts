import type * as React from 'react';
import { resolveBreakpoint, type Breakpoint } from '../responsive/breakpoints';
import { useContainerWidth } from './useContainerWidth';

/**
 * Resolve the *container's* current breakpoint (not the viewport's) — the correctness
 * fix for a surface inside a PCF, where width comes from `context.allocatedWidth`.
 * Returns `[ref, breakpoint, width]`.
 */
export function useContainerBreakpoint<T extends HTMLElement = HTMLDivElement>(): [React.RefObject<T>, Breakpoint, number] {
  const [ref, width] = useContainerWidth<T>();
  return [ref, resolveBreakpoint(width), width];
}
