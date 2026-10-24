import type { AgentSource, AgentToolCall } from '../core';

/** ★ Five sources; the answer below cites only [3] and [1], and in that order. */
export const groundedSources: AgentSource[] = [
  { id: 's1', title: 'Contoso Ltd', kind: 'dataverse', recordId: 'r1', snippet: 'Annual revenue £4.2m, 38 employees.' },
  { id: 's2', title: 'Case 4417 — invoice mismatch', kind: 'dataverse', recordId: 'r2', snippet: 'Raised 12 Mar, priority High.' },
  { id: 's3', title: 'KB-208: credit note policy', kind: 'knowledge', url: 'https://example.invalid/kb/208', snippet: 'Credit notes above £5,000 require finance approval.', score: 0.82 },
  { id: 's4', title: 'Statement-Mar.pdf', kind: 'document', snippet: 'Page 3 lists the disputed line.' },
  { id: 's5', title: 'Companies House filing', kind: 'web', url: 'https://example.invalid/ch' },
];

export const GROUNDED_ANSWER =
  'Credit notes over £5,000 need finance approval [3], and case 4417 is for £6,200 [1]. So this one needs sign-off from Dana Reed before it can be raised.';

export const groundingFacts: Record<string, unknown> = {
  accountId: 'contoso',
  openCases: 3,
  oldestCase: '4417',
  disputedAmount: 6200,
  approvalThreshold: 5000,
};

export const proposedCall: AgentToolCall = {
  id: 'c1',
  name: 'create_credit_note',
  argumentsJson: '{"accountId":"contoso","amount":6200,"currency":"GBP","reason":"Invoice mismatch, case 4417"}',
  status: 'proposed',
  requiresApproval: true,
};
