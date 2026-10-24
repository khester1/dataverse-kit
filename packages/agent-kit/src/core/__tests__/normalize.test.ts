import { describe, it, expect } from 'vitest';
import {
  fromSseLine,
  fromOpenAiChatChunk,
  fromClaudeStreamEvent,
  fromFoundryChatResult,
} from '../normalize';

const ctx = { messageId: 'm1', turnId: 't1' };

describe('fromSseLine', () => {
  it('distinguishes nothing-to-do from stream-over', () => {
    // Different meanings; collapsing them to null loses the terminator.
    expect(fromSseLine('')).toBeUndefined();
    expect(fromSseLine(': keep-alive')).toBeUndefined();
    expect(fromSseLine('data: [DONE]')).toBe('[DONE]');
    expect(fromSseLine('data: {"a":1}')).toEqual({ a: 1 });
  });

  it('survives a malformed payload without throwing', () => {
    expect(fromSseLine('data: {not json')).toBeUndefined();
  });
});

describe('fromOpenAiChatChunk', () => {
  it('emits a text delta AND a tool call from ONE chunk', () => {
    // ★ The reason every normalizer returns an array. A one-in-one-out signature would
    //   silently drop one of these two.
    const events = fromOpenAiChatChunk(
      {
        choices: [
          {
            delta: {
              content: 'hi',
              tool_calls: [{ id: 'c1', function: { name: 'f', arguments: '{}' } }],
            },
          },
        ],
      },
      ctx,
    );
    expect(events).toHaveLength(2);
    expect(events.map((e) => e.type)).toEqual(['text_delta', 'tool_call']);
  });

  it('returns an empty array for a chunk with no delta', () => {
    expect(fromOpenAiChatChunk({ choices: [{}] }, ctx)).toEqual([]);
    expect(fromOpenAiChatChunk(undefined, ctx)).toEqual([]);
  });
});

describe('fromClaudeStreamEvent', () => {
  it('maps done to a single turn_end carrying usage', () => {
    const [event, ...rest] = fromClaudeStreamEvent(
      { type: 'done', fullText: 'all of it', costUsd: 0.01, inputTokens: 10, outputTokens: 20, cacheReadTokens: 5 },
      ctx,
    );
    expect(rest).toHaveLength(0);
    expect(event.type).toBe('turn_end');
    if (event.type !== 'turn_end') throw new Error('unreachable');
    expect(event.result.text).toBe('all of it');
    // costUsd and cachedTokens exist BECAUSE the kit ships a usage meter that reads them.
    expect(event.result.usage).toMatchObject({ costUsd: 0.01, cachedTokens: 5 });
  });

  it('maps error to turn_end, not to a thrown exception', () => {
    const [event] = fromClaudeStreamEvent({ type: 'error', message: 'boom', recoverable: true }, ctx);
    if (event.type !== 'turn_end') throw new Error('unreachable');
    expect(event.result.status).toBe('error');
    expect(event.result.failure?.recoverable).toBe(true);
  });
});

describe('fromFoundryChatResult', () => {
  // ★ Two events, no faked deltas — what AgentTurnResult.text exists for.
  it('turns a non-streaming reply into exactly turn_start + turn_end', () => {
    const events = fromFoundryChatResult({ text: 'answer', promptTokens: 3, completionTokens: 4, model: 'gpt-4.1' }, ctx);
    expect(events.map((e) => e.type)).toEqual(['turn_start', 'turn_end']);
    const last = events[1];
    if (last.type !== 'turn_end') throw new Error('unreachable');
    expect(last.result.text).toBe('answer');
  });
});
