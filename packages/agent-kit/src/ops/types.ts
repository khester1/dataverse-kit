import type { AgentRunStatus, AgentUsage } from '../core';

/** An agent a host can offer. Names WHICH agent answers — never a credential. */
export interface AgentDescriptor {
  id: string;
  name: string;
  model?: string;
  version?: string;
  description?: string;
  /** Last known health. `undefined` means "not probed", which is not the same as healthy. */
  status?: AgentRunStatus;
}

/** One completed turn, for the run history. */
export interface AgentRunRecord {
  id: string;
  status: AgentRunStatus;
  startedAt: number;
  prompt?: string;
  usage?: AgentUsage;
  correlationId?: string;
  model?: string;
}
