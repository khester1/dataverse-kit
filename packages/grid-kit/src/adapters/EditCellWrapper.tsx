import React, { useEffect, useRef } from 'react';

const FOCUSABLE = 'input, textarea, select, button, [tabindex]:not([tabindex="-1"])';

/** True when focus moved into a Fluent v8 portal (Dropdown/Calendar/Lookup
 * option lists render in a Layer/Callout OUTSIDE the cell's DOM subtree). */
function isInFluentPortal(node: EventTarget | null): boolean {
  const el = node as HTMLElement | null;
  return !!el?.closest?.('.ms-Layer, .ms-Callout');
}

/**
 * Wraps an editable cell that is currently in edit mode. On mount (i.e. when the
 * cell enters edit mode) it focuses the first focusable control, and it exits
 * edit mode on Enter/Escape or on blur to outside — but NOT when focus moves into
 * a Fluent portal (otherwise picking a Dropdown/Calendar/Lookup option would
 * close the editor before the value commits).
 */
export const EditCellWrapper: React.FC<{ onExit: () => void; children: React.ReactNode }> = ({ onExit, children }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  }, []);

  return (
    <div
      ref={ref}
      style={{ height: '100%' }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === 'Escape') onExit();
      }}
      onBlur={(e) => {
        const next = e.relatedTarget as Node | null;
        if (isInFluentPortal(next)) return; // selecting a portal option, not exiting
        if (!e.currentTarget.contains(next)) onExit();
      }}
    >
      {children}
    </div>
  );
};
