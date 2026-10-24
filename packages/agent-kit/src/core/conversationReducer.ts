import type {
  AgentAttachment,
  AgentEvent,
  AgentFailure,
  AgentMessage,
  AgentRunStatus,
  AgentUsage,
} from './protocol';

/** One field, not a `{loading, error}` pair that can disagree with itself. */
export type ConversationStatus = 'idle' | 'connecting' | 'streaming' | AgentRunStatus;

export interface ConversationState {
  messages: AgentMessage[];
  streamingMessageId: string | null;
  status: ConversationStatus;
  /** Ephemeral chrome from a `status` event ("Searching Dataverse…"). Not message content. */
  statusLabel?: string;
  failure?: AgentFailure;
  usage?: AgentUsage;
  suggestions?: string[];
}

export function initialConversation(seed: readonly AgentMessage[] = []): ConversationState {
  return { messages: [...seed], streamingMessageId: null, status: 'idle' };
}

/** Replace exactly one message, leaving every other array slot identity-stable so React can
 *  bail out of re-rendering the rest of the transcript during a stream. */
function patch(
  state: ConversationState,
  messageId: string,
  update: (m: AgentMessage) => AgentMessage,
): AgentMessage[] {
  const i = state.messages.findIndex((m) => m.id === messageId);
  if (i === -1) return state.messages;
  const next = state.messages.slice();
  next[i] = update(next[i]);
  return next;
}

export function appendUserMessage(
  state: ConversationState,
  input: { id: string; text: string; authorId?: string; attachments?: AgentAttachment[]; now?: number },
): ConversationState {
  const message: AgentMessage = {
    id: input.id,
    role: 'user',
    authorId: input.authorId ?? 'user',
    text: input.text,
    createdAt: input.now ?? Date.now(),
    attachments: input.attachments,
  };
  return { ...state, messages: [...state.messages, message], status: 'connecting', failure: undefined };
}

/**
 * Apply one stream event.
 *
 * ★ Written as an EXHAUSTIVE switch with no `default:`. The repo's tsconfig sets
 *   `noFallthroughCasesInSwitch` and `strict`, so adding a member to `AgentEvent` without a
 *   case here is a compile error — a gate you get for free, and one that a tidy-looking
 *   `default: return state` would silently remove. Do not add one.
 */
export function applyAgentEvent(state: ConversationState, event: AgentEvent): ConversationState {
  switch (event.type) {
    case 'turn_start': {
      const message: AgentMessage = {
        id: event.messageId,
        role: 'assistant',
        authorId: event.provider ?? 'agent',
        text: '',
        createdAt: Date.now(),
        streaming: true,
        provider: event.provider,
      };
      return {
        ...state,
        messages: [...state.messages, message],
        streamingMessageId: event.messageId,
        status: 'streaming',
        statusLabel: undefined,
        failure: undefined,
        suggestions: undefined,
      };
    }

    case 'text_delta':
      return {
        ...state,
        messages: patch(state, event.messageId, (m) => ({ ...m, text: m.text + event.text })),
      };

    case 'thinking_delta':
      return {
        ...state,
        messages: patch(state, event.messageId, (m) => ({
          ...m,
          thinking: (m.thinking ?? '') + event.text,
        })),
      };

    case 'tool_call':
      return {
        ...state,
        messages: patch(state, event.messageId, (m) => ({
          ...m,
          toolCalls: [...(m.toolCalls ?? []), event.call],
        })),
      };

    case 'tool_result':
      return {
        ...state,
        messages: patch(state, event.messageId, (m) => ({
          ...m,
          toolCalls: (m.toolCalls ?? []).map((c) =>
            c.id === event.callId
              ? { ...c, status: event.status, resultText: event.resultText, failure: event.failure }
              : c,
          ),
        })),
      };

    case 'sources':
      return {
        ...state,
        messages: patch(state, event.messageId, (m) => ({ ...m, sources: event.sources })),
      };

    case 'citation':
      return {
        ...state,
        messages: patch(state, event.messageId, (m) => ({
          ...m,
          citations: [...(m.citations ?? []), event.citation],
        })),
      };

    case 'suggestions':
      return { ...state, suggestions: event.prompts };

    case 'status':
      return { ...state, statusLabel: event.label };

    case 'turn_end': {
      const { result } = event;
      return {
        ...state,
        messages: patch(state, event.messageId, (m) => ({
          ...m,
          // A non-streaming provider sends no deltas, so the assembled text arrives here.
          text: m.text.length > 0 ? m.text : result.text,
          streaming: false,
          guarded: result.guarded,
          provider: result.provider,
          usage: result.usage,
          failure: result.failure,
        })),
        streamingMessageId: null,
        status: result.status,
        statusLabel: undefined,
        failure: result.failure,
        usage: result.usage,
      };
    }
  }
}
