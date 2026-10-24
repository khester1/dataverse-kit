import type { AgentMessage, AgentParticipant } from '../core';

/** ★ DATA ONLY — this directory holds no .tsx. Storybook 10's `safeSortObject` recurses through
 *  React element internals and overflows the stack, so nested JSX must never reach `args`. */

export const T0 = Date.UTC(2026, 2, 12, 9, 14, 0);
const DAY = 86_400_000;

export const participants: AgentParticipant[] = [
  { id: 'u1', displayName: 'Kyle Hester', kind: 'user', initials: 'KH' },
  { id: 'agent', displayName: 'Case Assistant', kind: 'agent', initials: 'CA' },
];

/** A frozen thread: two days, a grouped run, and a settled answer. Chromatic snapshots this. */
export const thread: AgentMessage[] = [
  { id: 'm1', role: 'user', authorId: 'u1', text: 'Morning — anything outstanding on Contoso?', createdAt: T0 - DAY },
  { id: 'm2', role: 'assistant', authorId: 'agent', provider: 'foundry', text: 'Three open cases. The oldest is 4417, waiting eleven days for a credit note.', createdAt: T0 - DAY + 4000 },
  { id: 'm3', role: 'user', authorId: 'u1', text: 'Who owns it?', createdAt: T0 },
  { id: 'm4', role: 'user', authorId: 'u1', text: 'And what is it blocked on?', createdAt: T0 + 30_000 },
  { id: 'm5', role: 'user', authorId: 'u1', text: 'Sorry — one more. Is it over the approval threshold?', createdAt: T0 + 65_000 },
  {
    id: 'm6',
    role: 'assistant',
    authorId: 'agent',
    provider: 'foundry',
    text: 'It is owned by Dana Reed and blocked on finance approval — £6,200 is over the £5,000 threshold.',
    createdAt: T0 + 90_000,
    usage: { inputTokens: 412, outputTokens: 28, costUsd: 0.000912, durationMs: 1840, model: 'gpt-4.1' },
  },
];

export const starterPrompts = [
  'Summarise this account',
  'What is blocked?',
  'Draft a follow-up email',
];
