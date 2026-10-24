import type { IGroup } from '@fluentui/react';
import type { GroupConfig } from '../types';

/**
 * Bucket rows by `group.groupBy` into a contiguous, ordered array plus the
 * Fluent v8 `IGroup[]` describing each bucket's range. Fluent's grouped
 * DetailsList requires the items array to be ordered so each group's
 * `startIndex`/`count` is contiguous — this guarantees that. Pure + exported so
 * it's unit-testable and reusable.
 */
export function buildGroups<T extends Record<string, unknown>>(
  items: T[],
  group: GroupConfig<T>
): { orderedItems: T[]; groups: IGroup[] } {
  const buckets = new Map<string, T[]>();
  for (const it of items) {
    const v = it[group.groupBy];
    const k = v == null ? '(Blank)' : String(v);
    let arr = buckets.get(k);
    if (!arr) {
      arr = [];
      buckets.set(k, arr);
    }
    arr.push(it);
  }

  const orderedItems: T[] = [];
  const groups: IGroup[] = [];
  const showCount = group.showCount !== false;
  let start = 0;
  // ★ `Array.from` rather than iterating the Map directly: the `web-resource` target compiles at
  // `target: es5` under TypeScript 4.9, where `for…of` over a Map needs `--downlevelIteration`
  // (TS2802). The other targets are es2015+/TS 5.3 and never saw it. Same iteration order.
  for (const [k, rows] of Array.from(buckets.entries())) {
    const label = group.getGroupLabel ? group.getGroupLabel(rows[0][group.groupBy], rows) : k;
    groups.push({
      key: k,
      name: showCount ? `${label} (${rows.length})` : label,
      startIndex: start,
      count: rows.length,
      level: 0,
      isCollapsed: group.collapsedByDefault ?? false,
    });
    orderedItems.push(...rows);
    start += rows.length;
  }
  return { orderedItems, groups };
}
