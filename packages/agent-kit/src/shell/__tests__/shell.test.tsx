import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import userEvent from '@testing-library/user-event';
import { AgentAppShell, AppRail, ConversationList, ConversationHeader, RightPane, conversationAccessibleName } from '..';
import { renderWithKit, expectNoAxeViolations } from '../../conversation/__tests__/testUtils';
import type { ConversationSummary, RailItem } from '../types';
import { ChatRegular, PeopleRegular, CalendarRegular } from '@fluentui/react-icons';

const T = Date.UTC(2026, 2, 12, 9, 30);

const conversations: ConversationSummary[] = [
  { id: 'c1', title: 'dataverse-notify-bot', preview: 'Task assigned', timestamp: T, unreadCount: 2, presence: 'available' },
  { id: 'c2', title: 'dataverse-search-me', preview: 'Three results', timestamp: T - 3600_000, presence: 'busy' },
  { id: 'c3', title: 'Case 4417', preview: 'Awaiting credit note', timestamp: T - 7200_000, unreadCount: 9, muted: true },
];

const rail: RailItem[] = [
  { id: 'chat', label: 'Chat', icon: <ChatRegular />, badgeCount: 3 },
  { id: 'people', label: 'People', icon: <PeopleRegular /> },
  { id: 'cal', label: 'Calendar', icon: <CalendarRegular /> },
];

describe('ConversationList — the listbox contract', () => {
  it('is ONE tab stop with aria-activedescendant, not N buttons', () => {
    const { getByRole, container } = renderWithKit(
      <ConversationList items={conversations} selectedId="c1" onSelect={() => {}} />,
    );
    const listbox = getByRole('listbox');
    expect(listbox.getAttribute('tabindex')).toBe('0');
    expect(listbox.getAttribute('aria-activedescendant')).toBeTruthy();

    // A stack of buttons would be three tab stops and no collection semantics at all.
    expect(container.querySelectorAll('button')).toHaveLength(0);
    expect(container.querySelectorAll('[role="option"]')).toHaveLength(3);
    // aria-activedescendant must point at an element that EXISTS.
    expect(document.getElementById(listbox.getAttribute('aria-activedescendant')!)).toBeTruthy();
  });

  it('moves the active option with Up/Down/Home/End and selects with Enter', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { getByRole } = renderWithKit(
      <ConversationList items={conversations} selectedId="c1" onSelect={onSelect} />,
    );
    const listbox = getByRole('listbox');
    listbox.focus();
    const activeId = () => listbox.getAttribute('aria-activedescendant');
    const optionAt = (i: number) => listbox.querySelectorAll('[role="option"]')[i].id;

    expect(activeId()).toBe(optionAt(0));
    await user.keyboard('{ArrowDown}');
    expect(activeId()).toBe(optionAt(1));
    await user.keyboard('{End}');
    expect(activeId()).toBe(optionAt(2));
    await user.keyboard('{Home}');
    expect(activeId()).toBe(optionAt(0));
    await user.keyboard('{ArrowUp}'); // clamped, not wrapped
    expect(activeId()).toBe(optionAt(0));

    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith('c1');
  });

  it('marks exactly one option aria-selected', () => {
    const { container } = renderWithKit(
      <ConversationList items={conversations} selectedId="c2" onSelect={() => {}} />,
    );
    const selected = [...container.querySelectorAll('[role="option"]')].filter(
      (o) => o.getAttribute('aria-selected') === 'true',
    );
    expect(selected).toHaveLength(1);
    expect(selected[0].getAttribute('aria-label')).toMatch(/dataverse-search-me/);
  });
});

describe('the accessible name carries what the colour carries', () => {
  // ★ WCAG 1.4.1. A blue dot and a numeric badge tell a sighted reader which conversations are
  //   waiting; a screen reader hearing "Contoso" forty times learns nothing.
  it('includes unread count and presence', () => {
    const name = conversationAccessibleName(conversations[0], 'en-GB');
    expect(name).toMatch(/dataverse-notify-bot/);
    expect(name).toMatch(/2 unread/);
    expect(name).toMatch(/available/);
  });

  it('omits unread for a MUTED conversation and says it is muted', () => {
    // The row where a naive "always append the count" implementation differs from a correct one.
    const name = conversationAccessibleName(conversations[2]);
    expect(name).not.toMatch(/9 unread/);
    expect(name).toMatch(/muted/);
  });
});

