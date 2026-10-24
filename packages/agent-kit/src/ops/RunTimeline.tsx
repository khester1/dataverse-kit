import * as React from 'react';
import { makeStyles, tokens, Text } from '@fluentui/react-components';
import type { AgentMessage, AgentToolCall } from '../core';
import { AgentStatusBadge } from './AgentStatusBadge';
import { UsageMeter } from './UsageMeter';
import { Disclosure } from '../internal';

export interface RunTimelineProps {
  message: AgentMessage;
  /** Collapsed by default: a trace is diagnostic, not the primary reading. */
  defaultOpen?: boolean;
}

const useStyles = makeStyles({
  list: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS },
  step: { display: 'flex', gap: tokens.spacingHorizontalS, alignItems: 'baseline' },
  index: { fontFamily: tokens.fontFamilyMonospace, fontSize: tokens.fontSizeBase100, color: tokens.colorNeutralForeground3, minWidth: '18px' },
  name: { fontFamily: tokens.fontFamilyMonospace, fontSize: tokens.fontSizeBase200 },
  status: { fontSize: tokens.fontSizeBase100, color: tokens.colorNeutralForeground3 },
  section: { marginTop: tokens.spacingVerticalS },
});

const TOOL_STATUS: Record<AgentToolCall['status'], string> = {
  proposed: 'proposed',
  running: 'running',
  succeeded: 'succeeded',
  failed: 'failed',
  denied: 'denied',
};

/**
 * What one turn actually did: its outcome, the tools it called, what it cited, what it cost.
 *
 * ★ An ORDERED LIST, not Fluent's `Tree`. `react-tree` reaches `useArrowNavigationGroup`, and a
 *   trace is a sequence — the ordering is the information. If steps ever nest, revisit rather
 *   than flattening a tree into a list.
 *
 * ★ Each step's status is in TEXT beside it. A row of coloured dots conveys nothing to a
 *   screen reader and little to a colour-blind reader.
 */
export function RunTimeline({ message, defaultOpen = false }: RunTimelineProps): React.ReactElement | null {
  const styles = useStyles();
  const id = React.useId();

  const calls = message.toolCalls ?? [];
  const sources = message.sources ?? [];
  const hasAnything = calls.length > 0 || sources.length > 0 || message.usage || message.failure;
  if (!hasAnything) return null;

  const status = message.failure?.status ?? (message.guarded ? 'blocked' : 'succeeded');

  return (
    <Disclosure
      id={id}
      defaultOpen={defaultOpen}
      summary={`Trace — ${calls.length} tool call${calls.length === 1 ? '' : 's'}`}
    >
      <div className={styles.step}>
        <AgentStatusBadge status={status} reason={message.failure?.message} size="small" />
      </div>

      {calls.length > 0 ? (
        <ol className={styles.list} aria-label="Tool calls">
          {calls.map((call, index) => (
            <li key={call.id} className={styles.step}>
              <span className={styles.index}>{index + 1}.</span>
              <span className={styles.name}>{call.name}</span>
              <span className={styles.status}>{TOOL_STATUS[call.status]}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {sources.length > 0 ? (
        <Text as="p" size={200} className={styles.section}>
          {sources.length} source{sources.length === 1 ? '' : 's'} retrieved
        </Text>
      ) : null}

      <div className={styles.section}>
        <UsageMeter usage={message.usage} show={['tokens', 'cost', 'duration', 'model']} />
      </div>
    </Disclosure>
  );
}
