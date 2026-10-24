import React from 'react';
import {
  Button,
  Toolbar,
  ToolbarButton,
  ToolbarDivider,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  buttonClassNames,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowLeft20Regular,
  ChevronDown12Regular,
  ChevronDown16Regular,
  MoreHorizontal20Regular,
  MoreVertical16Regular,
  WindowNew20Regular,
} from '@fluentui/react-icons';
import type { CommandSurfaceProps, SurfaceToolbarItem } from '../types';
import { ceForm } from '../../tokens';

/** A menu of `items` behind `trigger` — shared by both looks. Nested `menuItems` are not rendered. */
function ItemMenu({ items, trigger }: { items: SurfaceToolbarItem[]; trigger: React.ReactElement }) {
  return (
    <Menu>
      <MenuTrigger disableButtonEnhancement>{trigger}</MenuTrigger>
      <MenuPopover>
        <MenuList>
          {items.map((m) => (
            <MenuItem key={m.id} icon={m.icon} disabled={m.disabled} onClick={m.onClick}>
              {m.label}
            </MenuItem>
          ))}
        </MenuList>
      </MenuPopover>
    </Menu>
  );
}

function renderToolbarButton(item: SurfaceToolbarItem): React.ReactElement {
  const button = (
    <ToolbarButton
      key={item.id}
      icon={item.icon}
      appearance={item.appearance === 'primary' ? 'primary' : 'subtle'}
      disabled={item.disabled}
      onClick={item.menuItems?.length ? undefined : item.onClick}
    >
      {item.label}
    </ToolbarButton>
  );
  if (!item.menuItems?.length) return button;
  // The default look honours `menuItems` and `split` too, so neither the menu nor a split item's
  // onClick is ever silently dropped. (Only the ce look carries the measured split geometry.)
  if (!item.split) return <ItemMenu key={item.id} items={item.menuItems} trigger={button} />;
  return (
    <React.Fragment key={item.id}>
      {React.cloneElement(button, { onClick: item.onClick })}
      <ItemMenu
        items={item.menuItems}
        trigger={
          <ToolbarButton
            appearance="subtle"
            aria-label={`More ${item.label} options`}
            icon={<ChevronDown16Regular />}
            disabled={item.disabled}
          />
        }
      />
    </React.Fragment>
  );
}

// ★ look="ce" is the MEASURED Dynamics command bar (dynamics-ui-kit
//   apps/ce-parity/reference/captures/account-main-commandbar-1710.txt, coordinates relative to
//   the card). All geometry comes from @dataverse-kit/design-tokens `ceForm.commandBar`, which the
//   reference check compares with that capture. Stock Fluent parts (Toolbar, ToolbarButton,
//   ToolbarDivider — the org's dividers ARE Fluent Dividers, #d1d1d1 — Menu, Button).
// ★ OPT-IN (`look="ce"`), like PivotSurface: it is page chrome (page insets, a card, the gap to
//   the header card), so a CommandSurface used as a toolbar inside a ce form must stay plain.

const CB = ceForm.commandBar;
// Fluent buttons keep a 1px transparent border (focus/hover); Dynamics' measured paddings INCLUDE
// the edge, so horizontal paddings/zones subtract it to land on the measured widths.
const FLUENT_BORDER = 1;
// Room for Fluent's forced-colors outline (2px, drawn outside the button) inside the clipping row.
const FOCUS_ROOM = 2;

