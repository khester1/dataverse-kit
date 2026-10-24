import { describe, it, expect } from 'vitest';
import { deriveAnnouncement, ANNOUNCE_FULL_TEXT_MAX_CHARS } from '../announce';
import { applyAgentEvent, initialConversation } from '../conversationReducer';
import type { AgentEvent, ConversationState } from '..';

/**
 * ★★ THE ANNOUNCEMENT RULE, TESTED AT ITS ACTUAL SITE.
 *
 *    The integration gate next door (conversation/__tests__/liveRegion) asserts that a
 *    200-delta answer produces ONE announcement in the DOM — and it CANNOT see a defect here.
 *    Measured: removing the transition guard below makes this function announce the growing
 *    text on every delta, and the integration test still passes, because `LiveAnnouncer`'s
 *    clear-then-set uses a `setTimeout(0)` whose cleanup cancels the pending write — so rapid
 *    successive values coalesce and only the last one ever lands.
 *
 *    That is `verification-lessons.md` §3 exactly: "A RULE SPREAD OVER N SITES CANNOT BE TESTED
 *    AT ANY OF THEM." The announcer's debounce and this guard are two independent
 *    implementations of "do not announce per token", and the end-to-end gate is satisfied by
 *    either. So the rule is pinned HERE, where the sabotage is visible.
 */

const start = (): AgentEvent => ({ type: 'turn_start', turnId: 't', messageId: 'm', provider: 'mock' });
const end = (over: Partial<Parameters<typeof applyAgentEvent>[1]> = {}): AgentEvent =>
  ({
    type: 'turn_end',
    turnId: 't',
    messageId: 'm',
    result: { status: 'succeeded', text: 'done', provider: 'mock' },
    ...over,
  }) as AgentEvent;

function stream(deltas: number): { states: ConversationState[] } {
  const states: ConversationState[] = [initialConversation()];
  states.push(applyAgentEvent(states[0], start()));
  for (let i = 0; i < deltas; i++) {
    states.push(applyAgentEvent(states[states.length - 1], { type: 'text_delta', messageId: 'm', text: `w${i} ` }));
  }
  return { states };
}

describe('deriveAnnouncement', () => {
  it('says NOTHING during streaming, however many deltas arrive', () => {
    const { states } = stream(50);
    const announced = states
      .slice(1)
      .map((s, i) => deriveAnnouncement(s, states[i]))
      .filter((a) => a.polite || a.assertive);

    // Non-vacuity: the stream really did run.
    expect(states).toHaveLength(52);
    expect(announced).toEqual([]);
  });

  it('announces exactly once, at the transition to a terminal state', () => {
    const { states } = stream(3);
    const streaming = states[states.length - 1];
    const settled = applyAgentEvent(streaming, end());

    // ★ The STREAMED text, not `result.text`. The reducer keeps what actually arrived —
    //   `turn_end.text` is the fallback for a provider that sends no deltas at all. Asserting
    //   'done' here was my error, and the test caught it.
    expect(deriveAnnouncement(settled, streaming).polite).toBe('w0 w1 w2 ');
    // Already terminal -> nothing more to say, so a re-render cannot re-announce.
    expect(deriveAnnouncement(settled, settled)).toEqual({ polite: '', assertive: '' });
  });

  it('summarises past the length threshold instead of reading the whole answer', () => {
    const long = 'word '.repeat(80).trim();
    expect(long.length).toBeGreaterThan(ANNOUNCE_FULL_TEXT_MAX_CHARS);
    const streaming = applyAgentEvent(initialConversation(), start());
    const settled = applyAgentEvent(streaming, end({ result: { status: 'succeeded', text: long, provider: 'mock' } } as never));
    const a = deriveAnnouncement(settled, streaming);
    expect(a.polite).toBe('Response complete, 80 words.');
    expect(a.polite.length).toBeLessThan(40);
  });

  it('routes a failure to the ASSERTIVE channel and says nothing politely', () => {
    const streaming = applyAgentEvent(initialConversation(), start());
    const failed = applyAgentEvent(streaming, end({
      result: {
        status: 'error', text: '', provider: 'mock',
        failure: { status: 'error', message: 'Rate limited.' },
      },
    } as never));
    const a = deriveAnnouncement(failed, streaming);
    expect(a.assertive).toBe('Rate limited.');
    expect(a.polite).toBe('');
  });

  it('flags a withheld answer in the announcement itself', () => {
    const streaming = applyAgentEvent(initialConversation(), start());
    const guarded = applyAgentEvent(streaming, end({
      result: { status: 'blocked', text: 'Safe text.', provider: 'mock', guarded: true },
    } as never));
    // A screen-reader user must not be told a substituted response as if it were the answer.
    expect(deriveAnnouncement(guarded, streaming).polite).toMatch(/withheld/i);
  });
});
