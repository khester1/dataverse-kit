import * as React from 'react';
import { Button, makeStyles, tokens } from '@fluentui/react-components';
import { ArrowDownRegular } from '@fluentui/react-icons';
import {
  bucketByDay,
  groupMessages,
  type AgentMessage,
  type AgentParticipant,
  type Announcement,
} from '../core';
import { LiveAnnouncer } from '../a11y';
import { useStickyScroll } from '../hooks';
import { MessageBubble } from './MessageBubble';
import { DayDivider } from './DayDivider';
import { TypingIndicator } from './TypingIndicator';
import type { MessageActionsProps } from './MessageActions';

export interface MessageListProps extends Omit<MessageActionsProps, 'message'> {
  messages: readonly AgentMessage[];
  participants?: readonly AgentParticipant[];
  /** Renders the typing indicator and suppresses the "jump to latest" nudge. */
  busy?: boolean;
  announcement?: Announcement;
  groupWindowMs?: number;
  timeZone?: string;
  locale?: string;
  /** Injected so day labels are deterministic in tests and Chromatic. */
  now?: number;
  emptyState?: React.ReactNode;
}

const useStyles = makeStyles({
  root: { position: 'relative', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' },
  scroller: {
    flex: 1,
    overflowY: 'auto',
    padding: tokens.spacingVerticalM,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  jump: { position: 'absolute', bottom: tokens.spacingVerticalM, alignSelf: 'center', zIndex: 1 },
});

/**
 * The transcript.
 *
 * ★ It is NOT a live region. Announcements go through `LiveAnnouncer`, fed by
 *   `deriveAnnouncement` on state TRANSITIONS — a live region over the streaming node queues
 *   every token and a screen reader never finishes reading.
 *
 * ★ Grouping (avatar + name once per run) is VISUAL. Every `MessageBubble` still carries its
 *   author and timestamp in the accessible tree.
 */
export function MessageList(props: MessageListProps): React.ReactElement {
  const {
    messages, participants, busy = false, announcement,
    groupWindowMs, timeZone, locale, now, emptyState, ...actionHandlers
  } = props;

  const styles = useStyles();
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const { onScroll, scrollToBottom, isPinned } = useStickyScroll(scrollerRef, messages.length);

  const byId = React.useMemo(
    () => new Map((participants ?? []).map((p) => [p.id, p])),
    [participants],
  );

  // A message is a run START unless the grouping says it continues one.
  const runStarts = React.useMemo(() => {
    const groups = groupMessages(messages, { windowMs: groupWindowMs, timeZone });
    return new Set(groups.map((g) => g.messageIds[0]));
  }, [messages, groupWindowMs, timeZone]);

  const buckets = React.useMemo(
    () => bucketByDay(messages, { timeZone, now }),
    [messages, timeZone, now],
  );
  const dividerBefore = React.useMemo(() => {
    const map = new Map<string, (typeof buckets)[number]['label']>();
    for (const bucket of buckets) map.set(bucket.messageIds[0], bucket.label);
    return map;
  }, [buckets]);

  return (
    <div className={styles.root}>
      <LiveAnnouncer polite={announcement?.polite} assertive={announcement?.assertive} />

      <div
        ref={scrollerRef}
        className={styles.scroller}
        onScroll={onScroll}
        // A labelled, focusable scroll region: a keyboard user must be able to reach and
        // scroll the transcript without tabbing through every message inside it.
        role="log"
        aria-label="Conversation"
        tabIndex={0}
      >
        {messages.length === 0 ? (
          emptyState ?? null
        ) : (
          messages.map((message) => (
            <React.Fragment key={message.id}>
              {dividerBefore.has(message.id) ? (
                <DayDivider label={dividerBefore.get(message.id)!} locale={locale} />
              ) : null}
              <MessageBubble
                message={message}
                author={byId.get(message.authorId)}
                isRunStart={runStarts.has(message.id)}
                locale={locale}
                {...actionHandlers}
              />
            </React.Fragment>
          ))
        )}
        {busy ? <TypingIndicator /> : null}
      </div>

      {!isPinned && messages.length > 0 ? (
        <Button
          className={styles.jump}
          size="small"
          appearance="primary"
          icon={<ArrowDownRegular />}
          onClick={scrollToBottom}
        >
          Jump to latest
        </Button>
      ) : null}
    </div>
  );
}
