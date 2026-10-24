/**
 * The `layout: 'dynamics'` v9 grid toolbar — title left, commands right-aligned,
 * commands that do not fit fold into a `⋮` menu (Fluent `Overflow`), search far right.
 *
 * Internal to `GridToolbar`; not exported from the v9 barrel.
 */
import React from 'react';
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Overflow,
  OverflowItem,
  SearchBox,
  Text,
  Toolbar,
  ToolbarButton,
  Tooltip,
  makeStyles,
  useIsOverflowItemVisible,
  tokens,
  buttonClassNames,
  menuButtonClassNames,
  mergeClasses,
  useOverflowMenu,
  useRestoreFocusTarget,
  type InputOnChangeData,
  type ToolbarButtonProps,
  type SearchBoxChangeEvent,
} from '@fluentui/react-components';
import { MoreVertical20Regular } from '@fluentui/react-icons';
import { ceForm } from '@dataverse-kit/design-tokens';
import { gateCommands, partitionCommands } from '../../core/toolbarCommands';
import type { V9GridCommand, V9GridToolbarConfig } from '../types';

/** Fluent's icon slot on a `medium` toolbar button (the size the ce toolbar uses). */
const CE_ICON_SLOT = 20;
const CE = ceForm.subgrid;
/** look="ce" for every button in the toolbar (inline commands and both ⋮), without prop drilling. */
const CeLook = React.createContext(false);

/** Overflow id of the pinned-commands `⋮` (never a command key: commands are listed by key). */
const PINNED_MENU_ID = '__gridkit_pinned_menu__';

/** A command's menu entries, as a `MenuList` body. */
const menuItemsOf = (command: V9GridCommand): JSX.Element[] =>
  (command.menuItems ?? []).map((m) => (
    <MenuItem key={m.key} icon={m.icon} disabled={m.disabled} onClick={m.onClick}>
      {m.text}
    </MenuItem>
  ));

const useStyles = makeStyles({
  // Overflow hides an item with `[data-overflowing] { display: none }` (class + attribute).
  // This single-class rule loses to it on specificity — an INLINE display would win and
  // leave an overflowed command visible.
  item: { display: 'inline-flex' },
  // look="ce" (ceForm.subgrid, measured on a stock subgrid): 42px commands, 14px horizontal padding
  // (13 + Fluent's 1px transparent border), 14px REGULAR labels — Fluent buttons default to semibold.
  ceCommand: {
    minHeight: `${CE.commandHeight}px`,
    paddingLeft: `${CE.commandPaddingX - 1}px`,
    paddingRight: `${CE.commandPaddingX - 1}px`,
    columnGap: 0,
    fontWeight: tokens.fontWeightRegular,
    // The label lands `commandLabelOffset` (44) from the button's edge: padding 14 + the medium
    // button's 20px icon slot + this margin (Fluent's own 6px icon margin is replaced, not added
    // to — measured: keeping both put the label at 50). The icon box itself is unmeasured.
    [`& .${buttonClassNames.icon}`]: { marginRight: `${CE.commandLabelOffset - CE.commandPaddingX - CE_ICON_SLOT}px` },
  },
  // "Flow ▾": no right padding; the label is followed by a `menuChevronZone` (30) holding the ▾.
  ceMenuCommand: {
    paddingRight: 0,
    [`& .${menuButtonClassNames.menuIcon}`]: {
      marginLeft: 0,
      width: `${CE.menuChevronZone - 1}px`,
      display: 'flex',
      justifyContent: 'center',
    },
  },
  // ⋮, and any ICON-ONLY command: Fluent gives an icon-only button no icon margin and a 32px
  // max-width, so the labelled padding/margin above would push its icon ~5px off-centre. The
  // measured ⋮ box (44×42, padding 0) is used for both; `min-width` beats Fluent's `max-width`.
  ceMore: { minWidth: `${CE.overflowWidth}px`, width: `${CE.overflowWidth}px`, minHeight: `${CE.commandHeight}px`, padding: 0 },
});

