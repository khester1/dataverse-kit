// SYNCED FROM: shared/responsive-patterns/03-layouts/container-query/ContainerQuery.tsx (useContainerSize)
// Inlined, not aliased: shared/responsive-patterns is outside the npm workspace. The
// ContainerSize type is inlined here too (rather than vendoring shared/shared/types).
// This is a React hook, so it lives in hooks/ (NOT responsive/, which must stay
// framework-agnostic for the ./responsive subpath that export-engine inlines).
import * as React from 'react';
import { useState, useEffect } from 'react';

export interface ContainerSize {
  width: number;
  height: number;
  inlineSize: number;
  blockSize: number;
}

/** Observe an element's size via ResizeObserver. Pass a ref; returns {width,height,inlineSize,blockSize}. */
export function useContainerSize<T extends HTMLElement = HTMLElement>(ref: React.RefObject<T>): ContainerSize {
  const [size, setSize] = useState<ContainerSize>({ width: 0, height: 0, inlineSize: 0, blockSize: 0 });

  useEffect(() => {
    if (!ref.current || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const inlineSize = entry.borderBoxSize?.[0]?.inlineSize ?? width;
        const blockSize = entry.borderBoxSize?.[0]?.blockSize ?? height;
        setSize({ width, height, inlineSize, blockSize });
      }
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}
