import type { AgentMessage, AgentRole } from './protocol';

/** Teams groups consecutive messages from one author inside a short window. */
export const DEFAULT_GROUP_WINDOW_MS = 5 * 60 * 1000;

export interface GroupingOptions {
  windowMs?: number;
  /** Injected so day-boundary behaviour is testable without touching the system clock. */
  timeZone?: string;
}

export interface MessageGroup {
  key: string;
  authorId: string;
  role: AgentRole;
  startedAt: number;
  messageIds: string[];
}

/** Local calendar day, in the given zone. Duplicated deliberately from dayDividers to keep
 *  this module independent of it; both delegate to Intl, so they cannot disagree. */
function dayKey(epochMs: number, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(epochMs));
}

/**
 * Do these two messages belong to the same visual run?
 *
 * ★ Exported separately from `groupMessages` on purpose. The boundary cases (4:59 / exactly
 *   5:00 / 5:01) are then assertable against the PREDICATE, instead of being inferred from
 *   a group count — where an off-by-one and a correct implementation can produce the same
 *   number of groups for the wrong reason.
 */
export function isSameAuthorRun(
  a: AgentMessage,
  b: AgentMessage,
  windowMs: number = DEFAULT_GROUP_WINDOW_MS,
  timeZone?: string,
): boolean {
  if (a.authorId !== b.authorId) return false;
  if (a.role !== b.role) return false;
  // A system notice between two messages ends the run: the second is a new utterance.
  if (a.role === 'system' || b.role === 'system') return false;
  if (b.createdAt < a.createdAt) return false;
  if (b.createdAt - a.createdAt > windowMs) return false;
  // Never group across a day divider — the divider would have to render inside the group.
  return dayKey(a.createdAt, timeZone) === dayKey(b.createdAt, timeZone);
}

/**
 * Collapse consecutive same-author messages into runs, Teams-style: the avatar and name
 * render once per run.
 *
 * ★ Grouping is a VISUAL affordance only. Every message must still carry its author in the
 *   accessible name — a screen reader navigating message-by-message would otherwise hear
 *   nothing identifying messages 2..N of a run, in a UI whose entire point is the
 *   distinction between what the user said and what the model said.
 */
export function groupMessages(
  messages: readonly AgentMessage[],
  options: GroupingOptions = {},
): MessageGroup[] {
  const windowMs = options.windowMs ?? DEFAULT_GROUP_WINDOW_MS;
  const groups: MessageGroup[] = [];

  for (const message of messages) {
    const current = groups[groups.length - 1];
    const previousId = current?.messageIds[current.messageIds.length - 1];
    const previous = previousId ? messages.find((m) => m.id === previousId) : undefined;

    if (current && previous && isSameAuthorRun(previous, message, windowMs, options.timeZone)) {
      current.messageIds.push(message.id);
      continue;
    }
    groups.push({
      key: `${message.authorId}:${message.id}`,
      authorId: message.authorId,
      role: message.role,
      startedAt: message.createdAt,
      messageIds: [message.id],
    });
  }
  return groups;
}
