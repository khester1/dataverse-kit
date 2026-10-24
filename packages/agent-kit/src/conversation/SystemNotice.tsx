import * as React from 'react';
import {
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  MessageBarActions,
  Button,
} from '@fluentui/react-components';
import type { AgentFailure } from '../core';
import { runStatusSeverity } from '../core';

export interface SystemNoticeProps {
  failure?: AgentFailure;
  guarded?: boolean;
  onRetry?: () => void;
}

const INTENT = { success: 'success', warning: 'warning', error: 'error', info: 'info' } as const;

/**
 * A terminal state the user needs to see.
 *
 * ★ `blocked` / `refused` / `notProvisioned` render as WARNING or INFO, not error — they are
 *   different outcomes needing different fixes, and flattening them into "something went
 *   wrong" is what makes an unprovisioned environment look broken.
 * ★ The state is in the TEXT, never only in the colour (WCAG 1.4.1).
 */
export function SystemNotice({ failure, guarded, onRetry }: SystemNoticeProps): React.ReactElement | null {
  if (!failure && !guarded) return null;

  if (!failure && guarded) {
    return (
      <MessageBar intent="warning">
        <MessageBarBody>
          <MessageBarTitle>Response withheld</MessageBarTitle>
          The provider substituted safe text for the generated answer.
        </MessageBarBody>
      </MessageBar>
    );
  }
  if (!failure) return null;

  const title: Record<string, string> = {
    blocked: 'Response withheld',
    refused: 'The agent declined',
    error: 'Something went wrong',
    notProvisioned: 'Not configured',
    cancelled: 'Stopped',
  };

  return (
    <MessageBar intent={INTENT[runStatusSeverity(failure.status)]}>
      <MessageBarBody>
        <MessageBarTitle>{title[failure.status] ?? 'Notice'}</MessageBarTitle>
        {failure.message}
      </MessageBarBody>
      {failure.recoverable && onRetry ? (
        <MessageBarActions>
          <Button size="small" onClick={onRetry}>
            Try again
          </Button>
        </MessageBarActions>
      ) : null}
    </MessageBar>
  );
}
