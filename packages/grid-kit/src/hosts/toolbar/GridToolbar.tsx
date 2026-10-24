import React from 'react';
import {
  CommandBar,
  getTheme,
  ICommandBarItemProps,
  ICommandBarProps,
  IButtonStyles,
  SearchBox,
  Stack,
  Text,
} from '@fluentui/react';
import type { GridCommand, GridToolbarConfig } from '../../types';
import { gateCommands, partitionCommands, dynamicsOnlyFieldsUsed } from '../../core/toolbarCommands';
import { useContainerWidth } from '../useContainerWidth';

/**
 * Grid toolbar: a command bar (left) + optional search box (right), or with
 * `layout: 'dynamics'` the model-driven subgrid look — title left, commands
 * right-aligned, overflow into a `⋮` menu.
 *
 * The dynamics layout is for surfaces the platform does not decorate (custom pages);
 * search sits far right. Icons are the consumer's to register (`initializeIcons()` once).
 */
export const GridToolbar: React.FC<{ config: GridToolbarConfig }> = ({ config }) => {
  warnDynamicsOnlyFields(config);
  return config.layout === 'dynamics' ? (
    <DynamicsGridToolbar config={config} />
  ) : (
    <DefaultGridToolbar config={config} />
  );
};

let warnedDynamicsOnly = false;
function warnDynamicsOnlyFields(config: GridToolbarConfig): void {
  if (warnedDynamicsOnly || typeof console === 'undefined') return;
  const used = dynamicsOnlyFieldsUsed(config);
  if (!used.length) return;
  warnedDynamicsOnly = true;
  console.warn(
    `[grid-kit] GridToolbar: ${used.join(', ')} only apply with \`layout: 'dynamics'\` and are ignored by the default layout.`
  );
}

const DefaultGridToolbar: React.FC<{ config: GridToolbarConfig }> = ({ config }) => {
  const commands = gateCommands(config.commands ?? [], config.selectedCount, config.selectionGating);
  const items: ICommandBarItemProps[] = commands.map((c) => ({
    key: c.key,
    text: c.text,
    iconProps: c.iconName ? { iconName: c.iconName } : undefined,
    onClick: c.onClick,
    disabled: c.disabled,
    split: c.split,
    subMenuProps: c.subMenuProps,
  }));

  return (
    <Stack
      horizontal
      horizontalAlign="space-between"
      verticalAlign="center"
      tokens={{ childrenGap: 8 }}
      styles={{ root: { paddingBottom: 4 } }}
    >
      <Stack.Item grow>
        {items.length > 0 ? (
          <CommandBar items={items} styles={{ root: { padding: 0, height: 36 } }} />
        ) : (
          <span />
        )}
      </Stack.Item>
      {config.showSearch && (
        <SearchBox
          placeholder={config.searchPlaceholder ?? 'Search'}
          onChange={(_, v) => config.onSearch?.(v ?? '')}
          styles={{ root: { width: 240 } }}
        />
      )}
    </Stack>
  );
};

/** Height of a Dynamics subgrid command-bar button. */
const DYNAMICS_BAR_HEIGHT = 40;

/**
 * Pure mapping from a toolbar config to the `CommandBar` props of the dynamics
 * layout (tested directly; not part of the public entry). Three Fluent details it exists to get right:
 *
 * - Commands go in `items`, right-aligned by `primarySet`, never in `farItems` —
 *   CommandBar only folds PRIMARY items into overflow (the far set's overflow
 *   button is a null render), so far items would spill instead of collapsing.
 * - Every item carries a `cacheKey` that includes its label: ResizeGroup caches
 *   measured widths per key, so relabelling a command in place ("Filters (2)")
 *   would otherwise reuse the old width.
 * - Items are fresh objects on every call: CommandBar writes `renderedInOverflow`
 *   onto the items it moves, which must never land on a consumer's objects.
 */
