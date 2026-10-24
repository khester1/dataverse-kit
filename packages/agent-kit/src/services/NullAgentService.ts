import type { AgentAvailability, AgentEvent, AgentTurn, IAgentService } from '../core/protocol';

/**
 * The default provider: answers nothing, politely.
 *
 * ★ `none` is the DEFAULT and must stay so. A kit dropped into a host nobody has wired must
 *   not silently start talking to a service because someone shipped a new build. Carried
 *   from `ILlmService`, where the same rule is load-bearing in a regulated process.
 *
 * ★ It still yields a well-formed turn — `turn_start` then one `turn_end` — rather than
 *   throwing or yielding nothing. An unconfigured kit should render "not configured", not
 *   a spinner that never resolves.
 */
export class NullAgentService implements IAgentService {
  readonly name = 'none';

  async isAvailable(): Promise<AgentAvailability> {
    return {
      available: false,
      status: 'notProvisioned',
      reason: 'No agent provider is configured for this host.',
    };
  }

  async *send(turn: AgentTurn): AsyncIterable<AgentEvent> {
    const messageId = `null-${Date.now()}`;
    const turnId = `turn-${messageId}`;
    void turn;
    yield { type: 'turn_start', turnId, messageId, provider: this.name };
    yield {
      type: 'turn_end',
      turnId,
      messageId,
      result: {
        status: 'notProvisioned',
        text: '',
        provider: this.name,
        failure: {
          status: 'notProvisioned',
          message: 'No agent provider is configured for this host.',
          code: 'not_provisioned',
          recoverable: false,
        },
      },
    };
  }
}
