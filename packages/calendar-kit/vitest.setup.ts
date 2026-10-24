// jsdom lacks the observers FullCalendar's layout code constructs. No-op stand-ins let it
// render; they never fire, so any test that depends on a measured size must set one itself.
class NoopObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): [] {
    return [];
  }
}
const g = globalThis as Record<string, unknown>;
if (typeof g.ResizeObserver === 'undefined') g.ResizeObserver = NoopObserver;
if (typeof g.IntersectionObserver === 'undefined') g.IntersectionObserver = NoopObserver;
