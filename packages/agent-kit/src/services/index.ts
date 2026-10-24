// @dataverse-kit/agent-kit/services — the seam and the fake.
//
// Framework-agnostic (no react, no @fluentui), so a transport adapter can implement
// IAgentService in a Node broker or an Azure Function and share these types with the browser.
//
// ★ The kit ships NO real transport. Foundry, Copilot Studio / Direct Line and broker
//   adapters belong in the consuming app, because they are where credentials live and the
//   kit must never hold one.
export type {
  AgentAttachment,
  AgentAvailability,
  AgentCapabilities,
  AgentCitation,
  AgentEvent,
  AgentFailure,
  AgentMessage,
  AgentParticipant,
  AgentProviderName,
  AgentRole,
  AgentRunStatus,
  AgentServiceConfig,
  AgentSource,
  AgentToolCall,
  AgentTurn,
  AgentTurnResult,
  AgentUsage,
  IAgentService,
  ToolCallStatus,
} from '../core/protocol';

export { MockAgentService, realScheduler, immediateScheduler } from './MockAgentService';
export type { MockAgentServiceOptions, Scheduler } from './MockAgentService';
export { NullAgentService } from './NullAgentService';
export { createAgentService, decide } from './createAgentService';
export { mockScenarios } from './scenarios';
export type { MockScenario, MockScenarioName } from './scenarios';