describe('AppRail', () => {
  it('names the badge count, rather than showing it only as a red dot', () => {
    const { getByRole } = renderWithKit(<AppRail items={rail} selectedId="chat" onSelect={() => {}} />);
    expect(getByRole('button', { name: /Chat, 3 unread/ })).toBeTruthy();
  });

  it('marks the current app with aria-pressed', () => {
    const { getByRole } = renderWithKit(<AppRail items={rail} selectedId="chat" onSelect={() => {}} />);
    expect(getByRole('button', { name: /Chat/ }).getAttribute('aria-pressed')).toBe('true');
    expect(getByRole('button', { name: /^People$/ }).getAttribute('aria-pressed')).toBe('false');
  });

  it('moves items past maxVisible into a labelled overflow menu', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { getByRole } = renderWithKit(
      <AppRail items={rail} maxVisible={1} onSelect={onSelect} />,
    );
    const trigger = getByRole('button', { name: /More apps, 2 hidden/ });
    await user.click(trigger);
    await user.click(getByRole('menuitem', { name: 'Calendar' }));
    expect(onSelect).toHaveBeenCalledWith('cal');
  });
});

describe('ConversationHeader', () => {
  it('uses a real tablist with manual activation', async () => {
    const user = userEvent.setup();
    const onTabSelect = vi.fn();
    const { getByRole } = renderWithKit(
      <ConversationHeader
        title="dataverse-notify-bot"
        tabs={[{ id: 'chat', label: 'Chat' }, { id: 'files', label: 'Files' }]}
        selectedTabId="chat"
        onTabSelect={onTabSelect}
      />,
    );
    expect(getByRole('tablist')).toBeTruthy();
    const files = getByRole('tab', { name: 'Files' });

    // ★ Arrowing must NOT select — manual activation, or moving through the strip fires N
    //   conversation loads on the way past.
    getByRole('tab', { name: 'Chat' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(onTabSelect).not.toHaveBeenCalled();

    await user.click(files);
    expect(onTabSelect).toHaveBeenCalledWith('files');
  });

  it('does NOT claim an aria-controls it cannot honour', () => {
    // The panel lives in the consumer's tree, so the id contract would cross components. An
    // aria-controls pointing at nothing is worse than none.
    const { getByRole } = renderWithKit(
      <ConversationHeader title="x" tabs={[{ id: 'a', label: 'A' }]} selectedTabId="a" />,
    );
    const controls = getByRole('tab', { name: 'A' }).getAttribute('aria-controls');
    if (controls) expect(document.getElementById(controls)).toBeTruthy();
  });
});

describe('AgentAppShell — responsive collapse', () => {
  const shell = (width: number) => (
    <AgentAppShell
      containerWidth={width}
      rail={<AppRail items={rail} onSelect={() => {}} />}
      sidebar={<ConversationList items={conversations} onSelect={() => {}} />}
      header={<ConversationHeader title="dataverse-notify-bot" />}
      rightPane={<RightPane open title="Details" onClose={() => {}} />}
    >
      <div>transcript</div>
    </AgentAppShell>
  );

  // ★ Driven by `containerWidth`, not by measurement: jsdom's ResizeObserver is a stub that
  //   never fires, so a measured width stays 0 forever and only the roomy branch would run.
  it.each([
    [1600, { rail: true, list: true, pane: true }],
    [1280, { rail: true, list: true, pane: true }],
    [768, { rail: true, list: true, pane: false }],
    [375, { rail: false, list: false, pane: false }],
  ])('at %ipx', (width, expected) => {
    const { queryByRole, container } = renderWithKit(shell(width));
    expect(!!queryByRole('navigation', { name: 'Apps' })).toBe(expected.rail);
    expect(!!queryByRole('listbox')).toBe(expected.list);
    expect(!!container.querySelector('aside')).toBe(expected.pane);
  });

  it('offers a toggle for the collapsed list, so it is still reachable', async () => {
    const user = userEvent.setup();
    const { getByRole, queryByRole } = renderWithKit(shell(375));
    expect(queryByRole('listbox')).toBeNull();

    const toggle = getByRole('button', { name: /Show conversations/ });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    await user.click(toggle);
    // Hidden must not mean unreachable.
    expect(getByRole('listbox')).toBeTruthy();
  });
});

describe('axe', () => {
  it('the shell is clean at a wide width', async () => {
    const { container } = renderWithKit(
      <AgentAppShell
        containerWidth={1600}
        rail={<AppRail items={rail} selectedId="chat" onSelect={() => {}} />}
        sidebar={<ConversationList items={conversations} selectedId="c1" onSelect={() => {}} />}
        header={
          <ConversationHeader
            title="dataverse-notify-bot"
            subtitle="Bot"
            tabs={[{ id: 'chat', label: 'Chat' }]}
            selectedTabId="chat"
          />
        }
        rightPane={<RightPane open title="Details" onClose={() => {}}>detail</RightPane>}
      >
        <div>transcript</div>
      </AgentAppShell>,
    );
    await expectNoAxeViolations(container);
  });
});
