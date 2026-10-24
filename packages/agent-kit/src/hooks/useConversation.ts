import * as React from 'react';
import {
  applyAgentEvent,
  appendUserMessage,
  deriveAnnouncement,
  initialConversation,
  NO_ANNOUNCEMENT,
  type Announcement,
  type AgentAttachment,
  type AgentMessage,
  type ConversationState,
  type IAgentService,
} from '../core';

export interface UseConversationOptions {
  service: IAgentService;
  seed?: readonly AgentMessage[];
  grounding?: Record<string, unknown>;
  conversationId?: string;
  /** Ids are injected so tests and Storybook are deterministic. */
  createId?: () => string;
}

export interface Conversation {
  state: ConversationState;
  announcement: Announcement;
  busy: boolean;
  send: (text: string, attachments?: AgentAttachment[]) => Promise<void>;
  cancel: () => void;
}

let fallbackId = 0;

/**
 * Drive an `IAgentService` into a `ConversationState`.
 *
 * ★ The reducer and the announcement rule are both PURE and live in ./core — this hook only
 *   owns the effectful parts: the abort controller, the iteration, and holding the previous
 *   state so a transition can be detected. That split is what lets the interesting rules be
 *   tested without a DOM.
 *
 * ★ `send()` NEVER throws. A transport that throws mid-stream (which an AsyncIterable can do,
 *   and a Promise-shaped seam cannot) is converted into terminal state, because the
 *   alternative is an unmounted tree — the React-layer analogue of the tabster crash.
 */
export function useConversation(options: UseConversationOptions): Conversation {
  const { service, seed, grounding, conversationId, createId } = options;
  const [state, setState] = React.useState<ConversationState>(() => initialConversation(seed));
  const [announcement, setAnnouncement] = React.useState<Announcement>(NO_ANNOUNCEMENT);
  const abortRef = React.useRef<AbortController | null>(null);
  const stateRef = React.useRef(state);
  stateRef.current = state;

  const nextId = React.useCallback(
    () => createId?.() ?? `m${++fallbackId}-${Date.now().toString(36)}`,
    [createId],
  );

  const commit = React.useCallback((next: ConversationState) => {
    const previous = stateRef.current;
    stateRef.current = next;
    setState(next);
    const derived = deriveAnnouncement(next, previous);
    if (derived.polite || derived.assertive) setAnnouncement(derived);
  }, []);

  const cancel = React.useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const send = React.useCallback(
    async (text: string, attachments?: AgentAttachment[]) => {
      if (!text.trim()) return;
      // Abort any in-flight turn before starting another, or the previous iterator keeps
      // running and both write into the same state.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      let next = appendUserMessage(stateRef.current, { id: nextId(), text, attachments });
      commit(next);

      try {
        for await (const event of service.send({
          text,
          history: next.messages,
          grounding,
          attachments,
          conversationId,
          cancelSignal: controller.signal,
        })) {
          next = applyAgentEvent(next, event);
          commit(next);
        }
      } catch (error) {
        commit({
          ...next,
          streamingMessageId: null,
          status: 'error',
          failure: {
            status: 'error',
            message: error instanceof Error ? error.message : String(error),
            recoverable: true,
          },
        });
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [service, grounding, conversationId, nextId, commit],
  );

  React.useEffect(() => () => abortRef.current?.abort(), []);

  const busy = state.status === 'connecting' || state.status === 'streaming';
  return { state, announcement, busy, send, cancel };
}
