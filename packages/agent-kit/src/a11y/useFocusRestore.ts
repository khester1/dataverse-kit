import * as React from 'react';

/**
 * Put focus somewhere sensible when the focused element disappears.
 *
 * ★ Fluent's tabster ships a `Restorer` and a `Deloser` for exactly this, and the kit needs
 *   its own because the affordances that own focus in a transcript are the in-tree ones. A
 *   chat surface removes focusable nodes constantly — a message is deleted, an approval card
 *   resolves, a conversation closes. When that happens the browser puts focus on `<body>`:
 *   the keyboard user's Tab position resets to the top of the page and the screen reader
 *   loses its place.
 *
 * ★ It reads `document.activeElement` rather than tracking what it believes had focus,
 *   because the interesting case is the one where focus has ALREADY been lost.
 */
export function useFocusRestore(containerRef: React.RefObject<HTMLElement>): () => void {
  return React.useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const doc = container.ownerDocument;
    // Only rescue focus that actually fell off. If it landed somewhere real, leave it alone.
    if (doc.activeElement && doc.activeElement !== doc.body) return;

    const focusable = container.querySelector<HTMLElement>(
      'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])',
    );
    (focusable ?? container).focus();
  }, [containerRef]);
}
