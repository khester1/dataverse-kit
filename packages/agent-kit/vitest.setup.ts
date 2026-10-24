// jsdom lacks several APIs a chat surface touches. Polyfill them once, before any render.
//
// ★ MEASURED against this repo's jsdom 25.0.1:
//     Element.prototype.scrollIntoView : undefined
//     Element.prototype.scrollTo       : undefined
//     Element.prototype.scroll         : undefined
//     IntersectionObserver             : undefined
//     ResizeObserver / matchMedia      : undefined
//     el.scrollTop = 500 -> reads back : 500   (settable, stored, but no layout)
//     scrollHeight / clientHeight      : 0  0  (ALWAYS)
//
//   ★ Measure against the jsdom THIS PACKAGE resolves, not the root-hoisted one. They
//     differ here: the repo root hoists 20.0.3 (pinned by another package) while agent-kit
//     gets 25.0.1 from its own node_modules. The readings happen to agree, but a check run
//     from the root would have been measuring a platform these tests never touch.
//
// Two consequences a test author must know, both recorded here because they make gates
// silently vacuous rather than red:
//
//  1. The scroll methods are installed as PLAIN ASSIGNABLE FUNCTIONS, not getters, so a test
//     can `vi.spyOn(Element.prototype, 'scrollTo')`. That spy-ability is the whole mechanism
//     behind the autoscroll gate; a non-spyable polyfill makes the headline test
//     inexpressible. Install all three — the component calls `scrollTo`, and a polyfill of
//     only `scrollIntoView` would push the implementation onto `el.scrollTop = …`, which
//     works in jsdom, touches no polyfill, and makes the call counter read ZERO.
//
//  2. `scrollHeight`/`clientHeight` are permanently 0, so "the user scrolled up, do not
//     yank them back" is UNOBSERVABLE unless a test defines the geometry itself. Use
//     `defineScrollGeometry()` below, or drive the pure `shouldStickToBottom()` directly.
//     Without one of those, a component that always scrolls and one that respects the rule
//     give identical readings.
//
//  3. A stubbed IntersectionObserver never FIRES. Anything gated on it (a load-older
//     sentinel) is untestable in jsdom by construction — use the geometry route.

class NoopResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

class NoopIntersectionObserver {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds: readonly number[] = [];
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): [] {
    return [];
  }
}

const g = globalThis as Record<string, unknown>;
if (typeof g.ResizeObserver === 'undefined') g.ResizeObserver = NoopResizeObserver;
if (typeof g.IntersectionObserver === 'undefined') g.IntersectionObserver = NoopIntersectionObserver;

if (typeof window !== 'undefined' && !window.matchMedia) {
  (window as unknown as { matchMedia: (q: string) => unknown }).matchMedia = (q: string) => ({
    matches: false,
    media: q,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

for (const method of ['scrollTo', 'scroll', 'scrollIntoView'] as const) {
  if (typeof Element.prototype[method] === 'undefined') {
    Object.defineProperty(Element.prototype, method, {
      value: function noop(): void {},
      writable: true,
      configurable: true,
    });
  }
}

/**
 * Give an element real scroll geometry. jsdom reports 0 for all three, which makes every
 * scroll-position rule read as "at the bottom" and therefore unfalsifiable.
 */
export function defineScrollGeometry(
  el: Element,
  geom: { scrollTop: number; scrollHeight: number; clientHeight: number },
): void {
  for (const [k, v] of Object.entries(geom)) {
    Object.defineProperty(el, k, { value: v, writable: true, configurable: true });
  }
}
