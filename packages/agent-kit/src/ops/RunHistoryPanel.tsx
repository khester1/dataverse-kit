import * as React from 'react';
import { makeStyles, tokens, Text } from '@fluentui/react-components';
import type { AgentRunRecord } from './types';
import { AgentStatusBadge } from './AgentStatusBadge';
import { UsageMeter } from './UsageMeter';

export interface RunHistoryPanelProps {
  runs: readonly AgentRunRecord[];
  /**
   * A grid to render instead of the built-in list.
   *
   * ★★ THIS SLOT IS WHY THERE IS NO `RunHistoryList`. A run history is tabular, and this repo
   *    already ships a grid — `@dataverse-kit/grid-kit/v9` — with sorting, virtualisation and
   *    column chooser. Re-implementing a thin version here would be a second grid to maintain
   *    and a worse one.
   *
   *    It is a SLOT rather than a dependency because grid-kit/v9's `DataGrid` builds on
   *    `react-table` and its toolbar on `Menu`, both of which reach tabster. A host that accepts
   *    that passes a grid in; a host that does not gets the fallback list below. That is
   *    surface-kit's documented "pass grids in as children" pattern, and it moves the tabster
   *    decision to the host, where it belongs.
   */
  grid?: React.ReactNode;
  locale?: string;
  emptyLabel?: string;
}

const useStyles = makeStyles({
  list: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS },
  row: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: tokens.spacingVerticalXS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  head: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS, flexWrap: 'wrap' },
  time: { fontSize: tokens.fontSizeBase100, color: tokens.colorNeutralForeground3 },
  prompt: { fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  id: { fontFamily: tokens.fontFamilyMonospace, fontSize: tokens.fontSizeBase100, color: tokens.colorNeutralForeground3 },
  empty: { padding: tokens.spacingVerticalM, color: tokens.colorNeutralForeground3 },
});

export function RunHistoryPanel({
  runs,
  grid,
  locale,
  emptyLabel = 'No runs yet.',
}: RunHistoryPanelProps): React.ReactElement {
  const styles = useStyles();
  if (grid) return <>{grid}</>;
  if (runs.length === 0) {
    return (
      <Text className={styles.empty} size={200}>
        {emptyLabel}
      </Text>
    );
  }

  return (
    <ul className={styles.list} aria-label="Run history">
      {runs.map((run) => (
        <li key={run.id} className={styles.row}>
          <div className={styles.head}>
            <AgentStatusBadge status={run.status} size="small" />
            <span className={styles.time}>
              {new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(
                new Date(run.startedAt),
              )}
            </span>
            {/* ★ The correlation id is surfaced, not hidden: it is the only handle someone has
                when finding this run in App Insights at 3am. */}
            {run.correlationId ? <span className={styles.id}>{run.correlationId}</span> : null}
          </div>
          {run.prompt ? <span className={styles.prompt}>{run.prompt}</span> : null}
          <UsageMeter usage={run.usage} />
        </li>
      ))}
    </ul>
  );
}