/** One inline command: an overflow-tracked toolbar button, a menu button, and/or tooltip. */
type InlineCommandProps = { command: V9GridCommand; priority: number; toolbarIconOnly: boolean };
const NO_ATTRS = {};
// The restore-target hook runs only for a command that asked for it (`restoreFocusTarget`).
const InlineCommand: React.FC<InlineCommandProps> = (props) =>
  props.command.restoreFocusTarget ? <RestoringInlineCommand {...props} /> : <InlineCommandBody {...props} restoreAttrs={NO_ATTRS} />;
const RestoringInlineCommand: React.FC<InlineCommandProps> = (props) => (
  <InlineCommandBody {...props} restoreAttrs={useRestoreFocusTarget()} />
);

const InlineCommandBody: React.FC<InlineCommandProps & { restoreAttrs: object }> = ({
  command,
  priority,
  toolbarIconOnly,
  restoreAttrs,
}) => {
  const styles = useStyles();
  const ce = React.useContext(CeLook);
  const iconOnly = command.iconOnly ?? toolbarIconOnly;
  const appearance = command.appearance === 'primary' ? 'primary' : 'subtle';
  const label = iconOnly && command.icon ? undefined : command.text;
  // Labelled ce commands get the measured padding/label offset; icon-only ones the ⋮ box.
  const buttonClassName = !ce
    ? undefined
    : label === undefined
      ? styles.ceMore
      : mergeClasses(styles.ceCommand, command.menuItems && styles.ceMenuCommand);
  // An icon-only button names itself with aria-label — the ONE source of its name. The
  // tooltip is visual only ('inaccessible'), so the name is not stated twice and does
  // not depend on the tooltip reaching the button.
  const name = label === undefined ? command.text : undefined;
  const withTooltip = (button: React.ReactElement): React.ReactElement =>
    label === undefined ? (
      <Tooltip content={command.text} relationship="inaccessible">
        {button}
      </Tooltip>
    ) : (
      button
    );
  // The Tooltip sits INSIDE MenuTrigger: Tooltip is a trigger component and passes the
  // menu's props through, whereas Menu is not — a Tooltip wrapped around <Menu> would
  // hand its label to an element that discards it.
  const control: React.ReactElement = command.menuItems ? (
    // A menu command shows the ▾ chevron (Dynamics' "Flow ▾").
    <Menu>
      <MenuTrigger disableButtonEnhancement>
        {withTooltip(
          <MenuButton icon={command.icon} appearance={appearance} disabled={command.disabled} aria-label={name} className={buttonClassName} {...restoreAttrs}>
            {label}
          </MenuButton>
        )}
      </MenuTrigger>
      <MenuPopover>
        <MenuList>{menuItemsOf(command)}</MenuList>
      </MenuPopover>
    </Menu>
  ) : (
    withTooltip(
      <ToolbarButton
        icon={command.icon}
        appearance={appearance}
        disabled={command.disabled}
        onClick={command.onClick}
        aria-label={name}
        className={buttonClassName}
        {...restoreAttrs}
      >
        {label}
      </ToolbarButton>
    )
  );
  // OverflowItem targets a real element that CONTAINS the trigger chain. Nesting it
  // inside MenuTrigger / Tooltip instead relies on it passing their props through,
  // which it only does in newer react-overflow — at the ^9.46.2 peer floor
  // (react-overflow 9.1.9) it drops them, and the menu would never open.
  return (
    <OverflowItem id={command.key} priority={priority}>
      <span className={styles.item}>{control}</span>
    </OverflowItem>
  );
};

/** A command as an entry of the `⋮` menu (a submenu when it has `menuItems`). */
const CommandMenuItem: React.FC<{ command: V9GridCommand }> = ({ command }) => {
  if (!command.menuItems) {
    return (
      <MenuItem icon={command.icon} disabled={command.disabled} onClick={command.onClick}>
        {command.text}
      </MenuItem>
    );
  }
  return (
    <Menu>
      <MenuTrigger disableButtonEnhancement>
        <MenuItem icon={command.icon} disabled={command.disabled}>
          {command.text}
        </MenuItem>
      </MenuTrigger>
      <MenuPopover>
        <MenuList>{menuItemsOf(command)}</MenuList>
      </MenuPopover>
    </Menu>
  );
};

