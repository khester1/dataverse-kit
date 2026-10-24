import * as React from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { ShieldErrorRegular } from '@fluentui/react-icons';
import type { AgentMessage } from '../core';

export interface ProviderAttributionProps {
  provider?: string;
  model?: string;
  guarded?: boolean;
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXXS,
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
  },
  guarded: { color: tokens.colorPaletteDarkOrangeForeground1 },
});

/**
 * Who produced this answer.
 *
 * ★★ WHEN `guarded` IS SET THE VISIBLE TEXT MUST CHANGE, and that is the whole contract.
 *    `guarded` means the provider WITHHELD its generated answer and substituted safe text.
 *    Attributing that substitute to the model as if it were the model's words is the
 *    misattribution this component exists to prevent — so the difference is in words a reader
 *    sees, not a colour, an icon or a `data-` attribute. The gate asserts BOTH directions.
 */
export function ProviderAttribution({ provider, model, guarded }: ProviderAttributionProps): React.ReactElement | null {
  const styles = useStyles();
  if (!provider && !model && !guarded) return null;

  const who = [provider, model].filter(Boolean).join(' · ');

  if (guarded) {
    return (
      <span className={`${styles.root} ${styles.guarded}`}>
        <ShieldErrorRegular aria-hidden="true" />
        Withheld and replaced with safe text{who ? ` — not ${who}'s words` : ''}
      </span>
    );
  }
  return <span className={styles.root}>Answered by {who || 'the agent'}</span>;
}

/** Convenience: read the attribution straight off a message. */
export function messageAttribution(message: AgentMessage): ProviderAttributionProps {
  return { provider: message.provider, model: message.usage?.model, guarded: message.guarded };
}
