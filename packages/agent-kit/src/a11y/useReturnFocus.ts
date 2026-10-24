import * as React from 'react';

export interface ReturnFocusOptions {
  /** When this goes true the surface is open; false returns focus to whatever opened it. */
  open: boolean;
  /** The surface. Focus moves to its first focusable node on open. */
  containerRef: React.RefObject<HTMLElement>;
  /** Skip moving focus IN on open. Focus is still returned on close. */
  manageInitialFocus?: boolean;
}

/**
 * Move focus into a surface when it opens, and put it back where it came from when it closes.
 *
 * ★★ THIS IS NOT A FOCUS TRAP, DELIBERATELY. A docked assistant drawer is NON-MODAL — the page
 *    behind it stays readable and usable, which is the whole point of docking rather than
 *    dialoging. Trapping focus in a surface that does not claim modality strands a keyboard user
 *    with no way out, and the page carries no `aria-modal` or inert backdrop to justify it. A host
 *    that genuinely wants modal behaviour should wrap in a real dialog and get the trap, the
 *    backdrop and the `aria-modal` together rather than half of them here.
 *
 * ★★ THE OPENER IS CAPTURED ON THE OPENING TRANSITION, not on every render. Reading
 *    `document.activeElement` at close time would return something inside the drawer — which is
 *    exactly where focus is — so the return target has to be remembered before focus moves.
 *
 * ★ Returning focus is guarded on the element still being connected. A trigger can be unmounted
 *   while the surface is open (a toolbar collapsing, a row removed); calling `.focus()` on a
 *   detached node silently does nothing and leaves focus on `<body>`, so fall back to the body
 *   check rather than pretending it worked.
 */
export function useReturnFocus({ open, containerRef, manageInitialFocus = true }: ReturnFocusOptions): void {
  const openerRef = React.useRef<HTMLElement | null>(null);
  const wasOpen = React.useRef(open);

  React.useEffect(() => {
    const container = containerRef.current;
    const doc = container?.ownerDocument ?? (typeof document !== 'undefined' ? document : undefined);
    if (!doc) return;

    // opening
    if (open && !wasOpen.current) {
      const active = doc.activeElement;
      openerRef.current = active instanceof HTMLElement && active !== doc.body ? active : null;
      if (manageInitialFocus && container) {
        const first = container.querySelector<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])',
        );
        (first ?? container).focus();
      }
    }

    // closing
    if (!open && wasOpen.current) {
      const opener = openerRef.current;
      if (opener && opener.isConnected) opener.focus();
      openerRef.current = null;
    }

    wasOpen.current = open;
  }, [open, containerRef, manageInitialFocus]);
}
