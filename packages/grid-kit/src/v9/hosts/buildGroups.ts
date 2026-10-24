// Row bucketing for the v9 GroupedGrid — a Fluent-FREE fork of the bucketing +
// labeling logic in src/hosts/buildGroups.ts. We fork (and return an Accordion-
// friendly `{key,label,count,items}[]` shape) rather than reuse the v8 `buildGroups`,
// which produces the Fluent-v8 `IGroup[]` shape (a flattened list + start/count
// ranges for a DetailsList) and type-imports `@fluentui/react`. The bucketing +
// label semantics are identical to the v8 source; a drift-guard test asserts they
// stay in sync.
import type { GroupConfig } from '../../types';

/**
 * The key of the group a null/undefined value buckets into (also its default label). A consumer that
 * joins its own per-group data (`V9GroupedGridProps.groupAggregateResults`) keys the empty group by this.
 */
export const BLANK_GROUP_KEY = '(Blank)';

export interface V9Group<T> {
  /** Bucket key (the groupBy value as a string, or `(Blank)`). */
  key: string;
  /** Header label — the resolved group label, with `(count)` appended when `showCount`. */
  label: string;
  count: number;
  collapsed: boolean;
  items: T[];
}

/** Bucket rows by `group.groupBy` (order-preserving), resolving each group's label +
 *  count. Mirrors the v8 `buildGroups` bucketing (incl. `(Blank)` + `getGroupLabel`). */
export function bucketGroups<T extends Record<string, unknown>>(items: T[], group: GroupConfig<T>): V9Group<T>[] {
  const buckets = new Map<string, T[]>();
  for (const it of items) {
    const v = it[group.groupBy];
    const k = v == null ? BLANK_GROUP_KEY : String(v);
    let arr = buckets.get(k);
    if (!arr) {
      arr = [];
      buckets.set(k, arr);
    }
    arr.push(it);
  }

  const showCount = group.showCount !== false;
  const out: V9Group<T>[] = [];
  for (const [k, rows] of buckets) {
    const label = group.getGroupLabel ? group.getGroupLabel(rows[0][group.groupBy], rows) : k;
    out.push({
      key: k,
      label: showCount ? `${label} (${rows.length})` : label,
      count: rows.length,
      collapsed: group.collapsedByDefault ?? false,
      items: rows,
    });
  }
  return out;
}
