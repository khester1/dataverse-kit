import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, makeStyles, tokens, Tooltip } from '@fluentui/react-components';
import { AttachRegular, EmojiRegular, TextFontRegular } from '@fluentui/react-icons';
import {
  MessageList,
  Composer,
  SystemNotice,
  SuggestedPrompts,
  EmptyConversation,
} from '../conversation';
import { useConversation } from '../hooks';
import { MockAgentService } from '../services';
import { participants, thread, starterPrompts, T0 } from './conversation.data';

/**
 * The affordances a Teams-shaped composer carries. They live in the STORY, not the kit: formatting,
 * emoji and attachment pickers are host concerns, and `Composer`'s `toolbar` slot is where they go.
 */
function DemoComposerTools(): React.ReactElement {
  return (
    <>
      <Tooltip content="Format" relationship="label" withArrow>
        <Button appearance="subtle" icon={<TextFontRegular />} />
      </Tooltip>
      <Tooltip content="Emoji" relationship="label" withArrow>
        <Button appearance="subtle" icon={<EmojiRegular />} />
      </Tooltip>
      <Tooltip content="Attach" relationship="label" withArrow>
        <Button appearance="subtle" icon={<AttachRegular />} />
      </Tooltip>
    </>
  );
}

const useStyles = makeStyles({
  frame: {
    height: '560px',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '760px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    overflow: 'hidden',
  },
});

const meta: Meta = { title: 'Conversation' };
export default meta;

/**
 * A settled thread. ★ This is the CHROMATIC subject: no timers, no streaming, `now` pinned, so
 * the day dividers and timestamps are deterministic.
 */
function ThreadDemo(): React.ReactElement {
  const styles = useStyles();
  const [value, setValue] = React.useState('');
  return (
    <div className={styles.frame}>
      <MessageList
        messages={thread}
        participants={participants}
        now={T0 + 120_000}
        timeZone="UTC"
        locale="en-GB"
        onCopy={() => {}}
        onRetry={() => {}}
        onFeedback={() => {}}
      />
      <SuggestedPrompts prompts={['Open case 4417', 'Who is Dana Reed?']} onPick={setValue} />
      <Composer
        value={value}
        onChange={setValue}
        onSend={() => setValue('')}
        toolbar={<DemoComposerTools />}
      />
    </div>
  );
}
export const Thread: StoryObj = { render: () => <ThreadDemo /> };

/** The zero state. */
function EmptyDemo(): React.ReactElement {
  const styles = useStyles();
  const [value, setValue] = React.useState('');
  return (
    <div className={styles.frame}>
      <MessageList
        messages={[]}
        now={T0}
        emptyState={<EmptyConversation prompts={starterPrompts} onPick={setValue} />}
      />
      <Composer value={value} onChange={setValue} onSend={() => setValue('')} />
    </div>
  );
}
export const Empty: StoryObj = { render: () => <EmptyDemo /> };

/** Every terminal state, side by side — five outcomes, not two. */
function NoticesDemo(): React.ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 640 }}>
      <SystemNotice failure={{ status: 'blocked', message: 'The response was withheld by the content filter.', code: 'content_filter' }} />
      <SystemNotice failure={{ status: 'refused', message: 'The agent declined to answer without an account.' }} />
      <SystemNotice failure={{ status: 'error', message: 'Rate limited. Try again shortly.', recoverable: true }} onRetry={() => {}} />
      <SystemNotice failure={{ status: 'notProvisioned', message: 'No Foundry project is configured for this environment.' }} />
      <SystemNotice failure={{ status: 'cancelled', message: 'Stopped.' }} />
      <SystemNotice guarded />
    </div>
  );
}
export const Notices: StoryObj = { render: () => <NoticesDemo /> };

/**
 * The surface, live against the mock. Type `/blocked`, `/grounded`, `/error`, `/cancelled`…
 *
 * ★ NOT snapshotted: it streams on a timer, so every capture would differ and the baseline
 *   would churn forever. `Thread` above is the frozen sibling that carries the visual review.
 */
function LiveDemo(): React.ReactElement {
  const styles = useStyles();
  const service = React.useMemo(() => new MockAgentService({ scenario: 'grounded' }), []);
  const conversation = useConversation({ service, grounding: { accountId: 'contoso' } });
  const [value, setValue] = React.useState('');

  return (
    <div className={styles.frame}>
      <MessageList
        messages={conversation.state.messages}
        participants={participants}
        announcement={conversation.announcement}
        busy={conversation.busy}
        timeZone="UTC"
        locale="en-GB"
        onCopy={() => {}}
        emptyState={
          <EmptyConversation
            prompts={['/grounded', '/toolApproval', '/blocked', '/error', '/notProvisioned']}
            onPick={(p) => void conversation.send(p)}
          />
        }
      />
      {conversation.state.suggestions ? (
        <SuggestedPrompts prompts={conversation.state.suggestions} onPick={(p) => void conversation.send(p)} />
      ) : null}
      <SystemNotice failure={conversation.state.failure} onRetry={() => void conversation.send('retry')} />
      <Composer
        value={value}
        onChange={setValue}
        onSend={(text) => {
          setValue('');
          void conversation.send(text);
        }}
        onStop={conversation.cancel}
        busy={conversation.busy}
      />
    </div>
  );
}
export const Live: StoryObj = {
  render: () => <LiveDemo />,
  parameters: { chromatic: { disableSnapshot: true } },
};
