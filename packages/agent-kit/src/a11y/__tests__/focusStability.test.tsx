import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { render, act } from '@testing-library/react';
import { MessageList } from '../../conversation';
import { useFocusRestore } from '../useFocusRestore';
import { AgentKitHostProvider } from '../../host/AgentKitHostProvider';
import type { AgentMessage } from '../../core';

const T0 = Date.UTC(2026, 2, 12, 14, 0, 0);
const wrap = (ui: React.ReactElement) =>
  render(<AgentKitHostProvider idPrefix="test-">{ui}</AgentKitHostProvider>);

const streaming = (text: string): AgentMessage => ({
  id: 'a1',
  role: 'assistant',
  authorId: 'agent',
  text,
  createdAt: T0,
  streaming: true,
});

describe('focus survives streaming', () => {
  /**
   * ★★ THE INVARIANT `StreamingText`'s docstring CLAIMS, pinned.
   *
   *    A chat surface removes and re-renders nodes constantly. If the streaming subtree
   *    remounted per token, any focus inside the bubble — a copy button, a citation chip —
   *    would be thrown to `<body>` mid-answer: the keyboard user's Tab position resets and the
   *    screen reader loses its place. "Must not remount per token" is easy to state in a
   *    comment and easy to break silently, so it is asserted here.
   */
  it('keeps the streaming element IDENTITY stable across 200 deltas', () => {
    const { container, rerender } = wrap(
      <MessageList messages={[streaming('')]} now={T0} timeZone="UTC" />,
    );
    const first = container.querySelector('[data-testid="agentkit-streaming-text"]');
    expect(first).toBeTruthy();

    let text = '';
    for (let i = 0; i < 200; i++) {
      text += `w${i} `;
      rerender(
        <AgentKitHostProvider idPrefix="test-">
          <MessageList messages={[streaming(text)]} now={T0} timeZone="UTC" />
        </AgentKitHostProvider>,
      );
    }

    const last = container.querySelector('[data-testid="agentkit-streaming-text"]');
    // Stimulus landed: the text really grew.
    expect(last?.textContent?.split(/\s+/).filter(Boolean)).toHaveLength(200);
    // Same DOM node throughout — only the text node changed.
    expect(last).toBe(first);
  });

  it('keeps focus inside the bubble while it streams', () => {
    const { container, rerender } = wrap(
      <MessageList messages={[streaming('start')]} now={T0} timeZone="UTC" onCopy={() => {}} />,
    );
    const button = container.querySelector('[role="toolbar"] button') as HTMLElement;
    act(() => button.focus());
    expect(document.activeElement).toBe(button);

    for (let i = 0; i < 50; i++) {
      rerender(
        <AgentKitHostProvider idPrefix="test-">
          <MessageList messages={[streaming(`start ${'x '.repeat(i)}`)]} now={T0} timeZone="UTC" onCopy={() => {}} />
        </AgentKitHostProvider>,
      );
    }
    // A remount would have dropped focus to <body>.
    expect(document.activeElement).toBe(button);
    expect(document.activeElement).not.toBe(document.body);
  });
});

function Restorable({ show }: { show: boolean }): React.ReactElement {
  const ref = React.useRef<HTMLDivElement>(null);
  const restore = useFocusRestore(ref);
  React.useEffect(() => {
    if (!show) restore();
  }, [show, restore]);
  return (
    <div ref={ref} tabIndex={-1}>
      <button type="button">survivor</button>
      {show ? <button type="button">doomed</button> : null}
    </div>
  );
}

describe('useFocusRestore', () => {
  it('rescues focus from <body> when the focused node is removed', () => {
    const { getByText, rerender } = wrap(<Restorable show />);
    const doomed = getByText('doomed');
    act(() => doomed.focus());
    expect(document.activeElement).toBe(doomed);

    rerender(
      <AgentKitHostProvider idPrefix="test-">
        <Restorable show={false} />
      </AgentKitHostProvider>,
    );

    // Without the hook this is <body>, and the keyboard user is back at the top of the page.
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement).toBe(getByText('survivor'));
  });

  it('does NOT steal focus that landed somewhere real', () => {
    const { getByText, rerender } = wrap(<Restorable show />);
    const survivor = getByText('survivor');
    act(() => survivor.focus());

    rerender(
      <AgentKitHostProvider idPrefix="test-">
        <Restorable show={false} />
      </AgentKitHostProvider>,
    );
    // The row where an over-eager implementation and a correct one differ.
    expect(document.activeElement).toBe(survivor);
  });
});
