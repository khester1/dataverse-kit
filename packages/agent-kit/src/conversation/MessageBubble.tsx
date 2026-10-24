import * as React from 'react';
import { Avatar, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import type { AgentMessage, AgentParticipant } from '../core';
import { useVisuallyHiddenStyles } from '../a11y';
import { StreamingText } from './StreamingText';
import { MessageActions, type MessageActionsProps } from './MessageActions';

export interface MessageBubbleProps extends Omit<MessageActionsProps, 'message'> {
  message: AgentMessage;
  author?: AgentParticipant;
  /** First message of a run — renders the avatar and name. */
  isRunStart?: boolean;
  locale?: string;
}

const useStyles = makeStyles({
  row: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    position: 'relative',
    paddingRight: tokens.spacingHorizontalXXL,
  },
  own: { flexDirection: 'row-reverse', paddingRight: 0, paddingLeft: tokens.spacingHorizontalXXL },
  gutter: { width: '32px', flexShrink: 0 },
  stack: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, maxWidth: '80%' },
  name: { fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground3 },
  bubble: {
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground1,
    fontSize: tokens.fontSizeBase300,
  },
  ownBubble: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
  },
  actions: {
    position: 'absolute',
    top: '-12px',
    right: tokens.spacingHorizontalS,
    opacity: 0,
    pointerEvents: 'none',
    transitionProperty: 'opacity',
    transitionDuration: tokens.durationFaster,
  },
  // ★ hover OR focus-within. Without the second selector the row is unreachable by keyboard.
  actionsVisible: { opacity: 1, pointerEvents: 'auto' },
});

export function MessageBubble(props: MessageBubbleProps): React.ReactElement {
  const { message, author, isRunStart = true, locale, ...actionHandlers } = props;
  const styles = useStyles();
  const hidden = useVisuallyHiddenStyles();
  const [revealed, setRevealed] = React.useState(false);

  const own = message.role === 'user';
  const name = author?.displayName ?? (own ? 'You' : (message.provider ?? 'Assistant'));
  const time = new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(new Date(message.createdAt));

  return (
    <div
      className={mergeClasses(styles.row, own && styles.own)}
      onMouseEnter={() => setRevealed(true)}
      onMouseLeave={() => setRevealed(false)}
      onFocus={() => setRevealed(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setRevealed(false);
      }}
      data-testid="agentkit-message"
    >
      <div className={styles.gutter}>
        {isRunStart ? <Avatar name={name} size={32} image={author?.imageUrl ? { src: author.imageUrl } : undefined} /> : null}
      </div>

      <div className={styles.stack}>
        {/* ★ The author and timestamp are ALWAYS in the accessible tree, even on a grouped
            continuation where they are visually suppressed. Grouping is a visual affordance;
            a screen reader navigating message-by-message would otherwise hear nothing
            identifying messages 2..N of a run — in a UI whose entire point is the distinction
            between what the user said and what the model said. */}
        <span className={hidden.root}>
          {name}, <time dateTime={new Date(message.createdAt).toISOString()}>{time}</time>
        </span>

        {isRunStart ? (
          <span className={styles.name} aria-hidden="true">
            {name} · {time}
          </span>
        ) : null}

        <div
          className={mergeClasses(styles.bubble, own && styles.ownBubble)}
          // ★ Tells a screen reader the answer is still arriving, WITHOUT making the
          //   transcript a live region — see a11y/LiveAnnouncer.
          aria-busy={message.streaming || undefined}
        >
          <StreamingText text={message.text} streaming={message.streaming} />
        </div>
      </div>

      <div className={mergeClasses(styles.actions, revealed && styles.actionsVisible)}>
        <MessageActions message={message} {...actionHandlers} />
      </div>
    </div>
  );
}
