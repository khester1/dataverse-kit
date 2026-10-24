import React, { useEffect, useRef } from 'react';

// Focus + exit management for a v9 cell that is in edit mode. On mount (the cell
// entered edit mode) it focuses the first focusable control, and it exits edit mode
// on Enter/Escape or on blur to outside — but NOT when focus moves into a Fluent v9
// popup (a Dropdown/Combobox listbox renders in a PORTAL outside the cell's DOM
// subtree; exiting on that blur would close the editor before the option commits).
// Fluent-free (no @fluentui import) — the two-skins guard allows this in src/v9/.
//
// ★ The grid runs Fluent's DataGrid with focusMode="composite": its root keydown handler moves focus
//   to the ROW on ArrowDown/Up/Left from inside a gridcell (via tabster, in a timeout), and Space
//   toggles the row's selection — so an arrow inside an open list or a text input ended the edit.
//   Keys the editor owns stop here. Clicks stop here too: React events bubble through the listbox
//   PORTAL to the DataGridRow, whose click toggles selection. All measured in real Chromium
//   (ce-parity `editors.spec.mjs`); jsdom cannot see tabster's timed focus move.

const FOCUSABLE = 'input, textarea, select, button, [tabindex]:not([tabindex="-1"])';

/** Keys the editor owns while editing — never handed to the grid's composite navigation. */
const EDITOR_KEYS = new Set(['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown', ' ']);

/** Marks the read-mode click-to-edit affordance, so a keyboard exit can put focus back on it. */
export const EDIT_AFFORDANCE_ATTR = 'data-gridkit-edit-affordance';

/** True when focus moved into a v9 popup surface (listbox/option/dialog/menu). */
function isInV9Popup(node: EventTarget | null): boolean {
  const el = node as HTMLElement | null;
  return !!el?.closest?.('[role="listbox"], [role="option"], [role="dialog"], [role="menu"]');
}

/** A collapsed combobox: Enter OPENS it (the editor's own action), it does not finish the edit. */
function isCollapsedCombobox(node: EventTarget | null): boolean {
  const el = node as HTMLElement | null;
  return el?.getAttribute?.('role') === 'combobox' && el.getAttribute('aria-expanded') !== 'true';
}

export const EditCellWrapper: React.FC<{ onExit: () => void; children: React.ReactNode }> = ({ onExit, children }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  }, []);

  /** Exit by keyboard: the editor unmounts, so put focus back on the cell (not the row, not <body>). */
  const exitByKeyboard = (): void => {
    // The gridcell stays mounted — only its content swaps from editor to affordance.
    const cell = ref.current?.closest('[role="gridcell"]');
    onExit();
    setTimeout(() => cell?.querySelector<HTMLElement>(`[${EDIT_AFFORDANCE_ATTR}]`)?.focus(), 0);
  };

  return (
    <div
      ref={ref}
      style={{ height: '100%', width: '100%' }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.stopPropagation();
          if (!isCollapsedCombobox(e.target)) exitByKeyboard();
        } else if (e.key === 'Escape') {
          // An OPEN list consumes the first Escape itself (Fluent stops it), so this is the second.
          e.stopPropagation();
          exitByKeyboard();
        } else if (EDITOR_KEYS.has(e.key)) {
          e.stopPropagation();
        }
      }}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onBlur={(e) => {
        const next = e.relatedTarget as Node | null;
        if (isInV9Popup(next)) return; // selecting a portal option, not exiting
        if (!e.currentTarget.contains(next)) onExit();
      }}
    >
      {children}
    </div>
  );
};