const useStyles = makeStyles({
  root: {
    minWidth: 0,
    // Page insets (16 left / 20 right), 8px from the top, 16px gap to the header card. A class
    // (not an inline style) so a host's className can override it.
    padding: `${CB.marginTop}px ${ceForm.page.insetRight}px ${ceForm.header.marginTop}px ${ceForm.page.commandBarInsetLeft}px`,
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    minWidth: 0,
    boxSizing: 'border-box',
    height: `${CB.cardHeight}px`,
    backgroundColor: tokens.colorNeutralBackground1,
    border: '1px solid transparent',
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow4,
  },
  group: { display: 'flex', alignItems: 'center', flexShrink: 0 },
  nav: { marginLeft: `${CB.navInsetLeft}px` },
  navButton: {
    height: `${CB.buttonHeight}px`,
    minWidth: 0,
    // Fluent caps icon-only buttons at 32px; the measured back/pop-out/overflow are wider.
    maxWidth: 'none',
    padding: 0,
    flexShrink: 0,
  },
  divider: {
    flexGrow: 0,
    height: `${CB.dividerHeight}px`,
    padding: 0,
    // Measured line colour #d1d1d1 = colorNeutralStroke1 (ToolbarDivider has no `appearance`
    // prop, so the Divider's pseudo-element halves are recoloured; both sides, for RTL).
    '::before': { borderRightColor: tokens.colorNeutralStroke1, borderLeftColor: tokens.colorNeutralStroke1 },
    '::after': { borderRightColor: tokens.colorNeutralStroke1, borderLeftColor: tokens.colorNeutralStroke1 },
  },
  splitDivider: { height: `${CB.splitDividerHeight}px` },
  commands: {
    flex: '1 1 auto',
    minWidth: 0,
    columnGap: 0,
    // Commands past the edge are clipped (Dynamics folds them into ⋮ by an unmeasured rule — pass
    // overflowItems). The FOCUS_ROOM padding/negative margin keeps forced-colors outlines visible.
    overflow: 'hidden',
    padding: `${FOCUS_ROOM}px ${CB.commandsPaddingRight}px ${FOCUS_ROOM}px ${FOCUS_ROOM}px`,
    margin: `-${FOCUS_ROOM}px 0 -${FOCUS_ROOM}px -${FOCUS_ROOM}px`,
  },
  command: {
    height: `${CB.buttonHeight}px`,
    minWidth: 0,
    flexShrink: 0,
    padding: `1px ${CB.buttonPaddingX - FLUENT_BORDER}px`,
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightRegular,
    lineHeight: '21px',
    [`& .${buttonClassNames.icon}`]: {
      width: `${CB.iconSize}px`,
      height: `${CB.iconSize}px`,
      fontSize: `${CB.iconSize}px`,
      marginRight: `${CB.iconGap}px`,
    },
  },
  // Measured colours — NOT applied to primary commands, whose on-brand colours Fluent owns.
  commandColors: {
    color: tokens.colorNeutralForeground1,
    [`& .${buttonClassNames.icon}`]: { color: tokens.colorNeutralForeground2 },
  },
  menuCommand: { paddingRight: 0 },
  chevronZone: {
    display: 'inline-flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: `${CB.chevronZone - FLUENT_BORDER}px`,
    flexShrink: 0,
  },
  splitMain: { marginRight: `${CB.splitGap}px` },
  iconOnly: {
    height: `${CB.buttonHeight}px`,
    minWidth: 0,
    maxWidth: 'none',
    flexShrink: 0,
    padding: 0,
    color: tokens.colorNeutralForeground1,
  },
  far: { padding: `0 ${CB.farPadding}px` },
  farButton: {
    height: `${CB.shareHeight}px`,
    minWidth: 0,
    // Share's border is a real 1px #d1d1d1 border in Dynamics too (bl=1 alongside p=1,8).
    padding: `1px ${CB.sharePaddingX}px`,
    fontSize: `${CB.shareFontSize}px`,
    lineHeight: `${CB.shareLineHeight}px`,
    fontWeight: tokens.fontWeightRegular,
    color: tokens.colorNeutralForeground2,
    borderTopColor: tokens.colorNeutralStroke1,
    borderRightColor: tokens.colorNeutralStroke1,
    borderBottomColor: tokens.colorNeutralStroke1,
    borderLeftColor: tokens.colorNeutralStroke1,
    [`& .${buttonClassNames.icon}`]: {
      width: `${CB.shareIconSize}px`,
      height: `${CB.shareIconSize}px`,
      fontSize: `${CB.shareIconSize}px`,
      marginRight: '4px',
    },
  },
});

