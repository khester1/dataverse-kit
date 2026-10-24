import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Checkbox,
  DefaultButton,
  IconButton,
  Panel,
  PanelType,
  PrimaryButton,
  Separator,
  Stack,
  Text,
} from '@fluentui/react';
import type { ColumnDef } from '../types';

export interface GridColumnChooserProps<T extends Record<string, unknown>> {
  /** Whether the panel is open. */
  isOpen: boolean;
  /** Close handler. */
  onClose: () => void;
  /** All grid columns. */
  columns: ColumnDef<T>[];
  /** Currently visible column keys, in display order. */
  visibleOrder: string[];
  /** Apply the new visible-and-ordered column keys. */
  onApply: (visibleOrder: string[]) => void;
}

// The projection is framework-agnostic and shared with the v9 skin — it lives in `core/` (this
// Fluent v8 file must never be imported by v9). Re-exported so v8 import paths keep working.
export { orderVisibleColumns } from '../core/columnOrder';

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '4px 0',
  borderBottom: '1px solid #f3f2f1',
};
const sectionTitle = { root: { fontWeight: 600 as const, color: '#605e5c', padding: '8px 0 4px' } };

/**
 * Column chooser panel: show/hide grid columns and reorder the shown ones.
 * Edits a working copy and commits on Apply (reset on each open). At least one
 * column must stay shown.
 */
export function GridColumnChooser<T extends Record<string, unknown>>({
  isOpen,
  onClose,
  columns,
  visibleOrder,
  onApply,
}: GridColumnChooserProps<T>): JSX.Element {
  const [working, setWorking] = useState<string[]>(visibleOrder);

  // Reset the working copy each time the panel opens.
  useEffect(() => {
    if (isOpen) setWorking(visibleOrder);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only on the open transition
  }, [isOpen]);

  const byKey = useMemo(() => new Map(columns.map((c) => [c.key, c])), [columns]);
  const shown = working.map((k) => byKey.get(k)).filter((c): c is ColumnDef<T> => !!c);
  const hidden = columns.filter((c) => !working.includes(c.key));

  const show = useCallback((key: string) => {
    setWorking((prev) => (prev.includes(key) ? prev : [...prev, key]));
  }, []);
  const hide = useCallback((key: string) => {
    setWorking((prev) => (prev.length <= 1 ? prev : prev.filter((k) => k !== key)));
  }, []);
  const move = useCallback((key: string, dir: -1 | 1) => {
    setWorking((prev) => {
      const i = prev.indexOf(key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }, []);
  const showAll = useCallback(() => setWorking(columns.map((c) => c.key)), [columns]);
  const reset = useCallback(() => setWorking(visibleOrder), [visibleOrder]);

  const apply = useCallback(() => {
    if (working.length === 0) return;
    onApply(working);
    onClose();
  }, [working, onApply, onClose]);

  return (
    <Panel
      isOpen={isOpen}
      onDismiss={onClose}
      type={PanelType.medium}
      headerText="Columns"
      isFooterAtBottom
      onRenderFooterContent={() => (
        <Stack
          horizontal
          horizontalAlign="end"
          tokens={{ childrenGap: 8 }}
          styles={{ root: { padding: '12px 24px', borderTop: '1px solid #edebe9' } }}
        >
          <DefaultButton text="Cancel" onClick={onClose} />
          <PrimaryButton text="Apply" onClick={apply} disabled={working.length === 0} />
        </Stack>
      )}
    >
      <Stack horizontal tokens={{ childrenGap: 8 }} styles={{ root: { padding: '8px 0' } }}>
        <DefaultButton text="Show all" onClick={showAll} disabled={hidden.length === 0} />
        <DefaultButton text="Reset" onClick={reset} />
      </Stack>

      <Text block styles={sectionTitle}>
        Shown ({shown.length})
      </Text>
      {shown.map((c, i) => (
        <div key={c.key} style={rowStyle}>
          <IconButton
            iconProps={{ iconName: 'ChevronUp' }}
            ariaLabel={`Move ${c.name} up`}
            onClick={() => move(c.key, -1)}
            disabled={i === 0}
            styles={{ root: { height: 28, width: 28 } }}
          />
          <IconButton
            iconProps={{ iconName: 'ChevronDown' }}
            ariaLabel={`Move ${c.name} down`}
            onClick={() => move(c.key, 1)}
            disabled={i === shown.length - 1}
            styles={{ root: { height: 28, width: 28 } }}
          />
          <Checkbox
            checked
            ariaLabel={`Hide ${c.name}`}
            onChange={() => hide(c.key)}
            disabled={shown.length === 1}
            styles={{ root: { marginLeft: 4 } }}
          />
          <span style={{ flex: 1, marginLeft: 8 }}>{c.name}</span>
        </div>
      ))}

      <Separator />
      <Text block styles={sectionTitle}>
        Hidden ({hidden.length})
      </Text>
      {hidden.length === 0 ? (
        <Text variant="small" styles={{ root: { color: '#a19f9d' } }}>
          All columns are shown.
        </Text>
      ) : (
        hidden.map((c) => (
          <div key={c.key} style={rowStyle}>
            <Checkbox checked={false} ariaLabel={`Show ${c.name}`} onChange={() => show(c.key)} />
            <span style={{ flex: 1, marginLeft: 8 }}>{c.name}</span>
          </div>
        ))
      )}
    </Panel>
  );
}
