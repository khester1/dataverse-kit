import * as React from 'react';
import { useRef, useState, useEffect } from 'react';

/**
 * Observe a host element's container width via ResizeObserver. Returns a ref to
 * attach to the measured element plus its current width in px.
 *
 * Container-relative (NOT viewport): a subgrid's relevant width is the width its
 * container allocates to it — a PCF `context.allocatedWidth`, a form tab/section
 * column, a side panel — not `window.innerWidth`. Measuring the element keeps the
 * responsive decision correct inside any host width.
 *
 * SSR / non-DOM safe: when ResizeObserver is unavailable (Power Pages SSR; the
 * node-env unit tests, which have no layout) the width stays 0, and callers treat
 * 0 as the wide/default layout (see `core/responsive.ts` `deriveIsNarrow`) — so
 * there is no flash-to-narrow on first paint.
 *
 * Ported from @dataverse-kit/surface-kit's `useContainerSize` (grid-kit must NOT
 * import surface-kit — surface-kit hosts grid-kit, so the import would be a cycle).
 */
export function useContainerWidth<T extends HTMLElement = HTMLDivElement>(): [React.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!ref.current || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}