/** Listed in `⋮` only while its inline button is overflowed (a component: it calls a hook). */
const OverflowedCommand: React.FC<{ command: V9GridCommand }> = ({ command }) =>
  useIsOverflowItemVisible(command.key) ? null : <CommandMenuItem command={command} />;

// ★ Forwards every prop: MenuTrigger passes its click/aria/ref props TO this component, and a
//   wrapper that keeps only its own props leaves a ⋮ that never opens.
// `restore`: a folded command's menu item unmounts on click, so the ⋮ is the focus-restore target
// for any command that asked for one (`V9GridCommand.restoreFocusTarget`).
type MoreButtonBaseProps = ToolbarButtonProps & { ariaLabel: string };
const MoreButtonBody = React.forwardRef<HTMLButtonElement, MoreButtonBaseProps & { restoreAttrs: object }>(
  ({ ariaLabel, className, restoreAttrs, ...rest }, ref) => {
    const styles = useStyles();
    const ce = React.useContext(CeLook);
    return (
      <ToolbarButton
        {...rest}
        {...restoreAttrs}
        ref={ref}
        appearance="subtle"
        icon={<MoreVertical20Regular />}
        aria-label={ariaLabel}
        className={mergeClasses(className, ce && styles.ceMore)}
      />
    );
  }
);
MoreButtonBody.displayName = 'MoreButtonBody';
// The restore-target hook only when a flagged command can fold into this ⋮.
const RestoringMoreButton = React.forwardRef<HTMLButtonElement, MoreButtonBaseProps>((props, ref) => (
  <MoreButtonBody {...props} ref={ref} restoreAttrs={useRestoreFocusTarget()} />
));
RestoringMoreButton.displayName = 'RestoringMoreButton';
const MoreButton = React.forwardRef<HTMLButtonElement, MoreButtonBaseProps & { restore?: boolean }>(({ restore, ...props }, ref) =>
  restore ? <RestoringMoreButton {...props} ref={ref} /> : <MoreButtonBody {...props} ref={ref} restoreAttrs={NO_ATTRS} />
);
MoreButton.displayName = 'MoreButton';

/**
 * The `⋮` Fluent manages: shown only while something is auto-hidden, listing the hidden commands
 * and then the pinned ones.
 */
const OverflowMenu: React.FC<{ inline: V9GridCommand[]; pinned: V9GridCommand[]; ariaLabel: string }> = ({
  inline,
  pinned,
  ariaLabel,
}) => {
  const { ref, isOverflowing } = useOverflowMenu<HTMLButtonElement>();
  if (!isOverflowing) return null;
  const restore = [...inline, ...pinned].some((c) => c.restoreFocusTarget);
  return (
    <Menu>
      <MenuTrigger disableButtonEnhancement>
        <MoreButton ref={ref} ariaLabel={ariaLabel} restore={restore} />
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          {inline.map((c) => (
            <OverflowedCommand key={c.key} command={c} />
          ))}
          {pinned.map((c) => (
            <CommandMenuItem key={c.key} command={c} />
          ))}
        </MenuList>
      </MenuPopover>
    </Menu>
  );
};

/**
 * The `⋮` for PINNED commands while nothing is auto-hidden — an ordinary overflow item with the
 * LOWEST priority, so it is the first thing to fold when space runs out, and at that exact moment
 * Fluent's own `⋮` (above) appears in the same box (32px; 44px under look="ce" — both buttons). The width is therefore counted once in both
 * states. (Reserving it through `Overflow`'s padding instead counts it twice once something
 * auto-hides — measured to fold the last visible command at 330px — and switching the padding
 * re-creates the overflow manager, which loops.)
 */