export function buildDynamicsCommandBarProps(
  config: GridToolbarConfig,
): Pick<ICommandBarProps, 'items' | 'overflowItems' | 'farItems' | 'overflowButtonProps' | 'styles' | 'ariaLabel'> {
  const palette = getTheme().palette;
  const buttonStyles: IButtonStyles = {
    root: { backgroundColor: 'transparent', height: DYNAMICS_BAR_HEIGHT, padding: '0 8px' },
    rootHovered: { backgroundColor: palette.neutralLighter },
    rootPressed: { backgroundColor: palette.neutralLight },
    rootExpanded: { backgroundColor: palette.neutralLight },
    rootDisabled: { backgroundColor: 'transparent' },
    label: { whiteSpace: 'nowrap' },
    // Dynamics draws command icons in the neutral text colour, not the theme accent.
    icon: { color: palette.neutralPrimary },
    iconHovered: { color: palette.neutralDark },
    iconPressed: { color: palette.neutralDark },
    menuIcon: { color: palette.neutralPrimary },
  };
  const toItem = (c: GridCommand): ICommandBarItemProps => {
    // Icon-only needs an icon: CommandBar drops the text of an iconOnly item, so one
    // without an icon would render as a blank button.
    const iconOnly = (c.iconOnly ?? config.iconOnly ?? false) && !!c.iconName;
    return {
      key: c.key,
      text: c.text,
      iconProps: c.iconName ? { iconName: c.iconName } : undefined,
      onClick: c.onClick,
      disabled: c.disabled,
      split: c.split,
      subMenuProps: c.subMenuProps,
      iconOnly,
      ariaLabel: c.text,
      cacheKey: `${c.key}|${c.text}|${iconOnly ? 1 : 0}|${c.disabled ? 1 : 0}`,
      buttonStyles,
    };
  };

  const gated = gateCommands(config.commands ?? [], config.selectedCount, config.selectionGating);
  const { inline, pinnedOverflow } = partitionCommands(gated);
  const title = config.title;
  return {
    items: inline.map(toItem),
    overflowItems: pinnedOverflow.map(toItem),
    farItems: undefined,
    ariaLabel: title || 'Grid actions',
    overflowButtonProps: {
      menuIconProps: { iconName: 'MoreVertical' },
      ariaLabel: config.overflowAriaLabel ?? (title ? `More commands for ${title}` : 'More commands'),
      styles: buttonStyles,
    },
    styles: {
      root: { height: DYNAMICS_BAR_HEIGHT, padding: 0, backgroundColor: 'transparent' },
      primarySet: { justifyContent: 'flex-end' },
    },
  };
}

const DynamicsGridToolbar: React.FC<{ config: GridToolbarConfig }> = ({ config }) => {
  // ResizeGroup re-measures after every render (CommandBar rebuilds its data each
  // render), but on its own it only re-renders on a WINDOW resize. A custom-page pane,
  // a side panel or a first mount at 0px changes the container alone — observing the
  // container width re-renders on those changes, and that re-render re-measures.
  const [wrapperRef] = useContainerWidth<HTMLDivElement>();
  const props = buildDynamicsCommandBarProps(config);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        minHeight: DYNAMICS_BAR_HEIGHT,
        paddingBottom: 4,
      }}
    >
      {config.title && (
        <Text
          styles={{
            root: {
              fontSize: 14,
              fontWeight: 600,
              flex: '0 1 auto',
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            },
          }}
        >
          {config.title}
        </Text>
      )}
      {/* minWidth 0 lets the wrapper shrink below its content, so ResizeGroup sees a
          narrower container and folds commands into ⋮ instead of overflowing. */}
      <div ref={wrapperRef} style={{ flex: '1 1 0', minWidth: 0, overflow: 'hidden' }}>
        <CommandBar {...props} />
      </div>
      {config.showSearch && (
        <SearchBox
          placeholder={config.searchPlaceholder ?? 'Search'}
          onChange={(_, v) => config.onSearch?.(v ?? '')}
          styles={{ root: { width: 200, flexShrink: 0 } }}
        />
      )}
    </div>
  );
};
