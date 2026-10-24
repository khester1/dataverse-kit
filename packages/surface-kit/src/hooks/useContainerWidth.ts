import * as React from 'react';
import { useRef } from 'react';
import { useContainerSize } from './useContainerSize';

/**
 * Create-and-return a ref plus the observed width of the element it is attached to.
 * `const [ref, width] = useContainerWidth(); return <div ref={ref}>…</div>`.
 */
export function useContainerWidth<T extends HTMLElement = HTMLDivElement>(): [React.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const { width } = useContainerSize(ref);
  return [ref, width];
}
