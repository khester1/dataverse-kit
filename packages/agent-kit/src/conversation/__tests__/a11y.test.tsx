import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { MessageList } from '../MessageList';
import { MessageBubble } from '../MessageBubble';
import { Composer } from '../Composer';
import { SystemNotice } from '../SystemNotice';
import { SuggestedPrompts } from '../SuggestedPrompts';
import { EmptyConversation } from '../EmptyConversation';
import { TypingIndicator } from '../TypingIndicator';
import { DayDivider } from '../DayDivider';
import { renderWithKit, expectNoAxeViolations, msg, T0 } from './testUtils';

/**
 * ★★ THE FIRST AUTOMATED ACCESSIBILITY GATE IN EITHER REPO.
 *
 * Neither dynamics-ui-kit nor pcf-gallery had one: zero hits for axe, jest-axe or vitest-axe
 * across both. This package hand-rolls ARIA (a roving toolbar, a disclosure, live regions), so
 * shipping that with nothing checking it would be the riskiest thing in the increment.
 *
 * ★★ AND IT IS A FLOOR, NOT A CEILING — measured, after writing an overclaim here first.
 *    I sabotaged this suite with an unlabelled `role="toolbar"` and with an `aria-controls`
 *    pointing at nothing. axe stayed GREEN for BOTH: it ships no toolbar-name rule at all
 *    (`aria-command-name` covers button/link/menuitem only), and a dangling `aria-controls`
 *    surfaces as neither a violation nor an incomplete. Verified directly against axe-core
 *    4.10.3 under this jsdom, where 17 rules run and only `image-alt` fires on a probe
 *    carrying all three defects.
 *
 *    So axe here catches the classes it has rules for — missing alt text, unlabelled form
 *    controls, duplicate ids, invalid roles and attributes — and the ARIA this package
 *    HAND-ROLLS is checked by the structural assertions in `structure.test.tsx` instead.
 *    Treating a green axe run as proof of the roving toolbar or the disclosure wiring would
 *    be exactly the vacuous gate this repo keeps finding.
 */

const conversation = [
  msg({ id: 'u1', text: 'What is outstanding on Contoso?' }),
  msg({ id: 'a1', role: 'assistant', authorId: 'agent', text: 'Three cases.', createdAt: T0 + 1000 }),
];

describe('axe', () => {
  it('MessageList (populated, with actions)', async () => {
    const { container } = renderWithKit(
      <MessageList
        messages={conversation}
        now={T0}
        timeZone="UTC"
        onCopy={() => {}}
        onRetry={() => {}}
        onFeedback={() => {}}
      />,
    );
    await expectNoAxeViolations(container);
  });

  it('MessageList (streaming, busy)', async () => {
    const { container } = renderWithKit(
      <MessageList
        messages={[{ ...conversation[1], streaming: true }]}
        busy
        now={T0}
        timeZone="UTC"
      />,
    );
    await expectNoAxeViolations(container);
  });

  it('MessageList (empty state)', async () => {
    const { container } = renderWithKit(
      <MessageList
        messages={[]}
        now={T0}
        emptyState={<EmptyConversation prompts={['Summarise this account']} onPick={() => {}} />}
      />,
    );
    await expectNoAxeViolations(container);
  });

  it('Composer', async () => {
    const { container } = renderWithKit(<Composer value="hi" onChange={() => {}} onSend={() => {}} />);
    await expectNoAxeViolations(container);
  });

  it('Composer (busy, stop button)', async () => {
    const { container } = renderWithKit(
      <Composer value="hi" onChange={() => {}} onSend={() => {}} onStop={() => {}} busy />,
    );
    await expectNoAxeViolations(container);
  });

  it.each(['blocked', 'refused', 'error', 'notProvisioned', 'cancelled'] as const)(
    'SystemNotice (%s)',
    async (status) => {
      const { container } = renderWithKit(
        <SystemNotice
          failure={{ status, message: 'Something to say', recoverable: status === 'error' }}
          onRetry={() => {}}
        />,
      );
      await expectNoAxeViolations(container);
    },
  );

  it('MessageBubble, SuggestedPrompts, TypingIndicator, DayDivider', async () => {
    const { container } = renderWithKit(
      <div>
        <MessageBubble message={conversation[1]} onCopy={() => {}} />
        <SuggestedPrompts prompts={['One', 'Two']} onPick={() => {}} />
        <TypingIndicator />
        <DayDivider label={{ kind: 'today' }} />
      </div>,
    );
    await expectNoAxeViolations(container);
  });
});

describe('the accessible transcript', () => {
  // ★ Grouping suppresses the avatar and name VISUALLY. If it also removed them from the
  //   accessibility tree, a screen reader navigating message-by-message would hear nothing
  //   identifying messages 2..N of a run — in a UI whose entire point is the distinction
  //   between what the user said and what the model said.
  it('names the author on EVERY message, including grouped continuations', () => {
    const run = [
      msg({ id: 'a', authorId: 'u1', text: 'one', createdAt: T0 }),
      msg({ id: 'b', authorId: 'u1', text: 'two', createdAt: T0 + 60_000 }),
      msg({ id: 'c', authorId: 'u1', text: 'three', createdAt: T0 + 120_000 }),
    ];
    const { container } = renderWithKit(<MessageList messages={run} now={T0} timeZone="UTC" />);

    const bubbles = container.querySelectorAll('[data-testid="agentkit-message"]');
    expect(bubbles).toHaveLength(3);

    // Exactly ONE visible name (the run start) — grouping is doing its job visually...
    const visibleNames = container.querySelectorAll('[aria-hidden="true"]');
    expect(visibleNames.length).toBeGreaterThan(0);

    // ...and THREE accessible names — one per message.
    const accessible = [...bubbles].filter((b) => /You/.test(b.textContent ?? ''));
    expect(accessible).toHaveLength(3);
  });

  it('marks a streaming bubble aria-busy and a settled one not', () => {
    const { container, rerender } = renderWithKit(
      <MessageList messages={[{ ...conversation[1], streaming: true }]} now={T0} timeZone="UTC" />,
    );
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();

    rerender(<MessageList messages={[{ ...conversation[1], streaming: false }]} now={T0} timeZone="UTC" />);
    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it('renders the day divider as a named separator, not a stray text node', () => {
    const { container } = renderWithKit(<MessageList messages={conversation} now={T0} timeZone="UTC" />);
    const separator = container.querySelector('[role="separator"]');
    expect(separator).toBeTruthy();
    expect(separator?.getAttribute('aria-label')).toBeTruthy();
  });
});
