import * as React from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import type { DayDividerLabel } from '../core';

export interface DayDividerProps {
  label: DayDividerLabel;
  locale?: string;
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    margin: `${tokens.spacingVerticalM} 0`,
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  rule: { flex: 1, height: '1px', backgroundColor: tokens.colorNeutralStroke2 },
});

/** Map the pure descriptor to words. ★ The formatting lives HERE, not in ./core, so the host
 *  can localise it and so the core function stays deterministic across CI locales. */
export function formatDayLabel(label: DayDividerLabel, locale?: string): string {
  switch (label.kind) {
    case 'today':
      return 'Today';
    case 'yesterday':
      return 'Yesterday';
    case 'weekday':
      return new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(
        new Date(`${label.iso}T00:00:00Z`),
      );
    case 'date':
      return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(
        new Date(`${label.iso}T00:00:00Z`),
      );
  }
}

/** ★ `role="separator"` with an accessible name. A bare text node floating between list items
 *  reads as a message. */
export function DayDivider({ label, locale }: DayDividerProps): React.ReactElement {
  const styles = useStyles();
  const text = formatDayLabel(label, locale);
  return (
    <div className={styles.root} role="separator" aria-label={text}>
      <span className={styles.rule} aria-hidden="true" />
      <span>{text}</span>
      <span className={styles.rule} aria-hidden="true" />
    </div>
  );
}
