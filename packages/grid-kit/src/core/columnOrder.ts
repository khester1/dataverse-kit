/**
 * Column chooser state — framework-agnostic, shared by the v8 and v9 `DataGrid` (one rule, one
 * site). The chooser's state is the VISIBLE keys in display order PLUS every key it has seen.
 *
 * ★★ `known` is the fix for a shipped v8 defect: the old reconcile kept only the visible keys, so a
 *   HIDDEN key looked "new" whenever `columns` got a new identity — every PCF `updateView`, every
 *   inline `columns={[…]}` — and was re-appended as visible. Hiding a column did not survive a
 *   re-render. With `known`, "new" means "never seen", not "not currently shown".
 *
 * Host-injected display columns (key `__…`, e.g. NestedGrid's "Related" trigger) never enter the
 * state: they are not the user's to hide, are always rendered, and must not be persisted.
 */
import type { ColumnDef } from '../types';

export interface ColumnChoice {
  /** Visible column keys, in display order. */
  readonly order: readonly string[];
  /** Every column key the chooser has seen (visible or hidden). */
  readonly known: ReadonlySet<string>;
  /**
   * An `initialVisibleOrder` not yet applied because the grid had NO columns when it mounted (a PCF
   * host often mounts before its view metadata arrives). Applied on the first non-empty `columns`.
   */
  readonly pending?: readonly string[];
}

/** A host-injected display column (`__…`) — not choosable, always rendered. */
export const isHostColumnKey = (key: string): boolean => key.startsWith('__');

/** Choosable keys, de-duplicated (a duplicated key would render twice in the chooser). */
const choosableKeys = <T>(columns: ColumnDef<T>[]): string[] =>
  Array.from(new Set(columns.map((c) => c.key).filter((k) => !isHostColumnKey(k))));

/**
 * The initial choice. With `initialVisibleOrder` (e.g. a persisted user choice): its keys that
 * exist are visible in that order and every other key present now is HIDDEN. Without it: all visible.
 * ★★ Two cases the seed must survive (pr-review, #448; both measured):
 *   - NO columns yet (a PCF host mounting before its metadata): the seed is kept `pending` and applied
 *     on the first non-empty `columns` — otherwise every key arrives "never seen" and shows, and the
 *     saved choice is silently ignored.
 *   - A seed that matches NO current column (renamed / removed since it was saved): all columns show.
 *     Applying it literally would render a grid with no data columns.
 */
export function initialColumnChoice<T>(columns: ColumnDef<T>[], initialVisibleOrder?: readonly string[]): ColumnChoice {
  const keys = choosableKeys(columns);
  const present = new Set(keys);
  if (!initialVisibleOrder) return { order: keys, known: present };
  if (keys.length === 0) return { order: [], known: present, pending: initialVisibleOrder };
  const seeded = Array.from(new Set(initialVisibleOrder.filter((k) => present.has(k))));
  return { order: seeded.length > 0 ? seeded : keys, known: present };
}

/**
 * Reconcile a choice with a (possibly new) `columns` array: removed keys are dropped (from both
 * sets); never-seen keys are appended VISIBLE; hidden keys stay hidden. Returns `prev` itself when
 * nothing changed, so a new array with the same keys is a no-op (no re-render churn).
 * ★ A key that was removed and later re-added has been forgotten, so it returns VISIBLE.
 */
export function reconcileColumnChoice<T>(prev: ColumnChoice, columns: ColumnDef<T>[]): ColumnChoice {
  if (prev.pending) {
    // The seed waits for the first non-empty columns, then resolves (applied, or the all-visible fallback).
    return choosableKeys(columns).length === 0 ? prev : initialColumnChoice(columns, prev.pending);
  }
  const keys = choosableKeys(columns);
  const present = new Set(keys);
  const order = prev.order.filter((k) => present.has(k));
  for (const k of keys) if (!prev.known.has(k) && !order.includes(k)) order.push(k);
  const unchanged =
    order.length === prev.order.length &&
    order.every((k, i) => k === prev.order[i]) &&
    present.size === prev.known.size &&
    keys.every((k) => prev.known.has(k));
  return unchanged ? prev : { order, known: present };
}

/** Apply a chooser edit: the new visible order, filtered to keys that still exist (deduplicated). */
export function applyColumnOrder<T>(columns: ColumnDef<T>[], visibleOrder: readonly string[]): ColumnChoice {
  const present = new Set(choosableKeys(columns));
  return { order: Array.from(new Set(visibleOrder.filter((k) => present.has(k)))), known: present };
}

/**
 * Project a column list to its visible, ordered subset per `visibleOrder` (keys not in `columns`
 * are skipped; columns not in `visibleOrder` are hidden). Host `__…` columns are NOT choosable:
 * they are always kept, appended after the chosen ones in their original order.
 */
export function orderVisibleColumns<T = Record<string, unknown>>(
  columns: ColumnDef<T>[],
  visibleOrder: readonly string[]
): ColumnDef<T>[] {
  const byKey = new Map(columns.map((c) => [c.key, c]));
  const chosen = Array.from(new Set(visibleOrder))
    .filter((k) => !isHostColumnKey(k))
    .map((k) => byKey.get(k))
    .filter((c): c is ColumnDef<T> => !!c);
  return [...chosen, ...columns.filter((c) => isHostColumnKey(c.key))];
}
