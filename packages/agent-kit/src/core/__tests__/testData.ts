import type { AgentMessage } from '../protocol';

/** 2026-03-12T14:00:00Z — a fixed instant, so nothing depends on the system clock. */
export const T0 = Date.UTC(2026, 2, 12, 14, 0, 0);
export const MIN = 60_000;

export function msg(over: Partial<AgentMessage> & Pick<AgentMessage, 'id'>): AgentMessage {
  return {
    role: 'user',
    authorId: 'u1',
    text: 'hello',
    createdAt: T0,
    ...over,
  };
}
