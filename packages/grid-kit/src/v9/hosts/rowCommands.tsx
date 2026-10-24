/**
 * Row commands for the v9 flat `<DataGrid>`: the menu list shared by the right-click menu and
 * the trailing "⋯" button, and the "⋯" cell itself.
 *
 * ★ The caller filters `visible` ONCE per row and hands the same array to both surfaces — the
 *   list here never re-filters, so there is one site for the visibility rule.
 */
import React from 'react';
import {
  Button,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
} from '@fluentui/react-components';
import { MoreHorizontalRegular } from '@fluentui/react-icons';
import type { V9RowCommand } from '../types';

/** Column id of the trailing "⋯" column (`rowCommandsDisplay: 'button' | 'both'`). */
export const ROW_COMMANDS_COLUMN_ID = '__gridkit_rowCommands';

/** Rendered width of the "⋯" column: Fluent sizes the content box, and adds 8px padding a side. */
export const ROW_COMMANDS_CONTENT_WIDTH = 28;
export const ROW_COMMANDS_WIDTH = ROW_COMMANDS_CONTENT_WIDTH + 16;

/** The fixed-width style for a NON-resizable grid's "⋯" header / body / footer cell. Without it
 *  Fluent's default `flex: 1 1 0` makes the column as wide as a data column. Never apply it to a
 *  resizable grid — a cell `style` replaces Fluent's sizing style there. */
export const ROW_COMMANDS_FIXED_STYLE: React.CSSProperties = {
  flex: `0 0 ${ROW_COMMANDS_CONTENT_WIDTH}px`,
  minWidth: ROW_COMMANDS_CONTENT_WIDTH,
};

/** The `<MenuList>` of an already-filtered command array. */
export function RowCommandMenuList<T>(props: { commands: V9RowCommand<T>[]; item: T }): JSX.Element {
  const { commands, item } = props;
  return (
    <MenuList>
      {commands.map((c) => (
        <MenuItem key={c.key} icon={c.icon} disabled={c.disabled?.(item) ?? false} onClick={() => c.onClick(item)}>
          {c.text}
        </MenuItem>
      ))}
    </MenuList>
  );
}

const stop = (e: React.SyntheticEvent): void => e.stopPropagation();

/**
 * The "⋯" cell content. ★★ The wrapper, not the button, is the propagation boundary: the menu
 * popover is a PORTAL, and React bubbles a portal's synthetic events up the COMPONENT tree — so
 * a click on a menu item would otherwise reach `DataGridRow`, whose `onClick` calls `toggleRow`
 * for ANY click (it has no interactive-target check), and grid-kit's `onActiveItemChanged`.
 * Space on a `MenuItem` (a `div`, not an "interactive element") would toggle selection too.
 *
 * `onKeyDown` is stopped only when it comes from the portal: arrow keys pressed ON the button
 * must still reach the grid's composite navigation. A right-click is handled the same way: on
 * the button it reaches the row's own menu under `'both'`; inside the open popover it is
 * default-prevented, which both suppresses the browser's menu and keeps the row's
 * `openOnContext` trigger shut (it skips a defaultPrevented event) — one mechanism, not two.
 */
export function RowCommandsCell<T>(props: { commands: V9RowCommand<T>[]; item: T }): JSX.Element | null {
  const { commands, item } = props;
  if (commands.length === 0) return null;
  return (
    <div
      data-gridkit-row-commands=""
      style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}
      onClick={stop}
      onDoubleClick={stop}
      onContextMenu={(e) => {
        if (!e.currentTarget.contains(e.target as Node)) e.preventDefault();
      }}
      onKeyDown={(e) => {
        if (!e.currentTarget.contains(e.target as Node)) e.stopPropagation();
      }}
    >
      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <Button
            appearance="subtle"
            size="small"
            icon={<MoreHorizontalRegular />}
            aria-label="More commands"
            // ArrowUp/Down move between rows, not open the menu (MenuTrigger skips a
            // defaultPrevented key). Propagation is kept so the grid still sees the arrow.
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') e.preventDefault();
            }}
          />
        </MenuTrigger>
        <MenuPopover>
          <RowCommandMenuList commands={commands} item={item} />
        </MenuPopover>
      </Menu>
    </div>
  );
}
