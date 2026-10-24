import type {
  AgentAvailability,
  AgentEvent,
  AgentTurn,
  AgentTurnResult,
  IAgentService,
} from '../core/protocol';
import { mockScenarios, type MockScenario, type MockScenarioName } from './scenarios';

/** Injectable so tests run at zero delay and Storybook runs at human speed. */
export type Scheduler = (ms: number) => Promise<void>;

export const realScheduler: Scheduler = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));
export const immediateScheduler: Scheduler = () => Promise.resolve();

export interface MockAgentServiceOptions {
  scenario?: MockScenarioName;
  scheduler?: Scheduler;
  /** Delay before the first token, so the typing indicator is visible and screenshottable. */
  firstTokenMs?: number;
  chunkMs?: number;
  /**
   * ★ A CONSTRUCTOR ARGUMENT, never module state.
   *
   * tsup runs with `splitting: false`, so every entry gets a self-contained bundle and any
   * module-level `let` is physically duplicated per entry — a story importing from `.` and a
   * test importing from `./services` would get two independent counters. Measured on
   * surface-kit: three copies of the same function body across its entries.
   */
  seed?: number;
  /** Override availability; otherwise derived from the scenario. */
  availability?: AgentAvailability;
}

/** A tiny deterministic PRNG so Chromatic snapshots do not drift. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The in-package fake. It is the only "provider" agent-kit ships: real transports (Foundry,
 * Copilot Studio, a broker) live in the consuming app, so the kit never holds a credential.
 *
 * ★ It can reach EVERY `AgentRunStatus`. A test asserts that, because a mock that cannot
 *   produce a state is a state nothing downstream is ever tested against.
 */
export class MockAgentService implements IAgentService {
  readonly name = 'mock';

  private readonly scenario: MockScenario;
  private readonly scenarioName: MockScenarioName;
  private readonly scheduler: Scheduler;
  private readonly firstTokenMs: number;
  private readonly chunkMs: number;
  private readonly rand: () => number;
  private readonly availabilityOverride?: AgentAvailability;

  constructor(options: MockAgentServiceOptions = {}) {
    this.scenarioName = options.scenario ?? 'happy';
    this.scenario = mockScenarios[this.scenarioName];
    this.scheduler = options.scheduler ?? realScheduler;
    this.firstTokenMs = options.firstTokenMs ?? 400;
    this.chunkMs = options.chunkMs ?? 28;
    this.rand = mulberry32(options.seed ?? 1);
    this.availabilityOverride = options.availability;
  }

  async isAvailable(): Promise<AgentAvailability> {
    if (this.availabilityOverride) return this.availabilityOverride;
    if (this.scenario.unavailable) {
      return {
        available: false,
        status: 'notProvisioned',
        reason: this.scenario.failureMessage ?? 'Not provisioned.',
      };
    }
    return {
      available: true,
      capabilities: { streaming: true, tools: true, citations: true, attachments: true, cancel: true },
    };
  }

  /**
   * A prompt can select a scenario (`/blocked`, `/tool`, `/error`), so one story can walk
   * every state without remounting.
   */
  private resolveScenario(promptText: string): { name: MockScenarioName; scenario: MockScenario } {
    const slash = promptText.trim().match(/^\/(\w+)/)?.[1] as MockScenarioName | undefined;
    if (slash && slash in mockScenarios) {
      return { name: slash, scenario: mockScenarios[slash] };
    }
    return { name: this.scenarioName, scenario: this.scenario };
  }

  async *send(turn: AgentTurn): AsyncIterable<AgentEvent> {
    const { scenario } = this.resolveScenario(turn.text);
    const messageId = `mock-${Math.floor(this.rand() * 1e9).toString(36)}`;
    const turnId = `turn-${messageId}`;
    const provider = this.name;

    const finish = (result: Omit<AgentTurnResult, 'provider'>): AgentEvent => ({
      type: 'turn_end',
      turnId,
      messageId,
      result: { ...result, provider },
    });

    yield { type: 'turn_start', turnId, messageId, provider, model: 'mock-1' };

    if (turn.cancelSignal?.aborted) {
      yield finish({ status: 'cancelled', text: '', failure: { status: 'cancelled', message: 'Stopped.' } });
      return;
    }

    // Terminal-before-any-text scenarios still emit a well-formed turn.
    if (scenario.status === 'notProvisioned' || (scenario.status === 'error' && !scenario.text)) {
      await this.scheduler(this.firstTokenMs);
      yield finish({
        status: scenario.status,
        text: '',
        failure: {
          status: scenario.status,
          message: scenario.failureMessage ?? 'Failed.',
          code: scenario.failureCode,
          recoverable: scenario.recoverable,
          retryAfterMs: scenario.retryAfterMs,
        },
      });
      return;
    }

    if (scenario.sources) {
      yield { type: 'status', messageId, label: 'Searching Dataverse…' };
      await this.scheduler(this.firstTokenMs);
      yield { type: 'sources', messageId, sources: scenario.sources };
    }

    if (scenario.thinking) {
      yield { type: 'thinking_delta', messageId, text: scenario.thinking };
    }

    if (scenario.toolCall) {
      yield { type: 'tool_call', messageId, call: scenario.toolCall };
      if (scenario.autoToolResult !== undefined) {
        await this.scheduler(this.chunkMs);
        yield {
          type: 'tool_result',
          messageId,
          callId: scenario.toolCall.id,
          status: 'succeeded',
          resultText: scenario.autoToolResult,
        };
      }
    }

    const chunks = scenario.chunks ?? scenario.text.split(/(?<=\s)/);
    await this.scheduler(this.firstTokenMs);

    let emitted = '';
    for (const [i, chunk] of chunks.entries()) {
      if (turn.cancelSignal?.aborted) {
        yield finish({
          status: 'cancelled',
          text: emitted,
          failure: { status: 'cancelled', message: 'Stopped.' },
        });
        return;
      }
      if (scenario.throwsMidStream && i === Math.floor(chunks.length / 2)) {
        // The failure channel an AsyncIterable has and a Promise does not. A consumer must
        // surface this as a notice, not by unmounting the tree.
        throw new Error('mock transport exploded mid-stream');
      }
      emitted += chunk;
      yield { type: 'text_delta', messageId, text: chunk };
      await this.scheduler(this.chunkMs);
    }

    if (scenario.suggestions) {
      yield { type: 'suggestions', messageId, prompts: scenario.suggestions };
    }

    const failed = scenario.status !== 'succeeded';
    yield finish({
      status: scenario.status,
      text: emitted,
      guarded: scenario.guarded,
      usage: {
        inputTokens: 128,
        outputTokens: chunks.length,
        costUsd: Number((chunks.length * 0.000002).toFixed(6)),
        durationMs: this.firstTokenMs + chunks.length * this.chunkMs,
        model: 'mock-1',
      },
      failure: failed
        ? {
            status: scenario.status as Exclude<typeof scenario.status, 'succeeded'>,
            message: scenario.failureMessage ?? 'Failed.',
            code: scenario.failureCode,
            recoverable: scenario.recoverable,
            retryAfterMs: scenario.retryAfterMs,
          }
        : undefined,
    });
  }
}
