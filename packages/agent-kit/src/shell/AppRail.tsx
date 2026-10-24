import * as React from 'react';
import {
  Button, Menu, MenuTrigger, MenuPopover, MenuList, MenuItem, Tooltip,
  makeStyles, mergeClasses, tokens,
} from '@fluentui/react-components';
import { MoreHorizontalRegular } from '@fluentui/react-icons';
import type { RailItem } from './types';

export interface AppRailProps {
  items: readonly RailItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
  /** Items beyond this many move into the overflow menu. */
  maxVisible?: number;
  label?: string;
  footer?: React.ReactNode;
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalXS,
    padding: tokens.spacingVerticalS,
    backgroundColor: tokens.colorNeutralBackground3,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    minHeight: 0,
  },
  spacer: { flex: 1 },
  button: {
    position: 'relative',
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '1px' },
  },
  selected: { backgroundColor: tokens.colorNeutralBackground1Selected },
  badge: {
    position: 'absolute',
    top: '2px',
    right: '2px',
    minWidth: '16px',
    height: '16px',
    padding: '0 3px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorPaletteRedBackground3,
    color: tokens.colorNeutralForegroundOnBrand,
    fontSize: '10px',
    lineHeight: '16px',
  },
});

/**
 * The left icon rail.
 *
 * ★★ The overflow uses Fluent's real `Menu`, which reaches `useArrowNavigationGroup` → tabster.
 *    That is DELIBERATE, per the split-by-cost decision: a menu is a genuine APG widget (focus
 *    trap, typeahead, Escape, roving) and hand-rolling it is 100+ LOC, whereas a PCF host closes
 *    the tabster gap in one line with `targetDocument`. The coexistence spike (see CLAUDE.md)
 *    measured two cores on one window and found no double-handling, so this is safe under
 *    isolation. `Menu` is the ONE tabster-touching component in the shell.
 *
 * ★ Each rail button is its own tab stop deliberately: the rail is app-level navigation, not a
 *   composite widget, and roving it would hide destinations from a Tab-only user.
 */
export function AppRail(props: AppRailProps): React.ReactElement {
  const { items, selectedId, onSelect, maxVisible = 6, label = 'Apps', footer } = props;
  const styles = useStyles();

  const visible = items.slice(0, maxVisible);
  const overflow = items.slice(maxVisible);

  return (
    <nav className={styles.root} aria-label={label}>
      {visible.map((item) => (
        <Tooltip key={item.id} content={item.label} relationship="label" positioning="after" withArrow>
          <Button
            appearance="subtle"
            icon={item.icon}
            className={mergeClasses(styles.button, item.id === selectedId && styles.selected)}
            aria-pressed={item.id === selectedId}
            aria-label={
              item.badgeCount
                ? `${item.label}, ${item.badgeCount} unread`
                : item.label
            }
            onClick={() => onSelect(item.id)}
          >
            {item.badgeCount ? (
              <span className={styles.badge} aria-hidden="true">
                {item.badgeCount}
              </span>
            ) : null}
          </Button>
        </Tooltip>
      ))}

      {overflow.length > 0 ? (
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <Button
              appearance="subtle"
              icon={<MoreHorizontalRegular />}
              className={styles.button}
              aria-label={`More apps, ${overflow.length} hidden`}
            />
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              {overflow.map((item) => (
                <MenuItem key={item.id} icon={item.icon} onClick={() => onSelect(item.id)}>
                  {item.label}
                </MenuItem>
              ))}
            </MenuList>
          </MenuPopover>
        </Menu>
      ) : null}

      <div className={styles.spacer} />
      {footer}
    </nav>
  );
}
