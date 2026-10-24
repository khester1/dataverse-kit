import type { ConversationSummary } from '../shell';

export const SHELL_NOW = Date.UTC(2026, 2, 12, 14, 30, 0);
const MIN = 60_000;

export const conversations: ConversationSummary[] = [
  { id: 'notify', title: 'dataverse-notify-bot', preview: 'Task assigned — a new high-priority case was routed to you.', timestamp: SHELL_NOW - 12 * MIN, unreadCount: 2, presence: 'available' },
  { id: 'search', title: 'dataverse-search-me', preview: 'Three products matched “keyboard”.', timestamp: SHELL_NOW - 68 * MIN, presence: 'available' },
  { id: 'case', title: 'Case 4417 — Contoso', preview: 'Awaiting credit note approval', timestamp: SHELL_NOW - 3 * 60 * MIN, unreadCount: 9, presence: 'busy' },
  { id: 'triage', title: 'Triage assistant', preview: 'Nothing new since Tuesday', timestamp: SHELL_NOW - 26 * 60 * MIN, presence: 'away' },
  { id: 'ops', title: 'Ops digest', preview: 'Muted — 14 updates', timestamp: SHELL_NOW - 50 * 60 * MIN, unreadCount: 14, muted: true, presence: 'offline' },
];
