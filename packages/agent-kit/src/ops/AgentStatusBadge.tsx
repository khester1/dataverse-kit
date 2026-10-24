import * as React from 'react';
import { Badge, Tooltip, type BadgeProps } from '@fluentui/react-components';
import {
  CheckmarkCircleRegular, ShieldErrorRegular, DismissCircleRegular,
  ErrorCircleRegular, PlugDisconnectedRegular, StopRegular,
} from '@fluentui/react-icons';
import type { AgentRunStatus } from '../core';

export interface AgentStatusBadgeProps {
  status: AgentRunStatus;
  /** Shown in a tooltip — the provider's own message, when there is one. */
  reason?: string;
  size?: BadgeProps['size'];
}

interface Presentation {
  label: string;
  color: NonNullable<BadgeProps['color']>;
  icon: React.ReactElement;
}

/**
 * ★★ SIX STATES, EACH WITH ITS OWN WORDS.
 *
 *    The whole reason the run ladder is six-valued rather than {ok|error} is that these need
 *    different reactions: `blocked` is a content filter, `refused` is the model declining,
 *    `notProvisioned` is nobody having turned the service on, `cancelled` is the user pressing
 *    stop. Collapsing any pair into a shared label throws that away — so the label is part of
 *    the contract, and a test enumerates the union to prove each is distinct and non-empty.
 *
 * ★ The state is in the TEXT, never only the colour (WCAG 1.4.1). Four of these would otherwise
 *   be shades of red.
 */
const PRESENTATION: Record<AgentRunStatus, Presentation> = {
  succeeded: { label: 'Succeeded', color: 'success', icon: <CheckmarkCircleRegular /> },
  blocked: { label: 'Blocked by content filter', color: 'warning', icon: <ShieldErrorRegular /> },
  refused: { label: 'Declined', color: 'warning', icon: <DismissCircleRegular /> },
  error: { label: 'Error', color: 'danger', icon: <ErrorCircleRegular /> },
  notProvisioned: { label: 'Not configured', color: 'informative', icon: <PlugDisconnectedRegular /> },
  cancelled: { label: 'Stopped', color: 'subtle', icon: <StopRegular /> },
};

/** Exported so the label contract can be asserted directly rather than scraped from markup. */
export function runStatusLabel(status: AgentRunStatus): string {
  return PRESENTATION[status].label;
}

export function AgentStatusBadge({ status, reason, size = 'medium' }: AgentStatusBadgeProps): React.ReactElement {
  const { label, color, icon } = PRESENTATION[status];
  const badge = (
    <Badge appearance="tint" color={color} icon={icon} size={size}>
      {label}
    </Badge>
  );
  return reason ? (
    <Tooltip content={reason} relationship="description" withArrow>
      {badge}
    </Tooltip>
  ) : (
    badge
  );
}
