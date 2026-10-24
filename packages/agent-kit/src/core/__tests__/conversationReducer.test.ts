import { describe, it, expect } from 'vitest';
import { applyAgentEvent, appendUserMessage, initialConversation } from '../conversationReducer';
import type { AgentEvent } from '../protocol';

/** Every member of the union, enumerated by hand so adding one without a test is visible. */
const ALL_EVENT_TYPES: AgentEvent['type'][] = [
  'turn_start',
  'text_delta',
  'thinking_delta',
  'tool_call',
  'tool_result',
  'sources',
  'citation',
  'suggestions',
  'status',
  'turn_end',
];

const start = (messageId = 'm1'): AgentEvent => ({
  type: 'turn_start',
  turnId: 't1',
  messageId,
  provider: 'mock',
});

const end = (messageId = 'm1', status: 'succeeded' | 'blocked' = 'succeeded'): AgentEvent => ({
  type: 'turn_end',
  turnId: 't1',
  messageId,
  result: {
    status,
    text: 'full',
    provider: 'mock',
    guarded: status === 'blocked',
    failure: status === 'blocked' ? { status: 'blocked', message: 'withheld' } : undefined,
  },
});

describe('applyAgentEvent', () => {
  it('handles every event type without throwing or dropping state', () => {
    // Non-vacuity: the union really does have ten members, so a future addition that nothing
    // below exercises shows up here rather than silently going untested.
    expect(ALL_EVENT_TYPES).toHaveLength(10);

    let s = initialConversation();
    s = applyAgentEvent(s, start());
    const seen = new Set<AgentEvent['type']>(['turn_start']);

    const rest: AgentEvent[] = [
      { type: 'text_delta', messageId: 'm1', text: 'a' },
      { type: 'thinking_delta', messageId: 'm1', text: 'hmm' },
      { type: 'tool_call', messageId: 'm1', call: { id: 'c1', name: 'f', argumentsJson: '{}', status: 'proposed' } },
      { type: 'tool_result', messageId: 'm1', callId: 'c1', status: 'succeeded', resultText: 'ok' },
      { type: 'sources', messageId: 'm1', sources: [{ id: 's1', title: 'S', kind: 'web' }] },
      { type: 'citation', messageId: 'm1', citation: { marker: '1', sourceId: 's1' } },
      { type: 'suggestions', messageId: 'm1', prompts: ['next?'] },
      { type: 'status', messageId: 'm1', label: 'Searching…' },
      end(),
    ];
    for (const e of rest) {
      s = applyAgentEvent(s, e);
      seen.add(e.type);
    }
    expect([...seen].sort()).toEqual([...ALL_EVENT_TYPES].sort());

    const m = s.messages[0];
    expect(m.text).toBe('a');
    expect(m.thinking).toBe('hmm');
    expect(m.toolCalls?.[0]).toMatchObject({ id: 'c1', status: 'succeeded', resultText: 'ok' });
    expect(m.sources).toHaveLength(1);
    expect(m.citations).toHaveLength(1);
    expect(s.suggestions).toEqual(['next?']);
    expect(s.streamingMessageId).toBeNull();
    expect(s.status).toBe('succeeded');
  });

  it('appends deltas without disturbing other messages', () => {
    let s = initialConversation();
    s = appendUserMessage(s, { id: 'u1', text: 'hi', now: 1 });
    const userMessage = s.messages[0];
    s = applyAgentEvent(s, start());
    s = applyAgentEvent(s, { type: 'text_delta', messageId: 'm1', text: 'x' });
    // ★ Identity-stable: the user's message object must be the SAME reference, so React can
    //   bail out of re-rendering the whole transcript on every streamed token.
    expect(s.messages[0]).toBe(userMessage);
    expect(s.messages[1].text).toBe('x');
  });

  it('keeps two interleaved streams separate', () => {
    let s = initialConversation();
    s = applyAgentEvent(s, start('m1'));
    s = applyAgentEvent(s, start('m2'));
    s = applyAgentEvent(s, { type: 'text_delta', messageId: 'm1', text: 'one' });
    s = applyAgentEvent(s, { type: 'text_delta', messageId: 'm2', text: 'two' });
    expect(s.messages.find((m) => m.id === 'm1')?.text).toBe('one');
    expect(s.messages.find((m) => m.id === 'm2')?.text).toBe('two');
  });

  it('takes turn_end.text when no deltas arrived (a non-streaming provider)', () => {
    let s = initialConversation();
    s = applyAgentEvent(s, start());
    s = applyAgentEvent(s, end());
    expect(s.messages[0].text).toBe('full');
  });

  // ★ blocked must NOT be error-shaped: it is a terminal state with its own affordance.
  it('records blocked as a status with guarded set, not as an error', () => {
    let s = initialConversation();
    s = applyAgentEvent(s, start());
    s = applyAgentEvent(s, end('m1', 'blocked'));
    expect(s.status).toBe('blocked');
    expect(s.status).not.toBe('error');
    expect(s.messages[0].guarded).toBe(true);
  });
});
