import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { makeStyles, tokens, Text } from '@fluentui/react-components';
import {
  AgentStatusBadge, AvailabilityBanner, UsageMeter, ThrottleNotice, ModelBadge,
  AgentPicker, RunTimeline, RunHistoryPanel, AgentOpsPanel, runStatusLabel,
  type AgentDescriptor, type AgentRunRecord,
} from '../ops';
import type { AgentRunStatus, AgentMessage } from '../core';

const useStyles = makeStyles({
  col: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, maxWidth: '620px' },
  row: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalS, alignItems: 'center' },
  grid: { display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`, alignItems: 'center' },
  caption: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
});

const ALL: AgentRunStatus[] = ['succeeded', 'blocked', 'refused', 'error', 'notProvisioned', 'cancelled'];

const agents: AgentDescriptor[] = [
  { id: 'triage', name: 'Case triage', model: 'gpt-4.1', version: '6', description: 'Routes and summarises incoming cases.' },
  { id: 'explain', name: 'Label explainer', model: 'gpt-4o', version: '2' },
];

const RUN_BASE = Date.UTC(2026, 2, 12, 9, 0);
const runs: AgentRunRecord[] = [
  { id: 'r1', status: 'succeeded', startedAt: RUN_BASE, prompt: 'Summarise Contoso', correlationId: '8f3a-11ee', usage: { inputTokens: 412, outputTokens: 28, costUsd: 0.000912, durationMs: 1840, model: 'gpt-4.1' } },
  { id: 'r2', status: 'blocked', startedAt: RUN_BASE - 9 * 60_000, prompt: 'Draft a reply', correlationId: '7d21-11ee', usage: { inputTokens: 210, outputTokens: 0, durationMs: 640 } },
  { id: 'r3', status: 'notProvisioned', startedAt: RUN_BASE - 40 * 60_000, prompt: 'Analyse the photo' },
  { id: 'r4', status: 'cancelled', startedAt: RUN_BASE - 70 * 60_000, prompt: 'Full activity history', usage: { outputTokens: 96, durationMs: 2100 } },
];

const traced: AgentMessage = {
  id: 'm1', role: 'assistant', authorId: 'agent', text: 'Raised the credit note.', createdAt: RUN_BASE,
  toolCalls: [
    { id: 'c1', name: 'get_account_balance', argumentsJson: '{"accountId":"contoso"}', status: 'succeeded', resultText: '{"balance":6200}' },
    { id: 'c2', name: 'create_credit_note', argumentsJson: '{"amount":6200}', status: 'denied' },
  ],
  sources: [
    { id: 's1', title: 'Contoso Ltd', kind: 'dataverse' },
    { id: 's2', title: 'KB-208', kind: 'knowledge' },
  ],
  usage: { inputTokens: 412, outputTokens: 28, cachedTokens: 128, costUsd: 0.000912, durationMs: 1840, model: 'gpt-4.1' },
};

const meta: Meta = { title: 'Agent ops' };
export default meta;

/**
 * ★ ONE ROW PER RUN STATUS — the increment-5 story requirement.
 *
 *   Six states rather than {ok|error}, because they need different reactions: a content filter,
 *   the model declining, nobody having configured the service, the user pressing stop. Seeing
 *   them together is what makes a shared label obvious.
 */
function StatusesDemo(): React.ReactElement {
  const styles = useStyles();
  return (
    <div className={styles.col}>
      <div className={styles.grid}>
        {ALL.map((status) => (
          <React.Fragment key={status}>
            <AgentStatusBadge status={status} reason={`reason for ${status}`} />
            <code className={styles.caption}>
              {status} → “{runStatusLabel(status)}”
            </code>
          </React.Fragment>
        ))}
      </div>
      <Text className={styles.caption}>
        The state is in the words, not only the colour — four of these would otherwise be shades
        of red.
      </Text>
    </div>
  );
}
export const Statuses: StoryObj = { render: () => <StatusesDemo /> };

/** Reported vs not reported — the distinction a `$0.00` would erase. */
function UsageDemo(): React.ReactElement {
  const styles = useStyles();
  return (
    <div className={styles.col}>
      <UsageMeter usage={{ inputTokens: 412, outputTokens: 28, cachedTokens: 128, costUsd: 0.000912, durationMs: 1840, model: 'gpt-4.1' }} show={['tokens', 'cost', 'duration', 'model']} />
      <UsageMeter usage={{ model: 'gpt-4.1' }} show={['tokens', 'cost', 'duration', 'model']} />
      <Text className={styles.caption}>
        The second provider reported nothing but the model name. It did not cost zero.
      </Text>
    </div>
  );
}
export const Usage: StoryObj = { render: () => <UsageDemo /> };

/** Not-configured reads as information; an outage reads as a warning. */
function AvailabilityDemo(): React.ReactElement {
  const styles = useStyles();
  return (
    <div className={styles.col}>
      <AvailabilityBanner
        availability={{ available: false, status: 'notProvisioned', reason: 'No Foundry project is configured for this environment.' }}
        onRetry={() => {}}
      />
      <AvailabilityBanner
        availability={{ available: false, reason: 'The broker returned 500 for the last three probes.' }}
        onRetry={() => {}}
      />
      <ThrottleNotice
        failure={{ status: 'error', message: 'Too many requests.', recoverable: true, retryAfterMs: 8000 }}
        onRetry={() => {}}
      />
    </div>
  );
}
export const Availability: StoryObj = { render: () => <AvailabilityDemo /> };

/** What one turn actually did. */
function TraceDemo(): React.ReactElement {
  const styles = useStyles();
  return (
    <div className={styles.col}>
      <div className={styles.row}>
        <ModelBadge provider="Case triage" model="gpt-4.1" version="6" />
      </div>
      <RunTimeline message={traced} defaultOpen />
    </div>
  );
}
export const Trace: StoryObj = { render: () => <TraceDemo /> };

/** The composed admin surface. */
function OpsPanelDemo(): React.ReactElement {
  const styles = useStyles();
  const [selected, setSelected] = React.useState('triage');
  return (
    <div className={styles.col}>
      <AgentOpsPanel
        availability={{
          available: true,
          capabilities: { streaming: true, tools: true, citations: true, attachments: false, cancel: true },
        }}
        agents={agents}
        selectedAgentId={selected}
        onSelectAgent={setSelected}
        runs={runs}
        locale="en-GB"
      />
      <Text className={styles.caption}>
        `RunHistoryPanel` takes a `grid` slot — a host that accepts tabster passes a grid-kit/v9
        grid in; the list above is the fallback.
      </Text>
    </div>
  );
}
export const OpsPanel: StoryObj = { name: 'Ops panel', render: () => <OpsPanelDemo /> };

/** The picker on its own, for the config surface. */
function PickerDemo(): React.ReactElement {
  const styles = useStyles();
  const [selected, setSelected] = React.useState('triage');
  return (
    <div className={styles.col}>
      <AgentPicker agents={agents} selectedId={selected} onSelect={setSelected} />
      <RunHistoryPanel runs={runs.slice(0, 2)} locale="en-GB" />
    </div>
  );
}
export const Picker: StoryObj = { render: () => <PickerDemo /> };
