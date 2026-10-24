import { useCallback, useEffect, useRef, useState } from 'react';

export interface ChildEntry<C> {
  loading: boolean;
  rows: C[];
  /** Set when `getChildren` threw or its promise rejected. Not cached as final: the next `ensure` retries. */
  error?: unknown;
}

/** What every nested/focused host shows in place of the child grid when `getChildren` fails. */
export const CHILDREN_LOAD_ERROR = "Couldn't load related records.";

/**
 * Normalise ANY failure to an `Error`, so "it failed" is never falsy. ★ A bare `Promise.reject()` rejects with
 * `undefined` (and `null` / `0` / `''` are legal reasons too): stored raw, those read as "no error" to a truthy
 * check — MEASURED in review: no alert, "View 0 related", cached for good. Every site tests `error !== undefined`.
 */
export function childrenError(reason: unknown): Error {
  return reason instanceof Error ? reason : new Error(`getChildren failed: ${String(reason)}`);
}

/**
 * Lazily resolves a nested grid's children per parent row. `getChildren` may
 * return a sync array or a promise; results are cached by row key. grid-kit
 * never fetches — this just normalizes the consumer-supplied resolver and tracks
 * loading. Call `ensure(key, parent)` on demand (row expand / panel open / hover).
 */
export function useChildren<T, C>(
  getChildren: (parent: T) => C[] | Promise<C[]>,
  reloadToken?: string | number
) {
  const [cache, setCache] = useState<Record<string, ChildEntry<C>>>({});
  const cacheRef = useRef(cache);
  cacheRef.current = cache;
  // Remember the parent object per cached key so a `reloadToken` bump can re-run
  // `getChildren(parent)` for already-loaded rows.
  const parentsRef = useRef<Record<string, T>>({});
  // `getChildren` accessed via a ref inside the reload effect → the effect can depend
  // on `reloadToken` alone without a stale closure or an exhaustive-deps warning.
  const getChildrenRef = useRef(getChildren);
  getChildrenRef.current = getChildren;
  // Guard against setState after unmount (e.g. host swapped while a child fetch
  // is in flight) — mirrors NestedTriggerCell / DetailPaneChildren.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const ensure = useCallback(
    (key: string, parent: T) => {
      // A failed entry is not final: expanding again retries.
      if (cacheRef.current[key] && cacheRef.current[key].error === undefined) return;
      parentsRef.current[key] = parent;
      const fail = (reason: unknown) => {
        if (mounted.current) setCache((p) => ({ ...p, [key]: { loading: false, rows: [], error: childrenError(reason) } }));
      };
      // ★ A sync throw or a rejected promise used to leave the entry `loading` forever (a spinner that never
      //   cleared) — or, for a throw, crash the host. Both now land in `error`.
      let result: C[] | Promise<C[]>;
      try {
        result = getChildren(parent);
      } catch (error) {
        fail(error);
        return;
      }
      if (Array.isArray(result)) {
        setCache((p) => ({ ...p, [key]: { loading: false, rows: result as C[] } }));
      } else {
        setCache((p) => ({ ...p, [key]: { loading: true, rows: [] } }));
        Promise.resolve(result).then((rows) => {
          if (mounted.current) setCache((p) => ({ ...p, [key]: { loading: false, rows } }));
        }, fail);
      }
    },
    [getChildren]
  );

  // Re-fetch every already-loaded parent's children when `reloadToken` changes. Compare
  // the token by VALUE (not a first-run counter) so it's safe under StrictMode's
  // double-invoke. Crucially we do NOT flip `loading: true` here — the old rows stay
  // rendered until the fresh ones land, so there's no spinner flash and (since `ensure`
  // is only re-called on expand) no perpetual spinner for an already-expanded row.
  const prevToken = useRef(reloadToken);
  useEffect(() => {
    if (reloadToken === prevToken.current) return;
    prevToken.current = reloadToken;
    for (const key of Object.keys(parentsRef.current)) {
      const parent = parentsRef.current[key];
      // A failed reload shows the error IN PLACE OF the rows (every host checks the error first); the old rows
      // are kept on the entry only so nothing downstream sees them vanish before a later reload succeeds.
      const fail = (reason: unknown) => {
        if (mounted.current) setCache((p) => ({ ...p, [key]: { loading: false, rows: p[key]?.rows ?? [], error: childrenError(reason) } }));
      };
      let result: C[] | Promise<C[]>;
      try {
        result = getChildrenRef.current(parent);
      } catch (error) {
        fail(error);
        continue;
      }
      if (Array.isArray(result)) {
        setCache((p) => ({ ...p, [key]: { loading: false, rows: result as C[] } }));
      } else {
        Promise.resolve(result).then((rows) => {
          if (mounted.current) setCache((p) => ({ ...p, [key]: { loading: false, rows } }));
        }, fail);
      }
    }
  }, [reloadToken]);

  const get = useCallback((key: string): ChildEntry<C> | undefined => cache[key], [cache]);

  // `cache` is exposed so a host can pass it through context — letting a child region
  // re-render on child-data changes even when Fluent's DetailsList caches the row.
  return { get, ensure, cache };
}
