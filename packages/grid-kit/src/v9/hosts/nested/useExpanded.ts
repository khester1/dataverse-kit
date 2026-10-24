/**
 * Which parent rows are expanded, plus their lazily-resolved children — shared by the inline nested
 * hosts (the default look's manual `Table` and `look="ce"`'s `NestedInlineCe`). Kept inside `src/v9`
 * so it stays out of export-engine's grid-kit vendor.
 *
 * ★ `ensure()` (the child fetch) runs in the event handler, NOT inside the state updater: an updater
 *   must be pure, and React StrictMode calls it twice.
 */
import { useCallback, useState } from 'react';
// useChildren is a Fluent-free React hook (lazy per-parent child fetch + cache) — reused verbatim
// from the v8 layer (no fork needed; it has no @fluentui import).
import { useChildren } from '../../../hosts/nested/useChildren';
import type { NestedConfig } from '../../../types';

export function useExpanded<T, C>(nested: Pick<NestedConfig<T, C>, 'getChildren' | 'reloadToken'>) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const { get, ensure } = useChildren<T, C>(nested.getChildren, nested.reloadToken);
  const toggle = useCallback(
    (key: string, item: T): void => {
      if (!expanded.has(key)) ensure(key, item);
      setExpanded((prev) => {
        const next = new Set(prev);
        if (!next.delete(key)) next.add(key);
        return next;
      });
    },
    [expanded, ensure],
  );
  return { isOpen: (key: string) => expanded.has(key), toggle, get };
}
