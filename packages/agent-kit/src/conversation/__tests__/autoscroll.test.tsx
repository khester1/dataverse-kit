import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { MessageList } from '../MessageList';
import { renderWithKit, msg, T0 } from './testUtils';

/**
 * ★★ THE AUTOSCROLL GATE — the measured defect from apps/form-builder's ChatPane, which once
 *    keyed its scroll effect on the streaming message's CONTENT LENGTH and queued a smooth
 *    `scrollTo` per token (10+/second), jittering the viewport.
 *
 * ★ It spies on `scrollTo` specifically, because that is the method the component calls. The
 *   setup file polyfills `scrollTo`, `scroll` AND `scrollIntoView` for a reason: jsdom
 *   implements none of them, and a polyfill of only `scrollIntoView` would push the
 *   implementation onto `el.scrollTop = …` — which works in jsdom, touches no spy, and makes
 *   the counter read ZERO. A "fewer than 200" assertion would then pass vacuously, so this
 *   asserts an EXACT count.
 */
/** ★ `scrollTo` is not on `Element` in this lib config, and the build tsconfig excludes tests —
 *  so this only surfaces under `typecheck:stories`, which is exactly why that script is a CI
 *  step. vitest.setup.ts installs the method at runtime as a plain assignable function
 *  precisely so it can be spied. */
type Scrollable = Element & { scrollTo: (options?: ScrollToOptions) => void };
const spyScrollTo = () => vi.spyOn(Element.prototype as Scrollable, 'scrollTo');

describe('MessageList autoscroll', () => {
  let scrollTo: ReturnType<typeof spyScrollTo>;

  beforeEach(() => {
    scrollTo = spyScrollTo().mockImplementation(() => {});
  });
  afterEach(() => scrollTo.mockRestore());

  it('scrolls ONCE across 200 streaming deltas, not once per delta', () => {
    const base = msg({ id: 'a', role: 'assistant', authorId: 'agent', text: '', streaming: true });
    const { rerender } = renderWithKit(<MessageList messages={[base]} now={T0} timeZone="UTC" />);

    const afterMount = scrollTo.mock.calls.length;
    expect(afterMount).toBe(1);

    let text = '';
    for (let i = 0; i < 200; i++) {
      text += `word${i} `;
      rerender(<MessageList messages={[{ ...base, text }]} now={T0} timeZone="UTC" />);
    }

    // Stimulus landed: the deltas really did render. Without this the count below could be
    // 1 simply because nothing ever updated.
    expect(text.split(' ').filter(Boolean)).toHaveLength(200);
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it('does NOT scroll when the reader has scrolled up', () => {
    const first = msg({ id: 'a', text: 'one' });
    const { container, rerender } = renderWithKit(
      <MessageList messages={[first]} now={T0} timeZone="UTC" />,
    );
    const scroller = container.querySelector('[role="log"]') as HTMLElement;

    // jsdom reports 0/0/0 for all scroll geometry, so the "scrolled up" branch is
    // UNOBSERVABLE unless the test supplies it. Without this the rule is unfalsifiable.
    Object.defineProperty(scroller, 'scrollTop', { value: 0, configurable: true });
    Object.defineProperty(scroller, 'scrollHeight', { value: 2000, configurable: true });
    Object.defineProperty(scroller, 'clientHeight', { value: 400, configurable: true });

    act(() => scroller.dispatchEvent(new Event('scroll', { bubbles: true })));
    scrollTo.mockClear();

    rerender(<MessageList messages={[first, msg({ id: 'b', text: 'two' })]} now={T0} timeZone="UTC" />);

    expect(scrollTo).toHaveBeenCalledTimes(0);
  });
});
