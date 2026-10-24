import * as React from 'react';
import { shouldStickToBottom } from '../core/scroll';

export interface StickyScroll {
  /** Put on the scrolling element. */
  onScroll: () => void;
  /** Call to jump to the bottom regardless (e.g. a "jump to latest" button). */
  scrollToBottom: () => void;
  /** False once the reader scrolls up — drives a "jump to latest" affordance. */
  isPinned: boolean;
}

/**
 * Keep a transcript pinned to the bottom — but only while the reader is already there.
 *
 * ★★ THIS CARRIES A MEASURED DEFECT FORWARD. apps/form-builder's ChatPane once keyed its
 *    scroll effect on the streaming message's CONTENT LENGTH, which queued a smooth
 *    `scrollTo` per token — often 10+ per second — and jittered the viewport. Its fix was to
 *    key on message COUNT and use `behavior: 'auto'`; both are reproduced here.
 *
 * ★★ AND IT ADDS THE HALF THAT WAS STILL MISSING. Sticking unconditionally means a reader who
 *    scrolls up to re-read something mid-stream is yanked back to the bottom on the next
 *    append. `wasPinnedRef` is sampled from SCROLL EVENTS, so it reflects where the reader
 *    was before the append, not after.
 *
 * ★ `behavior: 'auto'`, never `'smooth'`: a queued smooth scroll is what produced the
 *   jitter, and an involuntary animation is a WCAG 2.2.2 hazard besides.
 */
export function useStickyScroll(
  ref: React.RefObject<HTMLElement>,
  messageCount: number,
): StickyScroll {
  const wasPinnedRef = React.useRef(true);
  const [isPinned, setIsPinned] = React.useState(true);

  const onScroll = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const pinned = shouldStickToBottom({
      scrollTop: el.scrollTop,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    });
    wasPinnedRef.current = pinned;
    setIsPinned(pinned);
  }, [ref]);

  const scrollToBottom = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'auto' });
    wasPinnedRef.current = true;
    setIsPinned(true);
  }, [ref]);

  React.useEffect(() => {
    if (!wasPinnedRef.current) return;
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'auto' });
    // ★ messageCount ONLY. Adding the streaming text here is the original defect.
  }, [messageCount, ref]);

  return { onScroll, scrollToBottom, isPinned };
}
