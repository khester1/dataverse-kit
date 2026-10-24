import type { AgentRunStatus, AgentSource, AgentToolCall } from '../core/protocol';

/**
 * What the mock can be driven to do. There is one scenario per terminal state plus the
 * interesting mid-stream shapes, because a Storybook that cannot SHOW a state is a Storybook
 * in which that state is never reviewed — and a test suite that cannot REACH one is a suite
 * in which it is never asserted.
 */
export type MockScenarioName =
  | 'happy'
  | 'grounded'
  | 'toolApproval'
  | 'toolAuto'
  | 'blocked'
  | 'refused'
  | 'error'
  | 'notProvisioned'
  | 'cancelled'
  | 'longAnswer'
  | 'throws';

export interface MockScenario {
  /** The answer, streamed word by word unless `chunks` overrides it. */
  text: string;
  chunks?: string[];
  status: AgentRunStatus;
  guarded?: boolean;
  failureMessage?: string;
  failureCode?: string;
  recoverable?: boolean;
  retryAfterMs?: number;
  sources?: AgentSource[];
  /** Emitted mid-stream, before the terminal event. */
  toolCall?: AgentToolCall;
  /** When set, the tool resolves itself rather than waiting for host approval. */
  autoToolResult?: string;
  suggestions?: string[];
  thinking?: string;
  /** Throw from inside the iterator — the failure channel a Promise-shaped seam does not have. */
  throwsMidStream?: boolean;
  /** Never becomes available; `send()` still yields a well-formed turn. */
  unavailable?: boolean;
}

const SOURCES: AgentSource[] = [
  { id: 'src-acct', title: 'Contoso Ltd', kind: 'dataverse', entityLogicalName: 'account', recordId: '11111111-1111-1111-1111-111111111111', snippet: 'Annual revenue £4.2m, 38 employees.' },
  { id: 'src-case', title: 'Case 4417 — invoice mismatch', kind: 'dataverse', entityLogicalName: 'incident', recordId: '22222222-2222-2222-2222-222222222222', snippet: 'Raised 12 Mar, priority High.' },
  { id: 'src-kb', title: 'KB-208: credit note policy', kind: 'knowledge', url: 'https://example.invalid/kb/208', snippet: 'Credit notes above £5,000 require finance approval.', score: 0.82 },
  { id: 'src-doc', title: 'Statement-Mar.pdf', kind: 'document', snippet: 'Page 3 lists the disputed line.' },
  { id: 'src-web', title: 'Companies House filing', kind: 'web', url: 'https://example.invalid/ch' },
];

export const mockScenarios: Record<MockScenarioName, MockScenario> = {
  happy: {
    text: 'Contoso has three open cases. The oldest, case 4417, has been waiting eleven days for a credit note.',
    status: 'succeeded',
    suggestions: ['Draft a credit note', 'Show all three cases', 'Who owns case 4417?'],
  },

  // ★ FIVE sources, but the text cites only [3] and [1] — and out of order. The panel must
  //   show TWO, renumbered 1 and 2 in first-appearance order. A fixture where every source
  //   is cited cannot tell a correct implementation from one that lists everything it was given.
  grounded: {
    text: 'Credit notes over £5,000 need finance approval [3], and case 4417 is for £6,200 [1]. So this one needs sign-off.',
    status: 'succeeded',
    sources: SOURCES,
  },

  toolApproval: {
    text: 'I can raise the credit note for you — approve the details below and I will submit it.',
    status: 'succeeded',
    toolCall: {
      id: 'call-1',
      name: 'create_credit_note',
      argumentsJson: '{"accountId":"11111111-1111-1111-1111-111111111111","amount":6200,"currency":"GBP","reason":"Invoice mismatch, case 4417"}',
      status: 'proposed',
      requiresApproval: true,
    },
  },

  toolAuto: {
    text: 'I checked the balance for you.',
    status: 'succeeded',
    toolCall: { id: 'call-2', name: 'get_account_balance', argumentsJson: '{"accountId":"1111"}', status: 'running' },
    autoToolResult: '{"balance":6200,"currency":"GBP"}',
  },

  // ★ blocked and refused MUST look different on screen: a content filter fired, versus the
  //   model declining. They need different fixes, so they are different states.
  blocked: {
    text: 'I can’t help with that request.',
    status: 'blocked',
    guarded: true,
    failureMessage: 'The response was withheld by the content filter.',
    failureCode: 'content_filter',
    recoverable: false,
  },

  refused: {
    text: 'I don’t have enough information to answer that safely. Could you say which account you mean?',
    status: 'refused',
    failureMessage: 'The agent declined to answer.',
    recoverable: true,
  },

  error: {
    text: '',
    status: 'error',
    failureMessage: 'The agent is rate limited. Try again shortly.',
    failureCode: 'rate_limited',
    recoverable: true,
    retryAfterMs: 4000,
  },

  notProvisioned: {
    text: '',
    status: 'notProvisioned',
    failureMessage: 'No Foundry project is configured for this environment.',
    failureCode: 'not_provisioned',
    recoverable: false,
    unavailable: true,
  },

  cancelled: {
    text: 'Let me pull the last six months of activity for Contoso and work through it case by case, starting with the oldest…',
    status: 'cancelled',
    failureMessage: 'Stopped.',
  },

  // The fixture the autoscroll and live-region gates run against: enough deltas that
  // "once, not per token" is a meaningful distinction.
  longAnswer: {
    text: Array.from({ length: 200 }, (_, i) => `word${i + 1}`).join(' '),
    status: 'succeeded',
  },

  throws: {
    text: 'partial…',
    status: 'error',
    throwsMidStream: true,
    failureMessage: 'never reached — the iterator throws instead',
  },
};
