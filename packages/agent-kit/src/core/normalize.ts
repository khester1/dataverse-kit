import type { AgentEvent, AgentToolCall } from './protocol';

/**
 * Transport normalizers: turn one provider's wire shape into `AgentEvent[]`.
 *
 * ★ Each returns an ARRAY, never a single event or null. One Azure OpenAI chunk can
 *   legitimately carry a text delta AND a tool-call fragment AND a citation annotation, so
 *   a one-in-one-out signature would silently drop two of the three.
 *
 * ★ These live in ./core (no React, no DOM) because a transport adapter frequently runs
 *   where React must not be — an Azure Function proxying SSE, a web worker, a Node broker.
 *   The same normalizer must be usable on both sides of that boundary.
 *
 * ★ Only shapes whose wire format is KNOWN are implemented. A normalizer written from an
 *   assumed shape is a fixture that measures a platform which does not exist, so
 *   `fromDirectLineActivity` is deliberately absent until an adapter exists to measure it
 *   against — see CLAUDE.md.
 */

export interface NormalizeCtx {
  messageId: string;
  turnId: string;
}

/**
 * Unwrap one SSE line. Returns `undefined` for keep-alives, comments and blank lines, and
 * the sentinel `'[DONE]'` for the terminator — callers must distinguish those, since
 * "nothing to do" and "the stream is over" are different.
 */
export function fromSseLine(line: string): unknown | '[DONE]' | undefined {
  const trimmed = line.trim();
  if (trimmed === '' || trimmed.startsWith(':')) return undefined;
  if (!trimmed.startsWith('data:')) return undefined;
  const payload = trimmed.slice('data:'.length).trim();
  if (payload === '') return undefined;
  if (payload === '[DONE]') return '[DONE]';
  try {
    return JSON.parse(payload) as unknown;
  } catch {
    return undefined;
  }
}

interface OpenAiDelta {
  content?: string | null;
  tool_calls?: { index?: number; id?: string; function?: { name?: string; arguments?: string } }[];
}
interface OpenAiChunk {
  choices?: { delta?: OpenAiDelta }[];
}

/** An OpenAI / Azure OpenAI streaming chunk. */
export function fromOpenAiChatChunk(chunk: unknown, ctx: NormalizeCtx): AgentEvent[] {
  const events: AgentEvent[] = [];
  const delta = (chunk as OpenAiChunk | undefined)?.choices?.[0]?.delta;
  if (!delta) return events;

  if (typeof delta.content === 'string' && delta.content.length > 0) {
    events.push({ type: 'text_delta', messageId: ctx.messageId, text: delta.content });
  }
  for (const call of delta.tool_calls ?? []) {
    if (!call.id) continue; // a pure arguments continuation; the caller accumulates it
    const toolCall: AgentToolCall = {
      id: call.id,
      name: call.function?.name ?? '',
      argumentsJson: call.function?.arguments ?? '',
      status: 'proposed',
    };
    events.push({ type: 'tool_call', messageId: ctx.messageId, call: toolCall });
  }
  return events;
}

/** The `@dataverse-kit/claude-bridge` event union. */
export interface ClaudeLikeStreamEvent {
  type: 'init' | 'text_delta' | 'thinking_delta' | 'done' | 'error';
  text?: string;
  fullText?: string;
  model?: string;
  sessionId?: string;
  costUsd?: number;
  durationMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  message?: string;
  recoverable?: boolean;
}

export function fromClaudeStreamEvent(
  event: ClaudeLikeStreamEvent,
  ctx: NormalizeCtx,
): AgentEvent[] {
  switch (event.type) {
    case 'init':
      return [
        {
          type: 'turn_start',
          turnId: ctx.turnId,
          messageId: ctx.messageId,
          model: event.model,
          provider: 'claude-bridge',
          sessionId: event.sessionId,
        },
      ];
    case 'text_delta':
      return event.text ? [{ type: 'text_delta', messageId: ctx.messageId, text: event.text }] : [];
    case 'thinking_delta':
      return event.text
        ? [{ type: 'thinking_delta', messageId: ctx.messageId, text: event.text }]
        : [];
    case 'done':
      return [
        {
          type: 'turn_end',
          turnId: ctx.turnId,
          messageId: ctx.messageId,
          result: {
            status: 'succeeded',
            text: event.fullText ?? '',
            provider: 'claude-bridge',
            model: event.model,
            usage: {
              inputTokens: event.inputTokens,
              outputTokens: event.outputTokens,
              cachedTokens: event.cacheReadTokens,
              costUsd: event.costUsd,
              durationMs: event.durationMs,
              model: event.model,
            },
          },
        },
      ];
    case 'error':
      return [
        {
          type: 'turn_end',
          turnId: ctx.turnId,
          messageId: ctx.messageId,
          result: {
            status: 'error',
            text: '',
            provider: 'claude-bridge',
            failure: {
              status: 'error',
              message: event.message ?? 'The agent failed.',
              recoverable: event.recoverable ?? false,
            },
          },
        },
      ];
  }
}

/** A NON-streaming Foundry reply (`certifications/ai-103/broker`'s `FoundryChatResult`). */
export interface FoundryLikeResult {
  text: string;
  promptTokens?: number;
  completionTokens?: number;
  model?: string;
}

/**
 * ★ Two events, no faked deltas. This is what `AgentTurnResult.text` exists for: a provider
 *   with no streaming at all still produces a complete message through the same reducer.
 */
export function fromFoundryChatResult(
  result: FoundryLikeResult,
  ctx: NormalizeCtx,
  provider = 'foundry',
): AgentEvent[] {
  return [
    { type: 'turn_start', turnId: ctx.turnId, messageId: ctx.messageId, model: result.model, provider },
    {
      type: 'turn_end',
      turnId: ctx.turnId,
      messageId: ctx.messageId,
      result: {
        status: 'succeeded',
        text: result.text,
        provider,
        model: result.model,
        usage: {
          inputTokens: result.promptTokens,
          outputTokens: result.completionTokens,
          model: result.model,
        },
      },
    },
  ];
}
