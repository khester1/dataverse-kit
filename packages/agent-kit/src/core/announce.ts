import type { ConversationState } from './conversationReducer';

/** Past this many characters, announce a summary instead of the whole answer. */
export const ANNOUNCE_FULL_TEXT_MAX_CHARS = 240;

export interface Announcement {
  /** Read when the screen reader next pauses. Empty means "nothing new". */
  polite: string;
  /** Interrupts. Reserved for failures. */
  assertive: string;
}

export const NO_ANNOUNCEMENT: Announcement = { polite: '', assertive: '' };

const TERMINAL = new Set(['succeeded', 'blocked', 'refused', 'error', 'notProvisioned', 'cancelled']);

/**
 * What, if anything, should be announced for this state change.
 *
 * ★★ THE WHOLE POINT: this is derived from a state TRANSITION, never from a delta.
 *
 *    Both naive choices are wrong. No live region at all and a screen-reader user never
 *    hears the answer — the kit's primary output is silent. A live region on the streaming
 *    node and every token is queued for announcement; NVDA and JAWS re-read the growing
 *    string and never finish. So the transcript is NOT a live region, the streaming bubble
 *    carries `aria-busy`, the typing indicator's own `role="status"` covers "responding",
 *    and this announces exactly once per turn: the settled answer.
 *
 * ★ Deltas, `thinking` and tool calls are never announced. Thinking especially: it is
 *   explicitly the model's scratch work, and reading it aloud would bury the answer.
 *
 * ★ Failures go to the ASSERTIVE channel, because an error the user is not told about is
 *   an error they wait through.
 */
export function deriveAnnouncement(
  state: ConversationState,
  previous: ConversationState | undefined,
): Announcement {
  const wasTerminal = previous ? TERMINAL.has(previous.status) : false;
  const isTerminal = TERMINAL.has(state.status);

  // Only the moment of settling produces an announcement.
  if (!isTerminal || wasTerminal) return NO_ANNOUNCEMENT;

  if (state.failure) {
    return { polite: '', assertive: state.failure.message };
  }

  const last = state.messages[state.messages.length - 1];
  const text = last?.text ?? '';
  if (!text) return NO_ANNOUNCEMENT;

  const guarded = last?.guarded ? 'The response was withheld. ' : '';
  if (text.length <= ANNOUNCE_FULL_TEXT_MAX_CHARS) {
    return { polite: `${guarded}${text}`, assertive: '' };
  }
  const words = text.trim().split(/\s+/).length;
  return {
    polite: `${guarded}Response complete, ${words} words.`,
    assertive: '',
  };
}
