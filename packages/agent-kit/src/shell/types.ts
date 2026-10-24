import type { AgentParticipant } from '../core';

export type PresenceState = 'available' | 'busy' | 'away' | 'offline' | 'dnd' | 'unknown';

/**
 * One row in the conversation list.
 *
 * ★★ THE LIST IS FLAT, AND THAT IS A DECISION.
 *
 *    A Teams *chat* list — which is what this models, and what the reference screenshot shows —
 *    is flat: a sequence of conversations. A Teams *teams/channels* tree is not, and it would
 *    need `role="tree"` with `treeitem`/`group`/`aria-level`/`aria-expanded` and Right/Left
 *    expand-collapse. That is a genuinely different widget, and hand-rolling APG Tree is large;
 *    if nesting is ever needed, use Fluent's `Tree` behind the host's `targetDocument` isolation
 *    rather than growing this one.
 */
export interface ConversationSummary {
  id: string;
  title: string;
  /** Last message, one line. */
  preview?: string;
  timestamp?: number;
  unreadCount?: number;
  participant?: AgentParticipant;
  presence?: PresenceState;
  /** Renders a muted style and omits unread from the accessible name. */
  muted?: boolean;
}

export interface RailItem {
  id: string;
  label: string;
  icon: React.ReactElement;
  badgeCount?: number;
}
