import * as React from 'react';
import { CopyRegular, ArrowClockwiseRegular, ThumbLikeRegular, ThumbDislikeRegular } from '@fluentui/react-icons';
import { ActionToolbar, type ToolbarAction } from '../internal';
import type { AgentMessage } from '../core';

export interface MessageActionsProps {
  message: AgentMessage;
  onCopy?: (message: AgentMessage) => void;
  onRetry?: (message: AgentMessage) => void;
  onFeedback?: (message: AgentMessage, vote: 'up' | 'down') => void;
}

/**
 * The hover row on a message.
 *
 * ★★ It is revealed by `:hover` **or `:focus-within`** — see MessageBubble's styles. A
 *    hover-only affordance is a WCAG 2.1.1 (Keyboard, Level A) failure outright: there is no
 *    pointer-free route to it at all. The other naive choice, leaving the row permanently in
 *    the tab order, adds N tab stops per message. Reveal-on-focus plus a roving tabindex gives
 *    exactly one tab stop per message and a keyboard route to every action.
 */
export function MessageActions({
  message,
  onCopy,
  onRetry,
  onFeedback,
}: MessageActionsProps): React.ReactElement | null {
  const actions: ToolbarAction[] = [];
  if (onCopy) {
    actions.push({ key: 'copy', label: 'Copy message', icon: <CopyRegular />, onClick: () => onCopy(message) });
  }
  if (onRetry && message.role === 'assistant') {
    actions.push({ key: 'retry', label: 'Regenerate', icon: <ArrowClockwiseRegular />, onClick: () => onRetry(message) });
  }
  if (onFeedback && message.role === 'assistant') {
    actions.push(
      { key: 'up', label: 'Good response', icon: <ThumbLikeRegular />, onClick: () => onFeedback(message, 'up') },
      { key: 'down', label: 'Bad response', icon: <ThumbDislikeRegular />, onClick: () => onFeedback(message, 'down') },
    );
  }
  if (actions.length === 0) return null;

  return <ActionToolbar actions={actions} label={`Actions for this message`} />;
}
