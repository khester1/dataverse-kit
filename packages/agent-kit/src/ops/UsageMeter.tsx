import * as React from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import type { AgentUsage } from '../core';

export interface UsageMeterProps {
  usage?: AgentUsage;
  show?: readonly ('tokens' | 'cost' | 'duration' | 'model')[];
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalM,
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
  },
  item: { display: 'flex', gap: tokens.spacingHorizontalXXS },
  value: { fontFamily: tokens.fontFamilyMonospace },
  unknown: { fontStyle: 'italic' },
});

/**
 * Tokens, cost, latency.
 *
 * ★★ "Not reported" is rendered as such, never as 0. A provider that does not report cost and
 *    one that cost nothing are completely different facts, and showing `$0.00` for the first is
 *    a confident lie — the kind that gets believed because it looks like data.
 */
export function UsageMeter({
  usage,
  show = ['tokens', 'cost', 'duration'],
}: UsageMeterProps): React.ReactElement | null {
  const styles = useStyles();
  if (!usage) return null;

  const items: { key: string; label: string; value: string; known: boolean }[] = [];

  if (show.includes('tokens')) {
    const known = usage.inputTokens !== undefined || usage.outputTokens !== undefined;
    items.push({
      key: 'tokens',
      label: 'Tokens',
      value: known
        ? `${usage.inputTokens ?? 0} in / ${usage.outputTokens ?? 0} out${
            usage.cachedTokens ? ` / ${usage.cachedTokens} cached` : ''
          }`
        : 'not reported',
      known,
    });
  }
  if (show.includes('cost')) {
    const known = usage.costUsd !== undefined;
    items.push({
      key: 'cost',
      label: 'Cost',
      value: known ? `$${usage.costUsd!.toFixed(6)}` : 'not reported',
      known,
    });
  }
  if (show.includes('duration')) {
    const known = usage.durationMs !== undefined;
    items.push({
      key: 'duration',
      label: 'Duration',
      value: known ? `${usage.durationMs} ms` : 'not reported',
      known,
    });
  }
  if (show.includes('model') && usage.model) {
    items.push({ key: 'model', label: 'Model', value: usage.model, known: true });
  }

  return (
    <div className={styles.root}>
      {items.map((item) => (
        <span key={item.key} className={styles.item}>
          {item.label}:{' '}
          <span className={item.known ? styles.value : styles.unknown}>{item.value}</span>
        </span>
      ))}
    </div>
  );
}
