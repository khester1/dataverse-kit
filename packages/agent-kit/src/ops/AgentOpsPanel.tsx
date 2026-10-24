import * as React from 'react';
import { makeStyles, tokens, Text } from '@fluentui/react-components';
import type { AgentAvailability } from '../core';
import type { AgentDescriptor, AgentRunRecord } from './types';
import { AvailabilityBanner } from './AvailabilityBanner';
import { AgentPicker } from './AgentPicker';
import { ModelBadge } from './ModelBadge';
import { RunHistoryPanel } from './RunHistoryPanel';

export interface AgentOpsPanelProps {
  availability?: AgentAvailability;
  agents?: readonly AgentDescriptor[];
  selectedAgentId?: string;
  onSelectAgent?: (id: string) => void;
  runs?: readonly AgentRunRecord[];
  /** Passed straight through to RunHistoryPanel — see that component for why it is a slot. */
  runsGrid?: React.ReactNode;
  onRefresh?: () => void;
  locale?: string;
}

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, minWidth: 0 },
  head: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS, flexWrap: 'wrap' },
  section: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS },
  caps: { fontSize: tokens.fontSizeBase100, color: tokens.colorNeutralForeground3 },
});

/** The composed ops surface: is it available, which agent, what has it done. */
export function AgentOpsPanel(props: AgentOpsPanelProps): React.ReactElement {
  const { availability, agents, selectedAgentId, onSelectAgent, runs = [], runsGrid, onRefresh, locale } = props;
  const styles = useStyles();
  const selected = agents?.find((a) => a.id === selectedAgentId);
  const caps = availability?.capabilities;

  return (
    <div className={styles.root}>
      <AvailabilityBanner availability={availability} onRetry={onRefresh} />

      {agents && agents.length > 0 && onSelectAgent ? (
        <div className={styles.section}>
          <AgentPicker agents={agents} selectedId={selectedAgentId} onSelect={onSelectAgent} />
          <div className={styles.head}>
            <ModelBadge provider={selected?.name} model={selected?.model} version={selected?.version} />
          </div>
        </div>
      ) : null}

      {caps ? (
        <span className={styles.caps}>
          {/* Capabilities in words: an affordance the provider cannot honour is worse than a
              missing one, so a host can hide the stop button when `cancel` is false. */}
          Supports:{' '}
          {(Object.entries(caps) as [string, boolean][])
            .filter(([, on]) => on)
            .map(([name]) => name)
            .join(', ') || 'nothing reported'}
        </span>
      ) : null}

      <div className={styles.section}>
        <Text weight="semibold" size={300}>
          Recent runs
        </Text>
        <RunHistoryPanel runs={runs} grid={runsGrid} locale={locale} />
      </div>
    </div>
  );
}
