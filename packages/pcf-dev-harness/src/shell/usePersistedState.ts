import * as React from "react";

/**
 * `useState` backed by `localStorage` — persists dev-harness panel settings (the live-org
 * binding, theme, form factor, …) across page reloads so you don't re-enter them. Namespaced
 * by document title so different controls' harnesses don't collide on the same dev-server
 * origin. Use it ONLY for CONFIG (binding / panel settings) — never the fetched live data.
 *
 * TIER 1 of the harness: generic, copies verbatim between controls.
 */
export function usePersistedState<T>(
  key: string,
  initial: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const storageKey = `pcf-harness:${document.title}:${key}`;

  const [value, setValue] = React.useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw != null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  React.useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      /* ignore quota / unavailable */
    }
  }, [storageKey, value]);

  return [value, setValue];
}
