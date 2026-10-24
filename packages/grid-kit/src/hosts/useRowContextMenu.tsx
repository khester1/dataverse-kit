import React, { useState } from 'react';
import { ContextualMenu } from '@fluentui/react';
import type { RowCommand } from '../types';
import { buildRowMenuItems } from './rowContextMenu';

/**
 * Right-click row context menu for the DetailsList-backed hosts (`DataGrid`,
 * `NestedInline`). Wire the returned `onItemContextMenu` onto `ShimmeredDetailsList`
 * and render `contextMenuElement` alongside it.
 *
 * Backward-compat: when `rowCommands` is unset/empty, `onItemContextMenu` is
 * `undefined`, so the host attaches no handler and the native browser context menu is
 * left intact for existing consumers. When set, the handler stores the clicked row +
 * the cursor event and returns `false` to suppress the native menu (Fluent calls
 * `preventDefault` unless the handler returns a truthy value — do NOT return `true`).
 */
export function useRowContextMenu<T>(rowCommands?: RowCommand<T>[]): {
  onItemContextMenu: ((item?: T, index?: number, ev?: Event) => boolean | void) | undefined;
  contextMenuElement: JSX.Element | null;
} {
  const [menu, setMenu] = useState<{ item: T; target: MouseEvent } | null>(null);
  const enabled = !!rowCommands && rowCommands.length > 0;

  const onItemContextMenu = enabled
    ? (item?: T, _index?: number, ev?: Event): boolean | void => {
        if (item == null || ev == null) return;
        setMenu({ item, target: ev as MouseEvent });
        return false; // suppress the native browser menu
      }
    : undefined;

  const contextMenuElement =
    enabled && menu ? (
      <ContextualMenu
        target={menu.target}
        items={buildRowMenuItems(rowCommands!, menu.item, () => setMenu(null))}
        onDismiss={() => setMenu(null)}
      />
    ) : null;

  return { onItemContextMenu, contextMenuElement };
}
