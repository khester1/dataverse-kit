import { describe, it, expect } from 'vitest';
import { shouldStickToBottom, STICK_TO_BOTTOM_THRESHOLD_PX } from '../scroll';

describe('shouldStickToBottom', () => {
  const geom = (scrollTop: number) => ({ scrollTop, scrollHeight: 1000, clientHeight: 400 });
  // at the very bottom: scrollTop 600 => distance 0
  it('sticks when pinned to the bottom', () => {
    expect(shouldStickToBottom(geom(600))).toBe(true);
  });

  it('sticks at exactly the threshold', () => {
    expect(shouldStickToBottom(geom(600 - STICK_TO_BOTTOM_THRESHOLD_PX))).toBe(true);
  });

  it('does NOT stick one pixel beyond it', () => {
    expect(shouldStickToBottom(geom(600 - STICK_TO_BOTTOM_THRESHOLD_PX - 1))).toBe(false);
  });

  // ★ The row the whole rule exists for: a reader who scrolled up mid-stream must not be
  //   yanked back. In jsdom every real element reports 0/0/0, so this claim is only
  //   expressible against the pure function or with defineScrollGeometry().
  it('does NOT stick when the reader has scrolled well up', () => {
    expect(shouldStickToBottom(geom(100))).toBe(false);
  });
});
