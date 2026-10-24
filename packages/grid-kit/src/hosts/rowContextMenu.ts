import type { IContextualMenuItem } from '@fluentui/react';
import type { RowCommand } from '../types';

/**
 * Pure projection of a row's `RowCommand[]` → Fluent `ContextualMenu` items for a
 * given row. Commands whose `visible(item)` returns `false` are dropped; `disabled`
 * is resolved per row; `onClick` is bound to the row and chained with `onAfter`
 * (used by the host to dismiss the menu). No React / no rendering — unit-testable in
 * grid-kit's node test env (the type-only Fluent import has no runtime cost).
 */
export function buildRowMenuItems<T>(
  commands: RowCommand<T>[],
  item: T,
  onAfter: () => void
): IContextualMenuItem[] {
  return commands
    .filter((c) => c.visible?.(item) !== false)
    .map((c) => ({
      key: c.key,
      text: c.text,
      iconProps: c.iconName ? { iconName: c.iconName } : undefined,
      disabled: c.disabled?.(item) ?? false,
      onClick: () => {
        c.onClick(item);
        onAfter();
      },
    }));
}
