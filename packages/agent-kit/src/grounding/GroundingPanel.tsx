import * as React from 'react';
import { Text, makeStyles, tokens } from '@fluentui/react-components';
import { Disclosure } from '../internal';

export interface GroundingPanelProps {
  /** The SAME object passed as `AgentTurn.grounding`. */
  grounding?: Record<string, unknown>;
  title?: string;
  defaultOpen?: boolean;
}

const useStyles = makeStyles({
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(96px, max-content) 1fr',
    gap: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalM}`,
    margin: 0,
    fontSize: tokens.fontSizeBase200,
  },
  key: { color: tokens.colorNeutralForeground3, margin: 0 },
  value: { margin: 0, wordBreak: 'break-word', fontFamily: tokens.fontFamilyMonospace },
  empty: { fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground3 },
});

function render(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

/**
 * What the model was told.
 *
 * ★★ It renders the SAME object the turn carried (`AgentTurn.grounding`), which is the point:
 *    the facts the host computed deterministically and the facts shown on screen cannot drift
 *    apart, because there is only one of them. The model EXPLAINS these; it must never be the
 *    thing that derives them — a hallucinated identifier is worse than no answer.
 *
 * ★ A definition list on a CSS grid, not a `Table`: `react-table` reaches
 *   `useArrowNavigationGroup`, and key/value pairs are not tabular data.
 */
export function GroundingPanel({
  grounding,
  title = 'What this answer used',
  defaultOpen = false,
}: GroundingPanelProps): React.ReactElement | null {
  const styles = useStyles();
  const id = React.useId();
  const entries = Object.entries(grounding ?? {});
  if (entries.length === 0) return null;

  return (
    <Disclosure id={id} defaultOpen={defaultOpen} summary={title}>
      <dl className={styles.grid}>
        {entries.map(([key, value]) => (
          <React.Fragment key={key}>
            <dt className={styles.key}>{key}</dt>
            <dd className={styles.value}>{render(value)}</dd>
          </React.Fragment>
        ))}
      </dl>
      <Text as="p" className={styles.empty}>
        These facts were supplied by the app, not produced by the model.
      </Text>
    </Disclosure>
  );
}
