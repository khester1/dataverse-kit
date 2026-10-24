import type { AgentFailure, AgentRunStatus } from './protocol';

/** Terminal statuses. `succeeded` included — this answers "is the turn over?", not "did it work?". */
const TERMINAL: ReadonlySet<AgentRunStatus> = new Set<AgentRunStatus>([
  'succeeded',
  'blocked',
  'refused',
  'error',
  'notProvisioned',
  'cancelled',
]);

export function isTerminalStatus(status: AgentRunStatus): boolean {
  return TERMINAL.has(status);
}

/** How a status should READ, not what colour it is — the UI maps this to tokens. */
export function runStatusSeverity(
  status: AgentRunStatus,
): 'success' | 'warning' | 'error' | 'info' {
  switch (status) {
    case 'succeeded':
      return 'success';
    case 'blocked':
    case 'refused':
      return 'warning';
    case 'error':
      return 'error';
    case 'notProvisioned':
    case 'cancelled':
      return 'info';
  }
}

/**
 * Classify a transport failure into the six-state ladder.
 *
 * ★★ 503 maps to `notProvisioned`, NOT `error`. Adopted from the ai-103 broker, which
 *    records the reason: with on-demand Azure most services are absent most of the time,
 *    and that is a normal state — reporting it as a failure is what would make the app look
 *    broken. Without this branch, "nobody has turned this on yet" and "it is broken" are
 *    indistinguishable on screen, and they need completely different fixes.
 */
export function classifyTransportFailure(input: {
  httpStatus?: number;
  code?: string;
  message?: string;
  retryAfterMs?: number;
}): AgentFailure {
  const { httpStatus, code, retryAfterMs } = input;
  const message = input.message ?? 'The agent could not be reached.';

  if (httpStatus === 503) {
    return {
      status: 'notProvisioned',
      message,
      code: code ?? 'not_provisioned',
      recoverable: false,
      correlationId: undefined,
    };
  }
  if (httpStatus === 429) {
    return { status: 'error', message, code: code ?? 'rate_limited', recoverable: true, retryAfterMs };
  }
  if (code === 'content_filter') {
    return { status: 'blocked', message, code, recoverable: false };
  }
  return { status: 'error', message, code, recoverable: httpStatus !== undefined && httpStatus >= 500 };
}
