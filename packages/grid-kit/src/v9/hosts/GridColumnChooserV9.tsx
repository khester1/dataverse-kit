/**
 * The v9 column chooser panel — the counterpart of the v8 `GridColumnChooser` (`../../hosts`), which
 * is a Fluent v8 `Panel` and must never be imported here. Same behaviour: show/hide columns and
 * reorder the shown ones on a working copy that resets on every open and commits on Apply; at least
 * one column must stay shown.
 *
 * A v8 CLONE, not a measured copy of the Dynamics "Edit columns" pane (no capture of that pane exists
 * in the repo) — so no parity claim; under `look="ce"` only the title reads "Edit columns".
 * The drawer itself is `./panelDrawer` (shared with the filter builder).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, Text, makeStyles, tokens } from '@fluentui/react-components';
import { ChevronDown20Regular, ChevronUp20Regular } from '@fluentui/react-icons';
import { PanelDrawer } from './panelDrawer';
import type { ColumnDef } from '../../types';
import type { V9ColumnChooserPanelProps } from '../types';

/** The panel contract (`V9ColumnChooserPanelProps`) — pass this component as `columnChooser`. */
export type GridColumnChooserV9Props<T> = V9ColumnChooserPanelProps<T>;

const useStyles = makeStyles({
  actions: { display: 'flex', gap: tokens.spacingHorizontalS },
  section: { fontWeight: tokens.fontWeightSemibold, color: tokens.colorNeutralForeground3, paddingTop: tokens.spacingVerticalS },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke3}`,
    paddingBlock: tokens.spacingVerticalXXS,
  },
  name: { flex: 1, marginLeft: tokens.spacingHorizontalS },
  // A border, not Fluent's `Divider`: that component alone added 8.5 KB (minified) to EVERY v9
  // DataGrid consumer's bundle — MEASURED, for one horizontal line.
  rule: { borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`, marginBlock: tokens.spacingVerticalXS },
});

export function GridColumnChooserV9<T>({
  open,
  onClose,
  columns,
  visibleOrder,
  onApply,
  title = 'Columns',
}: GridColumnChooserV9Props<T>): JSX.Element {
  const styles = useStyles();
  const [working, setWorking] = useState<string[]>(() => [...visibleOrder]);
  // Reset the working copy each time the panel opens (Cancel = discard).
  useEffect(() => {
    if (open) setWorking([...visibleOrder]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only on the open transition
  }, [open]);

  const byKey = useMemo(() => new Map(columns.map((c) => [c.key, c])), [columns]);
  const shown = working.map((k) => byKey.get(k)).filter((c): c is ColumnDef<T> => !!c);
  const hidden = columns.filter((c) => !working.includes(c.key));

  const show = useCallback((key: string) => setWorking((p) => (p.includes(key) ? p : [...p, key])), []);
  const hide = useCallback((key: string) => setWorking((p) => (p.length <= 1 ? p : p.filter((k) => k !== key))), []);
  const move = useCallback((key: string, dir: -1 | 1) => {
    setWorking((p) => {
      const i = p.indexOf(key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= p.length) return p;
      const next = [...p];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }, []);
  const apply = useCallback(() => {
    // Only keys that still exist (a column can disappear while the panel is open).
    const valid = working.filter((k) => byKey.has(k));
    if (valid.length === 0) return;
    onApply(valid);
    onClose();
  }, [working, byKey, onApply, onClose]);

  return (
    <PanelDrawer
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button appearance="primary" onClick={apply} disabled={shown.length === 0}>
            Apply
          </Button>
        </>
      }
    >
      <div className={styles.actions}>
        <Button onClick={() => setWorking(columns.map((c) => c.key))} disabled={hidden.length === 0}>
          Show all
        </Button>
        <Button onClick={() => setWorking([...visibleOrder])}>Reset</Button>
      </div>
      <Text className={styles.section}>Shown ({shown.length})</Text>
      {shown.map((c, i) => (
        <div key={c.key} className={styles.row} data-gridkit-chooser-shown={c.key}>
          <Button
            appearance="subtle"
            size="small"
            icon={<ChevronUp20Regular />}
            aria-label={`Move ${c.name} up`}
            disabled={i === 0}
            onClick={() => move(c.key, -1)}
          />
          <Button
            appearance="subtle"
            size="small"
            icon={<ChevronDown20Regular />}
            aria-label={`Move ${c.name} down`}
            disabled={i === shown.length - 1}
            onClick={() => move(c.key, 1)}
          />
          <Checkbox checked aria-label={`Hide ${c.name}`} disabled={shown.length === 1} onChange={() => hide(c.key)} />
          <span className={styles.name}>{c.name}</span>
        </div>
      ))}
      <div className={styles.rule} role="separator" />
      <Text className={styles.section}>Hidden ({hidden.length})</Text>
      {hidden.length === 0 ? (
        <Text size={200}>All columns are shown.</Text>
      ) : (
        hidden.map((c) => (
          <div key={c.key} className={styles.row} data-gridkit-chooser-hidden={c.key}>
            <Checkbox checked={false} aria-label={`Show ${c.name}`} onChange={() => show(c.key)} />
            <span className={styles.name}>{c.name}</span>
          </div>
        ))
      )}
    </PanelDrawer>
  );
}
