import * as React from 'react';
import { Tooltip, makeStyles, tokens } from '@fluentui/react-components';
import type { AgentSource } from '../core';

export interface CitationChipProps {
  marker: string;
  source?: AgentSource;
  onOpen?: (source: AgentSource) => void;
}

const useStyles = makeStyles({
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '18px',
    height: '18px',
    padding: `0 ${tokens.spacingHorizontalXXS}`,
    marginLeft: '2px',
    verticalAlign: 'super',
    fontSize: tokens.fontSizeBase100,
    lineHeight: '18px',
    borderRadius: tokens.borderRadiusSmall,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground2,
    cursor: 'pointer',
    ':hover': { backgroundColor: tokens.colorNeutralBackground3Hover },
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '1px' },
  },
  inert: { cursor: 'default' },
});

/** An inline `[1]`. ★ `Tooltip` is measured tabster-safe (`react-tooltip` imports only
 *  `useIsNavigatingWithKeyboard`), so this one is Fluent's rather than in-tree. */
export function CitationChip({ marker, source, onOpen }: CitationChipProps): React.ReactElement {
  const styles = useStyles();
  const label = source ? `Source ${marker}: ${source.title}` : `Source ${marker}`;

  if (!source || !onOpen) {
    return (
      <span className={`${styles.chip} ${styles.inert}`} aria-label={label}>
        {marker}
      </span>
    );
  }
  return (
    <Tooltip content={source.title} relationship="description" withArrow>
      <button type="button" className={styles.chip} aria-label={label} onClick={() => onOpen(source)}>
        {marker}
      </button>
    </Tooltip>
  );
}
