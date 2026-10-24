import * as React from 'react';
import { Avatar, type PresenceBadgeStatus } from '@fluentui/react-components';
import type { AgentParticipant } from '../core';
import type { PresenceState } from './types';

export interface AgentAvatarProps {
  participant?: AgentParticipant;
  presence?: PresenceState;
  size?: 24 | 28 | 32 | 36 | 40 | 48;
  name?: string;
}

const STATUS: Record<PresenceState, PresenceBadgeStatus | undefined> = {
  available: 'available',
  busy: 'busy',
  away: 'away',
  offline: 'offline',
  dnd: 'do-not-disturb',
  unknown: 'unknown',
};

/**
 * ★ `Avatar` and `PresenceBadge` are measured tabster-safe (`react-avatar` imports only
 *   `createCustomFocusIndicatorStyle`; `react-badge` has no tabster dependency at all), so
 *   these are Fluent's rather than in-tree.
 *
 * ★ `AvatarGroup` is NOT — it pulls `react-popover`, which reaches `useModalAttributes`. If a
 *   facepile is ever wanted, that is the component to check first.
 */
export function AgentAvatar({ participant, presence, size = 32, name }: AgentAvatarProps): React.ReactElement {
  const displayName = name ?? participant?.displayName ?? 'Unknown';
  return (
    <Avatar
      name={displayName}
      initials={participant?.initials}
      image={participant?.imageUrl ? { src: participant.imageUrl } : undefined}
      size={size}
      badge={presence ? { status: STATUS[presence] ?? 'unknown' } : undefined}
      // The badge is decorative here: presence is carried in the ROW's accessible name, so a
      // screen reader does not hear it twice.
      aria-hidden={undefined}
    />
  );
}
