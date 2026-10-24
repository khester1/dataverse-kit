/**
 * Per-parent-row trigger cell for the v9 `side-panel` and `hover-callout` nested modes.
 * Children resolve LAZILY — on click (drawer) or first hover (popover). The v9
 * counterparts of the v8 primitives: Fluent v8 `Panel` → v9 `OverlayDrawer`, Fluent v8
 * `Callout` → v9 `Popover`.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  OverlayDrawer,
  DrawerHeader,
  DrawerHeaderTitle,
  DrawerBody,
  Popover,
  PopoverTrigger,
  PopoverSurface,
  Button,
  Spinner,
  Text,
  tokens,
  useRestoreFocusTarget,
} from '@fluentui/react-components';
import { DismissRegular, PanelRightRegular } from '@fluentui/react-icons';
import type { NestedConfig } from '../../../types';
import { defaultGetKey } from '../../../adapters/context';
import { DataGrid } from '../DataGrid';
import { ReadOnlyGrid } from '../ReadOnlyGrid';
import { formatTriggerLabel, drawerSizeFor } from './labels';
import { CHILDREN_LOAD_ERROR, childrenError } from '../../../hosts/nested/useChildren';

/** False on touch-first devices (`(hover: none)`); true where matchMedia is unavailable. */
function useCanHover(): boolean {
  const [can] = useState(() => {
    try {
      return !(typeof window !== 'undefined' && window.matchMedia?.('(hover: none)').matches);
    } catch {
      return true;
    }
  });
  return can;
}

/**
 * ★★★ ESCAPE MUST CLOSE THE POPOVER AND LEAVE FOCUS ON THE BADGE — and the grid steals it otherwise.
 * MEASURED in Chrome (real keys, the shipped nested-grid bundle): Escape closed the popover and focus
 * landed on the PARENT ROW. The row is a tabster groupper, and tabster handles Escape in a
 * window-level CAPTURE listener ("exit the cell to its row") that runs before the badge sees the key
 * — so `stopPropagation` on the badge cannot stop it. Closing the popover does not move focus, so
 * tabster's async "did anything else move focus?" check passes and the row takes it.
 * tabster's own opt-out is a focusable's `ignoreKeydown`. `useTabsterAttributes` is not re-exported
 * by `@fluentui/react-components`, so this writes tabster's documented `data-tabster` contract
 * directly rather than adding a `@fluentui/react-tabster` dependency. It is applied ONLY while the
 * popover is open: with it closed, Escape on the badge still exits to the row as the grid expects.
 * ★★★★ AND IT MUST NOT ERASE WHAT IS THERE. `PopoverTrigger` already gives the badge a restore TARGET
 * (`{"restorer":{"type":1}}`) — where focus returns when the popover closes from INSIDE (focus in the
 * preview, then Escape). A first version of this fix passed `data-tabster={popOpen ? … : undefined}`,
 * and an undefined key STILL overwrites PopoverTrigger's (the child's props are spread last): MEASURED,
 * focus inside the callout + Escape went to the badge on 0.24.0 and to <body> with that version. So
 * the CLOSED badge passes no key at all — that is the measured, gated part.
 * ★ The OPEN badge carries the restorer PLUS the opt-out, built from `useRestoreFocusTarget()`. That
 *   merge is hygiene, NOT a measured necessity: erasing the restorer only while open stayed green in
 *   the gallery's browser gate, because focus is restored after React re-renders the closed badge.
 */
function withEscapeOptOut(restoreTarget: ReturnType<typeof useRestoreFocusTarget>): string {
  let base: Record<string, unknown> = {};
  try {
    const raw = (Object.values(restoreTarget)[0] as string | undefined) ?? '{}';
    base = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    base = {};
  }
  return JSON.stringify({ ...base, focusable: { ignoreKeydown: { Escape: true } } });
}

interface Entry<C> {
  loading: boolean;
  rows: C[];
  error?: unknown;
}

