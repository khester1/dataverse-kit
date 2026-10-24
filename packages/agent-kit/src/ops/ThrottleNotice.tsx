import * as React from 'react';
import { MessageBar, MessageBarBody, MessageBarTitle, MessageBarActions, Button } from '@fluentui/react-components';
import type { AgentFailure } from '../core';

export interface ThrottleNoticeProps {
  failure?: AgentFailure;
  onRetry?: () => void;
  /** Injected so the countdown is testable without fake timers. */
  now?: () => number;
}

/**
 * A rate-limit notice that counts down.
 *
 * ★ It renders only for a failure that is BOTH retriable and carries `retryAfterMs`. A countdown
 *   over an unknown wait would be invented, and a retry button that fires into an active throttle
 *   just burns the next window.
 */
export function ThrottleNotice({ failure, onRetry, now = Date.now }: ThrottleNoticeProps): React.ReactElement | null {
  const retryAfterMs = failure?.retryAfterMs;
  const eligible = Boolean(failure?.recoverable && retryAfterMs && retryAfterMs > 0);

  const [remaining, setRemaining] = React.useState(retryAfterMs ?? 0);

  React.useEffect(() => {
    if (!eligible) return;
    const deadline = now() + (retryAfterMs ?? 0);
    setRemaining(retryAfterMs ?? 0);
    const id = setInterval(() => {
      const left = deadline - now();
      setRemaining(left > 0 ? left : 0);
      if (left <= 0) clearInterval(id);
    }, 250);
    return () => clearInterval(id);
  }, [eligible, retryAfterMs, now]);

  if (!eligible || !failure) return null;

  const seconds = Math.ceil(remaining / 1000);
  const ready = remaining <= 0;

  return (
    <MessageBar intent="warning">
      <MessageBarBody>
        <MessageBarTitle>Rate limited</MessageBarTitle>
        {ready ? 'You can try again now.' : `${failure.message} Try again in ${seconds}s.`}
      </MessageBarBody>
      {onRetry ? (
        <MessageBarActions>
          <Button size="small" onClick={onRetry} disabled={!ready}>
            Try again
          </Button>
        </MessageBarActions>
      ) : null}
    </MessageBar>
  );
}