const PinnedMenu: React.FC<{ pinned: V9GridCommand[]; ariaLabel: string }> = ({ pinned, ariaLabel }) => {
  const styles = useStyles();
  return (
    <OverflowItem id={PINNED_MENU_ID} priority={0}>
      <span className={styles.item}>
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <MoreButton ariaLabel={ariaLabel} restore={pinned.some((c) => c.restoreFocusTarget)} />
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              {pinned.map((c) => (
                <CommandMenuItem key={c.key} command={c} />
              ))}
            </MenuList>
          </MenuPopover>
        </Menu>
      </span>
    </OverflowItem>
  );
};

export const DynamicsGridToolbar: React.FC<{ config: V9GridToolbarConfig; look?: 'default' | 'ce' }> = ({ config, look }) => {
  const { title, showSearch, searchPlaceholder, onSearch } = config;
  const gated = gateCommands(config.commands ?? [], config.selectedCount, config.selectionGating);
  const { inline, pinnedOverflow } = partitionCommands(gated);
  const overflowLabel = config.overflowAriaLabel ?? (title ? `More commands for ${title}` : 'More commands');
  const ce = look === 'ce';
  const commands = (
    <CeLook.Provider value={ce}>
    <Overflow>
      <Toolbar
        size={ce ? 'medium' : 'small'}
        aria-label={title || 'Grid actions'}
        style={{ flex: '1 1 0', minWidth: 0, justifyContent: 'flex-end', overflow: 'hidden', ...(ce ? { padding: 0 } : {}) }}
      >
        {inline.map((c, i) => (
          // Higher priority overflows later: the LAST command folds into ⋮ first.
          <InlineCommand key={c.key} command={c} priority={inline.length - i} toolbarIconOnly={!!config.iconOnly} />
        ))}
        {pinnedOverflow.length > 0 && <PinnedMenu pinned={pinnedOverflow} ariaLabel={overflowLabel} />}
        <OverflowMenu inline={inline} pinned={pinnedOverflow} ariaLabel={overflowLabel} />
      </Toolbar>
    </Overflow>
    </CeLook.Provider>
  );
  const titleText = title && (
    <Text
      weight="semibold"
      size={300}
      wrap={false}
      truncate
      style={{ flex: '0 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}
    >
      {title}
    </Text>
  );
  const search = (width: number, extra?: React.CSSProperties) =>
    showSearch && (
      <SearchBox
        placeholder={searchPlaceholder ?? 'Search'}
        onChange={(_e: SearchBoxChangeEvent, data: InputOnChangeData) => onSearch?.(data.value)}
        style={{ width, flexShrink: 0, ...extra }}
      />
    );

  if (ce) {
    // The stock subgrid (ceForm.subgrid): commands on one 42px row, `commandsOffsetTop` below the
    // grid's top; quick find on its OWN row under them, right-aligned `quickFindInsetRight` in;
    // the header then starts `gridOffsetTop` below the top. Without quick find the gap under the
    // commands is not measured, so the same 7px is kept.
    const S = ceForm.subgrid;
    const afterCommands = S.quickFindOffsetTop - S.commandHeight; // 7
    const afterSearch = S.gridOffsetTop - S.commandsOffsetTop - S.quickFindOffsetTop - S.quickFindHeight; // 3
    const hasCommandRow = !!title || inline.length > 0 || pinnedOverflow.length > 0;
    if (!hasCommandRow && !showSearch) return null;
    return (
      <div data-gridkit-toolbar="ce" style={{ display: 'flex', flexDirection: 'column', paddingTop: S.commandsOffsetTop }}>
        {hasCommandRow && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: S.commandHeight, paddingRight: S.commandsInsetRight }}>
            {titleText}
            {commands}
          </div>
        )}
        {showSearch ? (
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: afterCommands, paddingBottom: afterSearch, paddingRight: S.quickFindInsetRight }}>
            {search(S.quickFindWidth, { height: S.quickFindHeight, boxSizing: 'border-box' })}
          </div>
        ) : (
          <div style={{ height: afterCommands }} />
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 40, paddingBottom: 4 }}>
      {titleText}
      {commands}
      {search(200)}
    </div>
  );
};