export function NestedTriggerCell<T extends Record<string, unknown>, C extends Record<string, unknown>>(props: {
  parent: T;
  nested: NestedConfig<T, C>;
  /** The parent grid's look — passed to the side-panel's child grid. The hover preview keeps the
   *  default look on purpose: `look="ce"` would add the subgrid's inset and "Rows: N" footer inside
   *  a popover, which is not a stock surface. */
  look?: 'default' | 'ce';
}): JSX.Element {
  const { parent, nested, look } = props;
  const [entry, setEntry] = useState<Entry<C> | null>(null);
  const [open, setOpen] = useState(false);
  // Keys of child rows selected in the drawer — surfaced back in the trigger cell AND
  // fed to the child grid as `initialSelectedKeys` so the selection is RESTORED when the
  // drawer reopens (Fluent unmounts the drawer's child grid on close).
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Invalidate the on-demand cache when `reloadToken` changes (StrictMode-safe by value).
  const prevReloadToken = useRef(nested.reloadToken);
  useEffect(() => {
    if (nested.reloadToken === prevReloadToken.current) return;
    prevReloadToken.current = nested.reloadToken;
    setEntry(null);
  }, [nested.reloadToken]);

  const load = useCallback(() => {
    setEntry((prev) => {
      // A failed load is not final: opening/hovering again retries.
      if (prev && prev.error === undefined) return prev;
      // ★ A sync throw or a rejected promise used to leave `loading` forever (a spinner that never cleared).
      let result: C[] | Promise<C[]>;
      try {
        result = nested.getChildren(parent) as C[] | Promise<C[]>;
      } catch (reason) {
        return { loading: false, rows: [], error: childrenError(reason) };
      }
      if (Array.isArray(result)) return { loading: false, rows: result };
      Promise.resolve(result).then(
        (rows) => mounted.current && setEntry({ loading: false, rows }),
        (reason: unknown) => mounted.current && setEntry({ loading: false, rows: [], error: childrenError(reason) }),
      );
      return { loading: true, rows: [] };
    });
  }, [parent, nested]);

  // Unknown after a failure: the badge/trigger reads "related" (no count), never "0 related".
  const count = entry && !entry.loading && entry.error === undefined ? entry.rows.length : undefined;

  // ── hover-callout state (hooks must run unconditionally) ──
  // ★★ CONTROLLED, with its own timers, because Fluent's `openOnHover` (9.x) has NO enter delay and
  //    its trigger `onClick` always TOGGLES — so a hover-then-click closed it, a tap (emulated
  //    mouseenter + click) opened and closed it at once, and a click-open never called `load()`
  //    (only mouseenter did), leaving an endless spinner. The old trigger was also a bare <span>:
  //    no role, no tabIndex, unreachable from the keyboard.
  const [popOpen, setPopOpen] = useState(false);
  // ★★★ The side-panel trigger is where the drawer returns focus. MEASURED: without it, Escape (or the
  //     drawer's Close) dropped focus to <body>, because the drawer is opened from a plain Button with
  //     controlled `open` — no DrawerTrigger — and Fluent restores only to a marked restore target.
  //     Called up here because the hover-callout branch below returns early and hooks must not.
  const restoreFocusTarget = useRestoreFocusTarget();
  const openTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const clearTimers = useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = closeTimer.current = undefined;
  }, []);
  useEffect(() => clearTimers, [clearTimers]);
  const setOpenAndLoad = useCallback(
    (next: boolean) => {
      if (next) load();
      setPopOpen(next);
    },
    [load]
  );
  // ★ Touch-first devices get click/tap only: hover handlers would re-open what the tap closes.
  const canHover = useCanHover();

  if (nested.mode === 'hover-callout') {
    const max = nested.calloutMaxRows ?? 5;
    const preview = entry ? entry.rows.slice(0, max) : [];
    const badgeText = entry?.loading ? '…' : count !== undefined ? `${count} related` : 'related';
    const delay = Math.max(0, nested.hoverDelay ?? 300);
    const hoverIn = canHover
      ? () => {
          if (closeTimer.current) clearTimeout(closeTimer.current);
          closeTimer.current = undefined;
          if (popOpen || openTimer.current) return;
          // ★ Nothing is fetched until the delay elapses — a pointer passing over a column fires
          //   no child queries.
          openTimer.current = setTimeout(() => {
            openTimer.current = undefined;
            setOpenAndLoad(true);
          }, delay);
        }
      : undefined;
    const hoverOut = canHover
      ? () => {
          if (openTimer.current) clearTimeout(openTimer.current);
          openTimer.current = undefined;
          if (closeTimer.current) clearTimeout(closeTimer.current);
          closeTimer.current = setTimeout(() => {
            closeTimer.current = undefined;
            setPopOpen(false);
          }, 200);
        }
      : undefined;
    return (
      <Popover
        open={popOpen}
        onOpenChange={(_e, data) => {
          clearTimers();
          setOpenAndLoad(data.open);
        }}
        positioning="below-start"
        withArrow
      >
        <PopoverTrigger disableButtonEnhancement>
          <Button
            appearance="secondary"
            size="small"
            shape="circular"
            {...(popOpen ? { 'data-tabster': withEscapeOptOut(restoreFocusTarget) } : {})}
            aria-label={`${badgeText} — show related records`}
            onMouseEnter={hoverIn}
            onMouseLeave={hoverOut}
            style={{ minWidth: 0, fontWeight: 400 }}
          >
            {badgeText}
          </Button>
        </PopoverTrigger>
        <PopoverSurface onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
          <div style={{ minWidth: 360, maxWidth: 560 }}>
            {!entry || entry.loading ? (
              <Spinner size="tiny" label="Loading…" />
            ) : entry.error !== undefined ? (
              <span role="alert" data-gridkit-children-error="">{CHILDREN_LOAD_ERROR}</span>
            ) : entry.rows.length === 0 ? (
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                No related records
              </Text>
            ) : (
              <>
                <ReadOnlyGrid<C> items={preview} columns={nested.childColumns} registry={nested.childRegistry} compact />
                {entry.rows.length > max && (
                  <Text size={200} style={{ color: tokens.colorNeutralForeground3, paddingTop: 4, display: 'block' }}>
                    +{entry.rows.length - max} more
                  </Text>
                )}
              </>
            )}
          </div>
        </PopoverSurface>
      </Popover>
    );
  }

  // side-panel (also the fallback for detail-pane) — fetch on open, host in an OverlayDrawer.
  const baseLabel = formatTriggerLabel(nested.triggerLabel, count);
  // Once child rows are selected in the drawer, the trigger cell (the "related"
  // column) shows "N selected" instead of the count.
  const label = selectedKeys.length > 0 ? `${selectedKeys.length} selected` : baseLabel;
  return (
    <>
      <Button
        {...restoreFocusTarget}
        appearance="subtle"
        size="small"
        icon={<PanelRightRegular />}
        onClick={() => {
          load();
          setOpen(true);
        }}
      >
        {label}
      </Button>
      <OverlayDrawer open={open} position="end" size={drawerSizeFor(nested.panelSize)} onOpenChange={(_e, data) => setOpen(data.open)}>
        <DrawerHeader>
          <DrawerHeaderTitle
            action={<Button appearance="subtle" aria-label="Close" icon={<DismissRegular />} onClick={() => setOpen(false)} />}
          >
            {baseLabel}
          </DrawerHeaderTitle>
        </DrawerHeader>
        <DrawerBody>
          {!entry || entry.loading ? (
            <Spinner label="Loading related records…" />
          ) : entry.error !== undefined ? (
            <span role="alert" data-gridkit-children-error="">{CHILDREN_LOAD_ERROR}</span>
          ) : (
            <DataGrid<C>
              items={entry.rows}
              columns={nested.childColumns}
              registry={nested.childRegistry}
              look={look}
              compact
              selectionMode={nested.childSelectionMode}
              initialSelectedKeys={selectedKeys}
              onSelectionChanged={
                nested.childSelectionMode
                  ? (sel) => {
                      setSelectedKeys(sel.map((r) => defaultGetKey(r)));
                      nested.onChildSelectionChanged?.(parent, sel);
                    }
                  : undefined
              }
              editable={nested.childEditable}
              editTrigger={nested.childEditTrigger}
              resizableColumns={nested.childResizableColumns}
              resizableColumnsOptions={nested.childResizableColumns ? { autoFitColumns: false } : undefined}
              onValueChange={
                nested.onChildValueChange ? (rk, fn, v, ov) => nested.onChildValueChange!(parent, rk, fn, v, ov) : undefined
              }
            />
          )}
        </DrawerBody>
      </OverlayDrawer>
    </>
  );
}
