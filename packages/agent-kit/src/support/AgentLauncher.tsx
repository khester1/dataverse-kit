import * as React from 'react';
import { makeStyles, mergeClasses, tokens, Badge } from '@fluentui/react-components';
import type { LauncherItem } from './types';

export interface AgentLauncherProps {
  items: readonly LauncherItem[];
  onSelect: (id: string) => void;
  /** Which edge it docks to. Default 'right'. */
  side?: 'left' | 'right';
  /** Accessible name for the group. */
  label?: string;
  /** Hide it without unmounting, so a host can keep its state. */
  hidden?: boolean;
}

const useStyles = makeStyles({
  root: {
    position: 'absolute',
    top: '30%',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
  },
  right: { right: 0, alignItems: 'flex-end' },
  left: { left: 0, alignItems: 'flex-start' },
  hidden: { display: 'none' },
  pill: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    border: 'none',
    cursor: 'pointer',
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalM}`,
    color: tokens.colorNeutralForegroundOnBrand,
    fontFamily: tokens.fontFamilyBase,
    fontSize: tokens.fontSizeBase300,
    // ★ Collapsed shows the icon only; the LABEL IS STILL IN THE DOM (see below), so the
    //   expand-on-hover is purely visual and the button is named for AT at every width.
    maxWidth: '44px',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    transitionProperty: 'max-width',
    transitionDuration: tokens.durationNormal,
    ':hover': { maxWidth: '260px' },
    ':hover .fui-launcher-label': { opacity: 1 },
    ':focus-within .fui-launcher-label': { opacity: 1 },
    // ★ :focus-within as well as :hover — a keyboard user must get the same reveal, and this is
    //   the affordance the M365 reference only shows on pointer hover.
    ':focus-within': { maxWidth: '260px' },
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '-2px' },
  },
  primary: { backgroundColor: tokens.colorBrandBackground, ':hover': { backgroundColor: tokens.colorBrandBackgroundHover, maxWidth: '260px' } },
  secondary: { backgroundColor: tokens.colorBrandBackgroundStatic, ':hover': { backgroundColor: tokens.colorBrandBackgroundStatic, maxWidth: '260px' } },
  firstRight: { borderTopLeftRadius: tokens.borderRadiusXLarge },
  lastRight: { borderBottomLeftRadius: tokens.borderRadiusXLarge },
  firstLeft: { borderTopRightRadius: tokens.borderRadiusXLarge },
  lastLeft: { borderBottomRightRadius: tokens.borderRadiusXLarge },
  // ★★ flexShrink BELONGS ON THE ICON, NOT THE TEXT. With it on the text, a collapsed 44px pill
  //   (20px of content box after padding) gave the unshrinkable label the whole width and squeezed
  //   the icon to ZERO — so the collapsed rail showed two clipped letters instead of a glyph.
  //   MEASURED on Chromatic build 18: svgWidth 0, reported as "the content is off screen".
  icon: { flexShrink: 0, display: 'flex', fontSize: '20px', lineHeight: 1 },
  // ★ The label FADES rather than relying on the clip. `overflow: hidden` cuts at the PADDING box,
  //   so a 44px pill still showed ~4px of the first letter beside the icon. Opacity keeps the label
  //   in the accessible name (see the class docstring) while hiding it from sight.
  text: {
    flexShrink: 1, minWidth: 0, opacity: 0,
    transitionProperty: 'opacity', transitionDuration: tokens.durationNormal,
    '@media (prefers-reduced-motion: reduce)': { transitionDuration: '1ms' },
  },
});

/**
 * The edge-docked entry point — the collapsed pills that expand on hover, as the M365 admin
 * centre presents "Help & support" and "Give Feedback".
 *
 * ★★ IN-TREE, and that is a measured decision rather than a stylistic one. A Fluent `Menu` costs
 *    **+185 KB and 2 `attrHandlers.set` calls** in a PCF bundle (measured 2026-09-25 against
 *    `ConversationHeader`), which is the whole tabster-singleton hazard. A stack of buttons needs
 *    none of it, so a host that embeds only the launcher needs no `targetDocument` isolation.
 *
 * ★★ THE LABEL IS ALWAYS RENDERED, never swapped in on hover. Collapsing is done with `max-width`
 *    and `overflow: hidden`, so the accessible name is identical collapsed and expanded. Revealing
 *    text on hover only — the reference behaviour — would leave a screen-reader user with an
 *    unnamed button, and `title` is not a substitute.
 */
export function AgentLauncher({
  items,
  onSelect,
  side = 'right',
  label = 'Assistant',
  hidden = false,
}: AgentLauncherProps): React.ReactElement | null {
  const styles = useStyles();
  if (items.length === 0) return null;
  return (
    <div
      className={mergeClasses(styles.root, side === 'right' ? styles.right : styles.left, hidden && styles.hidden)}
      role="group"
      aria-label={label}
    >
      {items.map((item, i) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id)}
          className={mergeClasses(
            styles.pill,
            i === 0 ? styles.primary : styles.secondary,
            i === 0 && (side === 'right' ? styles.firstRight : styles.firstLeft),
            i === items.length - 1 && (side === 'right' ? styles.lastRight : styles.lastLeft),
          )}
        >
          <span className={styles.icon} aria-hidden="true">{item.icon}</span>
          <span className={mergeClasses(styles.text, 'fui-launcher-label')}>{item.label}</span>
          {item.badgeCount ? <Badge appearance="filled" color="danger">{item.badgeCount}</Badge> : null}
        </button>
      ))}
    </div>
  );
}
