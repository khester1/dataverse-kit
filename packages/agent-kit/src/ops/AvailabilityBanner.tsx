import * as React from 'react';
import { MessageBar, MessageBarBody, MessageBarTitle, MessageBarActions, Button } from '@fluentui/react-components';
import type { AgentAvailability } from '../core';

export interface AvailabilityBannerProps {
  availability?: AgentAvailability;
  onRetry?: () => void;
  /** Rendered beside Retry — a link to the setup doc, a "Configure" button. */
  actions?: React.ReactNode;
}

/**
 * Whether the agent can answer here, and if not, why.
 *
 * ★★ `notProvisioned` renders as INFORMATION, not an error. Nobody having configured the service
 *    yet is a normal state in an on-demand Azure estate; dressing it as a failure is what makes a
 *    working app look broken, and it needs a completely different response from an outage.
 *
 * ★ `reason` is displayed rather than summarised. "Not licensed" and "not on this host" need
 *   different fixes, and the seam keeps them distinct precisely so the UI can say which.
 */
export function AvailabilityBanner({
  availability,
  onRetry,
  actions,
}: AvailabilityBannerProps): React.ReactElement | null {
  if (!availability || availability.available) return null;

  const notProvisioned = availability.status === 'notProvisioned';
  return (
    <MessageBar intent={notProvisioned ? 'info' : 'warning'}>
      <MessageBarBody>
        <MessageBarTitle>
          {notProvisioned ? 'No agent configured' : 'The agent is unavailable'}
        </MessageBarTitle>
        {availability.reason ?? 'No reason was reported.'}
      </MessageBarBody>
      {onRetry || actions ? (
        <MessageBarActions>
          {actions}
          {onRetry ? (
            <Button size="small" onClick={onRetry}>
              Check again
            </Button>
          ) : null}
        </MessageBarActions>
      ) : null}
    </MessageBar>
  );
}
