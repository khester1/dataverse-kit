import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { makeStyles, tokens, Button } from '@fluentui/react-components';
import {
  HeadsetRegular, PersonFeedbackRegular, ChatRegular, HistoryRegular, ScreenshotRegular,
} from '@fluentui/react-icons';
import { AgentLauncher, AssistantPanel, FeedbackPanel, MessageList, Composer, useConversation } from '../index';
import { MockAgentService } from '../services';
import type { FeedbackValue } from '../support/types';

const meta: Meta = { title: 'Support' };
export default meta;

const useStyles = makeStyles({
  stage: {
    position: 'relative', height: '560px', overflow: 'hidden',
    border: `1px solid ${tokens.colorNeutralStroke2}`, backgroundColor: tokens.colorNeutralBackground3,
  },
  drawer: { position: 'absolute', top: 0, right: 0, bottom: 0, width: '400px' },
  page: { padding: tokens.spacingVerticalXXL, color: tokens.colorNeutralForeground3 },
});

const LAUNCH = [
  { id: 'help', label: 'Help & support', icon: <HeadsetRegular /> },
  { id: 'feedback', label: 'Give Feedback', icon: <PersonFeedbackRegular /> },
];

/** The collapsed rail, docked to the edge. Hover or tab to a pill to reveal its label. */
function LauncherDemo(): React.ReactElement {
  const styles = useStyles();
  const [picked, setPicked] = React.useState<string | null>(null);
  return (
    <div className={styles.stage}>
      <div className={styles.page}>Host page content. The launcher docks to the right edge — hover a pill, or Tab to it.</div>
      <div className={styles.page}>{picked ? `Picked: ${picked}` : 'Nothing picked yet.'}</div>
      <AgentLauncher items={LAUNCH} onSelect={setPicked} />
    </div>
  );
}
export const Launcher: StoryObj = { render: () => <LauncherDemo /> };

/** The docked assistant, as the M365 admin centre presents Support Assistant. */
function DrawerDemo(): React.ReactElement {
  const styles = useStyles();
  const service = React.useMemo(() => new MockAgentService({ seed: 4 }), []);
  const conversation = useConversation({ service });
  const [tab, setTab] = React.useState('chat');
  const [on, setOn] = React.useState(true);
  const [muted, setMuted] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const started = conversation.state.messages.length > 0;
  return (
    <div className={styles.stage}>
      <div className={styles.page}>Host page content behind the drawer.</div>
      <div className={styles.drawer}>
        <AssistantPanel
          title="Support Assistant"
          tabs={[
            { id: 'chat', label: 'Chat', icon: <ChatRegular /> },
            { id: 'history', label: 'History', icon: <HistoryRegular /> },
          ]}
          activeTabId={tab}
          onTabChange={setTab}
          enabled={on}
          onEnabledChange={setOn}
          status={started ? undefined : 'Support Assistant will be with you in a moment'}
          onDownloadTranscript={() => undefined}
          muted={muted}
          onMutedChange={setMuted}
          onClose={() => undefined}
        >
          {tab === 'chat' ? (
            <>
              <MessageList messages={conversation.state.messages} busy={conversation.busy} announcement={conversation.announcement} />
              <Composer
                value={draft}
                onChange={setDraft}
                onSend={(t) => { setDraft(''); void conversation.send(t); }}
                onStop={conversation.cancel}
                busy={conversation.busy}
              />
            </>
          ) : (
            <div className={styles.page}>Past conversations would list here.</div>
          )}
        </AssistantPanel>
      </div>
    </div>
  );
}
export const Drawer: StoryObj = { render: () => <DrawerDemo /> };

/** Structured feedback. Submit stays disabled until a rating AND a consent answer exist. */
function FeedbackDemo(): React.ReactElement {
  const [value, setValue] = React.useState<FeedbackValue>({ rating: 0, comment: '' });
  const [sent, setSent] = React.useState<FeedbackValue | null>(null);
  return sent ? (
    <div style={{ padding: 24 }}>Submitted: {sent.rating}/5, contact {String(sent.mayContact)}</div>
  ) : (
    <FeedbackPanel
      heading="Submit feedback"
      ratingLabel="Rate your experience with this assistant"
      value={value}
      onChange={setValue}
      onSubmit={setSent}
      onCancel={() => undefined}
      attachments={<Button icon={<ScreenshotRegular />}>Capture screenshot</Button>}
      privacyNote={<>Signed in as admin@contoso.com. Feedback is used to improve the product.</>}
    />
  );
}
export const Feedback: StoryObj = { render: () => <FeedbackDemo /> };
