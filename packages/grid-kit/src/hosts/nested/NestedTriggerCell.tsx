import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActionButton,
  Callout,
  DirectionalHint,
  Panel,
  Spinner,
  Text,
} from '@fluentui/react';
import type { NestedConfig } from '../../types';
import { defaultGetKey } from '../../adapters';
import { DataGrid } from '../DataGrid';
import { ReadOnlyGrid } from '../ReadOnlyGrid';
import { formatTriggerLabel, panelTypeFor } from './labels';
import { CHILDREN_LOAD_ERROR, childrenError } from './useChildren';

interface Entry<C> {
  loading: boolean;
  rows: C[];
  error?: unknown;
}

/**
 * Per-parent-row trigger cell for `side-panel` and `hover-callout` nested modes.
 * Children are resolved **lazily** — on click (panel) or first hover (callout) —
 * so a 50-row page doesn't fire 50 fetches up front.
 */
export function NestedTriggerCell<T extends Record<string, unknown>, C extends Record<string, unknown>>(props: {
  parent: T;
  nested: NestedConfig<T, C>;
}): JSX.Element {
  const { parent, nested } = props;
  const [entry, setEntry] = useState<Entry<C> | null>(null);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  // Keys of child rows selected in the panel — surfaced back in the trigger cell AND
  // fed to the child grid as `initialSelectedKeys` so the selection is RESTORED when the
  // panel reopens (Fluent unmounts the panel's child grid on close).
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const hostRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    };
  }, []);

  // Invalidate the on-demand cache when `reloadToken` changes (e.g. after associating a
  // new child): drop the loaded `entry` so the next open/hover re-fetches via `load()`
  // (which early-returns on a non-null `entry`). Value-compared so it's StrictMode-safe.
  // Edge: if the panel/callout is OPEN at bump time it shows the spinner until reopened —
  // acceptable, these modes are on-demand and usually closed during a toolbar action.
  const prevReloadToken = useRef(nested.reloadToken);
  useEffect(() => {
    if (nested.reloadToken === prevReloadToken.current) return;
    prevReloadToken.current = nested.reloadToken;
    setEntry(null);
  }, [nested.reloadToken]);

  // Resolve children once, on demand.
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

  if (nested.mode === 'hover-callout') {
    const max = nested.calloutMaxRows ?? 5;
    const preview = entry ? entry.rows.slice(0, max) : [];
    return (
      <div
        ref={hostRef}
        style={{ display: 'inline-block' }}
        onMouseEnter={() => {
          load();
          hoverTimer.current = setTimeout(() => mounted.current && setHovered(true), nested.hoverDelay ?? 300);
        }}
        onMouseLeave={() => {
          if (hoverTimer.current) clearTimeout(hoverTimer.current);
          setHovered(false);
        }}
      >
        <Text
          variant="small"
          styles={{ root: { background: '#edebe9', borderRadius: 10, padding: '2px 10px', cursor: 'default' } }}
        >
          {entry?.loading ? '…' : count !== undefined ? `${count} related` : 'related'}
        </Text>
        {hovered && entry && !entry.loading && (entry.rows.length > 0 || entry.error !== undefined) && (
          <Callout
            target={hostRef.current}
            onDismiss={() => setHovered(false)}
            directionalHint={DirectionalHint.bottomLeftEdge}
            isBeakVisible={false}
            gapSpace={4}
          >
            <div style={{ padding: 8, minWidth: 360, maxWidth: 560 }}>
              {entry.error !== undefined ? (
                <span role="alert" data-gridkit-children-error="">{CHILDREN_LOAD_ERROR}</span>
              ) : (
                <ReadOnlyGrid<C> items={preview} columns={nested.childColumns} registry={nested.childRegistry} compact />
              )}
              {entry.error === undefined && entry.rows.length > max && (
                <Text variant="small" styles={{ root: { color: '#605e5c', paddingTop: 4 } }}>
                  +{entry.rows.length - max} more
                </Text>
              )}
            </div>
          </Callout>
        )}
      </div>
    );
  }

  // side-panel (default for triggered modes) — fetch on open.
  const baseLabel = formatTriggerLabel(nested.triggerLabel, count);
  // Once child rows are selected in the panel, the trigger cell (the "related"
  // column) shows "N selected" instead of the count.
  const label = selectedKeys.length > 0 ? `${selectedKeys.length} selected` : baseLabel;
  return (
    <>
      <ActionButton
        iconProps={{ iconName: nested.triggerIcon ?? 'OpenPaneMirrored' }}
        onClick={() => {
          load();
          setOpen(true);
        }}
        styles={{ root: { height: 28 } }}
      >
        {label}
      </ActionButton>
      <Panel
        isOpen={open}
        onDismiss={() => setOpen(false)}
        type={panelTypeFor(nested.panelSize)}
        headerText={baseLabel}
        closeButtonAriaLabel="Close"
      >
        {!entry || entry.loading ? (
          <Spinner label="Loading related records…" />
        ) : entry.error !== undefined ? (
          <span role="alert" data-gridkit-children-error="">{CHILDREN_LOAD_ERROR}</span>
        ) : (
          <DataGrid<C>
            items={entry.rows}
            columns={nested.childColumns}
            registry={nested.childRegistry}
            compact
            columnLayout="fixed"
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
            onValueChange={
              nested.onChildValueChange
                ? (rk, fn, v, ov) => nested.onChildValueChange!(parent, rk, fn, v, ov)
                : undefined
            }
          />
        )}
      </Panel>
    </>
  );
}