function CeCommandSurface({ items, overflowItems, farItems, className, onBack, onPopOut }: CommandSurfaceProps) {
  const styles = useStyles();
  // ONE site decides whether the measured neutral colours apply: primary keeps Fluent's brand colours.
  // The data attribute exposes the same decision (jsdom cannot compute griffel colours).
  const measuredColors = (item: SurfaceToolbarItem) => item.appearance !== 'primary';
  const commandClass = (item: SurfaceToolbarItem, ...extra: (string | false)[]) =>
    mergeClasses(styles.command, measuredColors(item) && styles.commandColors, ...extra);
  const commandPart = (item: SurfaceToolbarItem) => ({
    'data-surface-part': 'command',
    'data-measured-colors': measuredColors(item) ? 'true' : undefined,
  });
  const appearanceOf = (item: SurfaceToolbarItem) => (item.appearance === 'primary' ? 'primary' : 'subtle');

  const command = (item: SurfaceToolbarItem) => {
    if (item.menuItems?.length && item.split) {
      return (
        <React.Fragment key={item.id}>
          <ToolbarButton
            appearance={appearanceOf(item)}
            icon={item.icon}
            disabled={item.disabled}
            onClick={item.onClick}
            className={commandClass(item, styles.splitMain)}
            {...commandPart(item)}
          >
            {item.label}
          </ToolbarButton>
          <ToolbarDivider className={mergeClasses(styles.divider, styles.splitDivider)} />
          <ItemMenu
            items={item.menuItems}
            trigger={
              <ToolbarButton
                appearance="subtle"
                aria-label={`More ${item.label} options`}
                icon={<ChevronDown16Regular />}
                disabled={item.disabled}
                className={styles.iconOnly}
                // The chevron renders chevronZone wide but its SLOT is overhang narrower (measured).
                style={{ width: CB.chevronZone, marginRight: -CB.splitChevronOverhang }}
                data-surface-part="command-split-chevron"
              />
            }
          />
        </React.Fragment>
      );
    }
    if (item.menuItems?.length) {
      return (
        <ItemMenu
          key={item.id}
          items={item.menuItems}
          trigger={
            <ToolbarButton
              appearance={appearanceOf(item)}
              icon={item.icon}
              disabled={item.disabled}
              className={commandClass(item, styles.menuCommand)}
              {...commandPart(item)}
            >
              {item.label}
              <span className={styles.chevronZone} aria-hidden="true">
                <ChevronDown12Regular />
              </span>
            </ToolbarButton>
          }
        />
      );
    }
    return (
      <ToolbarButton
        key={item.id}
        appearance={appearanceOf(item)}
        icon={item.icon}
        disabled={item.disabled}
        onClick={item.onClick}
        className={commandClass(item)}
        {...commandPart(item)}
      >
        {item.label}
      </ToolbarButton>
    );
  };

  return (
    <div className={mergeClasses(styles.root, className)} data-surface-part="command-bar" data-look="ce">
      <div className={styles.card} data-surface-part="command-card">
        {(onBack || onPopOut) && (
          <div role="group" aria-label="Navigation" className={mergeClasses(styles.group, styles.nav)} data-surface-part="command-nav">
            {onBack && (
              <>
                <Button
                  appearance="subtle"
                  icon={<ArrowLeft20Regular />}
                  aria-label="Back"
                  onClick={onBack}
                  className={styles.navButton}
                  style={{ width: CB.backWidth }}
                  data-surface-part="command-back"
                />
                <ToolbarDivider className={styles.divider} />
              </>
            )}
            {onPopOut && (
              <>
                <Button
                  appearance="subtle"
                  icon={<WindowNew20Regular />}
                  aria-label="Open in new window"
                  onClick={onPopOut}
                  className={styles.navButton}
                  style={{ width: CB.popOutWidth }}
                  data-surface-part="command-popout"
                />
                <ToolbarDivider className={styles.divider} />
              </>
            )}
          </div>
        )}
        <Toolbar aria-label="Commands" className={styles.commands} data-surface-part="command-list">
          {items.map(command)}
          {overflowItems && overflowItems.length > 0 && (
            <ItemMenu
              items={overflowItems}
              trigger={
                <ToolbarButton
                  appearance="subtle"
                  aria-label="More commands"
                  icon={<MoreVertical16Regular />}
                  className={styles.iconOnly}
                  style={{ width: CB.overflowWidth }}
                  data-surface-part="command-overflow"
                />
              }
            />
          )}
        </Toolbar>
        {farItems && farItems.length > 0 && (
          <div role="group" aria-label="Secondary commands" className={mergeClasses(styles.group, styles.far)} data-surface-part="command-far">
            {farItems.map((f) => {
              const btn = (
                <Button
                  key={f.id}
                  appearance="outline"
                  icon={f.icon}
                  disabled={f.disabled}
                  onClick={f.menuItems?.length ? undefined : f.onClick}
                  className={styles.farButton}
                  data-surface-part="command-far-button"
                >
                  {f.label}
                  {f.menuItems?.length ? <ChevronDown12Regular style={{ marginLeft: 4 }} aria-hidden /> : null}
                </Button>
              );
              return f.menuItems?.length ? <ItemMenu key={f.id} items={f.menuItems} trigger={btn} /> : btn;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** A Dynamics-style command bar (Fluent v9 `Toolbar`), with an optional overflow menu + far items. */
export const CommandSurface: React.FC<CommandSurfaceProps> = (props) => {
  if (props.look === 'ce') return <CeCommandSurface {...props} />;

  const { items, overflowItems, farItems, size = 'small', className } = props;
  const hasFar = Boolean(farItems && farItems.length > 0);
  const hasOverflow = Boolean(overflowItems && overflowItems.length > 0);

  const hasPrimary = items.length > 0 || hasOverflow;

  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {hasPrimary && (
        <Toolbar aria-label="Commands" size={size}>
          {items.map(renderToolbarButton)}
          {hasOverflow && (
            <Menu>
              <MenuTrigger disableButtonEnhancement>
                <ToolbarButton aria-label="More commands" icon={<MoreHorizontal20Regular />} />
              </MenuTrigger>
              <MenuPopover>
                <MenuList>
                  {overflowItems!.map((item) => (
                    <MenuItem key={item.id} icon={item.icon} disabled={item.disabled} onClick={item.onClick}>
                      {item.label}
                    </MenuItem>
                  ))}
                </MenuList>
              </MenuPopover>
            </Menu>
          )}
        </Toolbar>
      )}
      {hasFar && (
        // marginLeft:auto keeps far items right-aligned whether or not a primary toolbar renders.
        <Toolbar aria-label="Secondary commands" size={size} style={{ marginLeft: 'auto' }}>
          {farItems!.map(renderToolbarButton)}
        </Toolbar>
      )}
    </div>
  );
};

export default CommandSurface;
