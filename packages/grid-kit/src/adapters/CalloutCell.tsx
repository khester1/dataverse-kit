import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Callout, DirectionalHint } from '@fluentui/react';

export interface CalloutCellProps {
  /** The cell content (the normally-rendered cell). */
  children: React.ReactNode;
  /** Lazily produces the hover-preview content (only invoked while open). */
  renderContent: () => React.ReactNode;
  /**
   * `'mouseleave'` (default) closes as soon as the pointer leaves the cell;
   * `'timeout'` keeps the callout open for `timeoutDuration` ms and stays open
   * while the pointer is over the callout (so its content is interactive).
   */
  dismissMode?: 'mouseleave' | 'timeout';
  /** Grace period (ms) before dismiss when `dismissMode === 'timeout'`. Default 200. */
  timeoutDuration?: number;
}

/**
 * Wraps a cell in a hover-triggered Fluent v8 `Callout` showing preview content
 * (e.g. a lookup's related-record fields). Consumed by `toDetailsListColumns` for
 * any `ColumnDef` that declares `calloutContent` — the host wiring that the
 * `ColumnDef.calloutContent`/`dismissMode`/`timeoutDuration` contract was always
 * meant to drive (it was previously declared-but-unconsumed).
 */
export function CalloutCell({
  children,
  renderContent,
  dismissMode = 'mouseleave',
  timeoutDuration = 200,
}: CalloutCellProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);
  // Clear any pending dismiss timer on unmount (cells unmount on scroll in a
  // virtualized DetailsList) so a stale callback can't setState after unmount.
  useEffect(() => clearTimer, [clearTimer]);
  const onEnter = useCallback(() => {
    clearTimer();
    setOpen(true);
  }, [clearTimer]);
  const onLeave = useCallback(() => {
    if (dismissMode === 'timeout') {
      clearTimer();
      timer.current = setTimeout(() => setOpen(false), timeoutDuration);
    } else {
      setOpen(false);
    }
  }, [clearTimer, dismissMode, timeoutDuration]);

  // Keep the callout open while the pointer is over its content (timeout mode only).
  const calloutHover =
    dismissMode === 'timeout' ? { onMouseEnter: clearTimer, onMouseLeave: onLeave } : {};

  return (
    <span
      ref={anchorRef}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{ display: 'inline-block', width: '100%' }}
    >
      {children}
      {open && anchorRef.current && (
        <Callout
          target={anchorRef.current}
          directionalHint={DirectionalHint.bottomLeftEdge}
          isBeakVisible={false}
          gapSpace={0}
          onDismiss={() => setOpen(false)}
          {...calloutHover}
        >
          <div style={{ padding: 12, maxWidth: 320 }}>{renderContent()}</div>
        </Callout>
      )}
    </span>
  );
}
