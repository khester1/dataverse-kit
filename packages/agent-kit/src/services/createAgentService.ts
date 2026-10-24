import type { AgentServiceConfig, IAgentService } from '../core/protocol';
import { MockAgentService } from './MockAgentService';
import { NullAgentService } from './NullAgentService';

export interface ServiceDecision {
  provider: IAgentService;
  /** Why this one was chosen — surfaced in diagnostics so a misconfiguration is legible. */
  reason: string;
}

/**
 * Provider selection, as ONE ladder.
 *
 * ★ `decide()` is exported alongside `createAgentService()` and they share a return type, so
 *   the factory and any diagnostics view cannot drift — the shape `ServiceFactory.decide()`
 *   uses in `@dataverse-kit/api-service` for exactly the same reason.
 *
 * ★ An UNRECOGNISED provider name falls back to `none`, never to a working provider. Carried
 *   from `createLlmService`: a typo must produce silence, not an unintended call to a model.
 */
export function decide(config: AgentServiceConfig): ServiceDecision {
  switch (config.provider) {
    case 'custom':
      return config.factory
        ? { provider: config.factory(), reason: 'explicit factory (provider: custom)' }
        : { provider: new NullAgentService(), reason: 'provider: custom but no factory supplied' };
    case 'mock':
      return { provider: new MockAgentService(), reason: 'provider: mock' };
    case 'none':
      return { provider: new NullAgentService(), reason: 'provider: none (the default)' };
    default:
      return {
        provider: new NullAgentService(),
        reason: `unrecognised provider ${String(config.provider)} — falling back to none`,
      };
  }
}

export function createAgentService(
  config: AgentServiceConfig = { provider: 'none' },
): IAgentService {
  return decide(config).provider;
}
