import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { makeStyles, tokens } from '@fluentui/react-components';
import {
  ChatRegular, PeopleRegular, CalendarRegular, AppsRegular, SettingsRegular,
  InfoRegular, CallRegular, VideoRegular,
} from '@fluentui/react-icons';
import {
  AgentAppShell, AppRail, ConversationList, ConversationHeader, RightPane, GlobalSearchBar,
} from '../shell';
import { MessageList, Composer, EmptyConversation } from '../conversation';
import { CitationList, GroundingPanel } from '../grounding';
import { useConversation } from '../hooks';
import { MockAgentService } from '../services';
import { conversations, SHELL_NOW } from './shell.data';
import { groundedSources, GROUNDED_ANSWER, groundingFacts } from './grounding.data';

const useStyles = makeStyles({
  frame: { boxSizing: 'border-box', height: '640px', border: `1px solid ${tokens.colorNeutralStroke2}`, borderRadius: tokens.borderRadiusMedium, overflow: 'hidden' },
  narrow: { boxSizing: 'border-box', height: '640px', width: '375px', border: `1px solid ${tokens.colorNeutralStroke2}`, overflow: 'hidden' },
});

const rail = [
  { id: 'chat', label: 'Chat', icon: <ChatRegular />, badgeCount: 11 },
  { id: 'people', label: 'People', icon: <PeopleRegular /> },
  { id: 'calendar', label: 'Calendar', icon: <CalendarRegular /> },
  { id: 'apps', label: 'Apps', icon: <AppsRegular /> },
  { id: 'settings', label: 'Settings', icon: <SettingsRegular /> },
];

/**
 * ★★★★ `layout: 'fullscreen'` IS LOAD-BEARING, NOT COSMETIC. Storybook's default layout puts 16px
 *    of padding on the body, so a frame declaring `width: 375px` MEASURED 343 — and the story then
 *    told `AgentAppShell` its container was 375. The shell laid out for 375 inside 343 and
 *    overflowed by 34px. The responsive gate was therefore testing "shell told 375, given 343",
 *    which is not the claim it exists to make: a fixture that cannot express its claim fails a
 *    correct implementation, and the tempting fix is to change the component.
 */
const meta: Meta = { title: 'Shell', parameters: { layout: 'fullscreen' } };
export default meta;

function Workspace({ width }: { width?: number }): React.ReactElement {
  const styles = useStyles();
  const [selected, setSelected] = React.useState('notify');
  const [tab, setTab] = React.useState('chat');
  const [search, setSearch] = React.useState('');
  const [paneOpen, setPaneOpen] = React.useState(true);
  const [draft, setDraft] = React.useState('');

  const service = React.useMemo(() => new MockAgentService({ scenario: 'grounded' }), []);
  const conversation = useConversation({ service, grounding: groundingFacts });
  const current = conversations.find((c) => c.id === selected);

  return (
    <div className={width === 375 ? styles.narrow : styles.frame}>
      <AgentAppShell
        containerWidth={width}
        rail={<AppRail items={rail} selectedId="chat" onSelect={() => {}} maxVisible={4} />}
        sidebar={
          <>
            <div style={{ padding: 8 }}>
              <GlobalSearchBar value={search} onChange={setSearch} />
            </div>
            <ConversationList
              items={conversations.filter((c) =>
                c.title.toLowerCase().includes(search.toLowerCase()),
              )}
              selectedId={selected}
              onSelect={setSelected}
              locale="en-GB"
            />
          </>
        }
        header={
          <ConversationHeader
            title={current?.title ?? 'Conversation'}
            subtitle={current?.presence}
            presence={current?.presence}
            tabs={[
              { id: 'chat', label: 'Chat' },
              { id: 'files', label: 'Files' },
              { id: 'about', label: 'About' },
            ]}
            selectedTabId={tab}
            onTabSelect={setTab}
            actions={[
              { key: 'call', label: 'Call', icon: <CallRegular />, onClick: () => {} },
              { key: 'video', label: 'Video', icon: <VideoRegular />, onClick: () => {} },
              { key: 'info', label: 'Details', icon: <InfoRegular />, onClick: () => setPaneOpen((v) => !v) },
              { key: 'pin', label: 'Pin conversation', onClick: () => {} },
            ]}
          />
        }
        rightPane={
          <RightPane open={paneOpen} title="Details" onClose={() => setPaneOpen(false)}>
            <CitationList text={GROUNDED_ANSWER} sources={groundedSources} onOpenSource={() => {}} defaultOpen />
            <GroundingPanel grounding={groundingFacts} />
          </RightPane>
        }
      >
        <MessageList
          messages={conversation.state.messages}
          announcement={conversation.announcement}
          busy={conversation.busy}
          now={SHELL_NOW}
          timeZone="UTC"
          locale="en-GB"
          onCopy={() => {}}
          onRetry={() => {}}
          emptyState={
            <EmptyConversation
              title={current?.title ?? 'Ask the agent'}
              description="It answers from the records you have open."
              prompts={['/grounded', '/toolApproval', '/blocked']}
              onPick={(p) => void conversation.send(p)}
            />
          }
        />
        <Composer
          value={draft}
          onChange={setDraft}
          onSend={(text) => {
            setDraft('');
            void conversation.send(text);
          }}
          onStop={conversation.cancel}
          busy={conversation.busy}
        />
      </AgentAppShell>
    </div>
  );
}

/**
 * The whole thing, assembled only from kit components.
 *
 * ★ Not snapshotted: it streams on a timer. The four width stories below are the frozen
 *   subjects that carry the visual review.
 */
export const Workspace_Live: StoryObj = {
  name: 'Workspace (live)',
  render: () => <Workspace />,
  parameters: { chromatic: { disableSnapshot: true } },
};

/**
 * ★ The responsive gate from the plan, as four FROZEN stories. `containerWidth` drives the
 *   layout directly rather than relying on a ResizeObserver, so each capture is deterministic:
 *   1600/1280 full, 768 drops the detail pane, 375 drops the rail and collapses the list
 *   behind a toggle.
 */
/**
 * ★★★★ EACH STORY IS CAPTURED AT THE WIDTH IT CLAIMS TO REPRESENT. Chromatic's default viewport is
 *    1200px, so before this every one of these — the 375 story included — was photographed in a
 *    1200px window. A frame declaring 375px inside a 1200px window has room to spare, so the 34px
 *    overflow this story actually had was INVISIBLE to visual review; it only appears when the
 *    viewport is 375 too. A responsive gate photographed at a single width is not a responsive gate.
 *
 * ★ Costs NO extra snapshots: this REPLACES each default capture with a matched-width one rather
 *   than adding viewports. Re-shooting the 1600 story at 375 would buy nothing — `containerWidth`
 *   drives the layout, so it would show the shell clipped, not responding.
 */
export const Width1600: StoryObj = {
  name: '1600 — full',
  render: () => <Workspace width={1600} />,
  parameters: { chromatic: { viewports: [1600] } },
};
export const Width1280: StoryObj = {
  name: '1280 — full',
  render: () => <Workspace width={1280} />,
  parameters: { chromatic: { viewports: [1280] } },
};
export const Width768: StoryObj = {
  name: '768 — no detail pane',
  render: () => <Workspace width={768} />,
  parameters: { chromatic: { viewports: [768] } },
};
export const Width375: StoryObj = {
  name: '375 — rail and list collapsed',
  render: () => <Workspace width={375} />,
  parameters: { chromatic: { viewports: [375] } },
};
