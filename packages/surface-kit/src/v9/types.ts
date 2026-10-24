// @dataverse-kit/surface-kit/v9 — canonical public prop contract for the Fluent UI v9 skin.
//
// These mirror the v8 prop shapes (`../types`) so the two skins feel like the same API,
// but every place the v8 contract leaked a Fluent-v8 type is replaced with a v9-native
// one:
//   - command items are `SurfaceToolbarItem[]` (a v9 `<Toolbar>`), not `ICommandBarItemProps[]`
//   - button/tab icons are a rendered `ReactNode` (a v9 `@fluentui/react-icons` element),
//     not a v8 `iconName` string
//   - overlay anchoring/positioning uses v9 `Popover`/`Tooltip` position names, not v8
//     `DirectionalHint` names
// The framework-agnostic scalars (sizing presets, breakpoints, density) are shared with
// the v8 layer — imported from ../core, ../responsive, ../tokens (never forked).
import type { ReactNode, ReactElement, CSSProperties, RefObject } from 'react';
import type { Breakpoint } from '../responsive/breakpoints';
import type { DialogSizePreset } from '../core/sizePresets';
import type { Density } from '../tokens/density';
import type { SurfaceLook } from '../core/ceLayout';

// --- shared -------------------------------------------------------------------

export type SurfaceVariant = 'card' | 'flat' | 'placeholder';
export type Alignment = 'left' | 'center' | 'right';

/** A single command in a v9 command surface / section header (renders a `<ToolbarButton>`). */
export interface SurfaceToolbarItem {
  id: string;
  label: string;
  /** A rendered v9 icon element (e.g. `<Save20Regular />`). */
  icon?: ReactElement;
  /** `primary` uses the brand appearance; otherwise a subtle toolbar button. */
  appearance?: 'primary' | 'subtle';
  disabled?: boolean;
  onClick?: () => void;
  /**
   * A dropdown. Without `split` the whole button opens the menu (Dynamics "Process ▾") and
   * `onClick` is ignored; with `split` the main part runs `onClick` and a separate chevron opens
   * the menu ("Connect | ▾") — in both looks; only `look="ce"` applies the measured split geometry.
   * Menu entries' own `menuItems`/`split` are not rendered (one level only).
   */
  menuItems?: SurfaceToolbarItem[];
  split?: boolean;
}

/** An action button in a v9 `ActionBar` / dialog footer. */
export interface SurfaceActionButton {
  id: string;
  label: string;
  /** A rendered v9 icon element (e.g. `<Dismiss20Regular />`). */
  icon?: ReactElement;
  /** Maps to a v9 `Button` appearance: primary → `primary`, default → `secondary`, subtle → `subtle`. */
  appearance?: 'primary' | 'default' | 'subtle';
  position?: 'left' | 'right';
  disabled?: boolean;
  hidden?: boolean;
  onClick?: () => void;
}

/** v9 overlay position (a subset of the v9 `Popover`/`Tooltip` positioning shorthand). */
export type SurfacePosition = 'above' | 'below' | 'before' | 'after';
export type SurfaceAlign = 'start' | 'center' | 'end';

// --- containers ---------------------------------------------------------------

export interface FormSurfaceProps {
  /** Outer grid column count. Default 12. Ignored under `look="ce"` (see `look`). */
  columns?: number;
  /** Grid gap in px. Default 20. Ignored under `look="ce"`. */
  gap?: number;
  /** Padding in px. Default 20; default 0 under `look="ce"`. */
  padding?: number;
  /** Spacing density: `'compact'` scales gap + padding by 0.75 and cascades to child
   *  Sections via context. Default `'comfortable'` (byte-identical to no density). */
  density?: Density;
  /** Canvas background. Default the v9 neutral-2 background (Dynamics form canvas). */
  background?: string;
  /** Container width hint (e.g. a PCF `context.allocatedWidth`) — drives stacking off the container, not the viewport. */
  containerWidth?: number;
  /**
   * Appearance family, cascaded to layouts via context: `'default'` (the kit's existing look) or
   * `'ce'` (the MEASURED Dynamics CE model-driven form: 184px label column, 48px field rows,
   * 340px tab-column floor…). Pair `'ce'` with `dynamicsCeTheme` on the `FluentProvider`.
   * Default `'default'` (renders exactly as before).
   *
   * ★ Under `'ce'` the surface is a plain BLOCK, not the 12-column grid: a Dynamics form is page
   *   chrome stacked top to bottom (command bar, header card, tab body), and its columns belong to
   *   `TabColumns`. So `columns`/`gap`/`collapseBelow` are ignored, padding defaults to 0, and its
   *   children fill the width with no `minWidth: 0` wrapper — `<FormSurface look="ce">` is all a
   *   page needs.
   */
  look?: SurfaceLook;
  /** Collapse children to full width below this breakpoint. Default `'sm'`. */
  collapseBelow?: Breakpoint;
  maxWidth?: number | string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export interface PageSurfaceProps extends FormSurfaceProps {
  /** Center the form and apply a comfortable max width. */
  centered?: boolean;
}

export interface SectionProps {
  title?: string;
  /** Span within the parent form grid. Default 12. */
  columnSpan?: number;
  columnStart?: number;
  rowPosition?: number;
  /**
   * Internal column count. Default look: the field grid's column count, default 12 (children are
   * grid cells). Under `look="ce"`: the section's formxml column count, default 1; with more than
   * one, pass ONE CHILD PER COLUMN, each holding that column's FieldRows (a dev warning fires
   * otherwise).
   */
  internalColumns?: number;
  /** Show a v9 `<Toolbar>` of `commandItems` in the section header. */
  showCommandBar?: boolean;
  commandItems?: SurfaceToolbarItem[];
  statusText?: string;
  notification?: ReactNode;
  collapsible?: boolean;
  /** Uncontrolled initial collapsed state. */
  defaultCollapsed?: boolean;
  /** Controlled collapsed state (pair with `onCollapsedChange`). */
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** `card` (default), `flat` (no shadow), or `placeholder` (empty dashed spacer). */
  variant?: SurfaceVariant;
  /** Min height for the `placeholder` variant. */
  minHeight?: number;
  /** Spacing density override; defaults to the ambient `FormSurface` density (`useDensity`).
   *  `'compact'` scales the card padding + internal field gap by 0.75. Ignored under `look="ce"`,
   *  whose spacing is measured. */
  density?: Density;
  /**
   * Appearance family; defaults to the ambient `FormSurface` look. Under `'ce'` the `card` variant
   * is the MEASURED Dynamics section: shadow4 card, 8px radius, padding 4/16/16/16, the title as
   * given (14/600/20, 4px top pad, no rule, not uppercased), and a gap-free body that pulls rows up
   * by `ceFieldRowFirstOffset`. Children are the section's `FieldRow`s; with `internalColumns > 1`
   * pass ONE CHILD PER COLUMN (Dynamics' section → columns → rows): columns are equal, with a 21px
   * gutter on every column but the last. `internalColumns` defaults to 1 under `'ce'`.
   * The collapse chevron and header commands still render under `'ce'`, but their CE geometry
   * is unmeasured, as is multi-column reflow: below the phone breakpoint CE columns stack
   * (provisional). Only the `card` variant has a CE form; `flat` and `placeholder` keep their chrome.
   */
  look?: SurfaceLook;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export interface SectionCardProps extends SectionProps {
  /** Accent color of the top border (Dynamics blue). Default the v9 brand stroke. */
  accentColor?: string;
  /** Accent top-border width in px. Default 3. */
  accentWidth?: number;
}

export interface SectionHeaderProps {
  title?: string;
  statusText?: string;
  showCommandBar?: boolean;
  commandItems?: SurfaceToolbarItem[];
  actions?: ReactNode;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
  /** Appearance family; defaults to the ambient `FormSurface` look. `'ce'` draws the measured Dynamics section title (no rule, no 48px bar). */
  look?: SurfaceLook;
}

export interface FormHeaderProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  status?: ReactNode;
  titleColor?: string;
  subtitleColor?: string;
  /** Avatar/persona shown to the left of the title (e.g. a v9 `<Avatar>` / `<Persona>`). */
  persona?: ReactNode;
  /** Right side of the header (e.g. KPI header fields). */
  actions?: ReactNode;
  className?: string;
  /**
   * Appearance family; defaults to the ambient `FormSurface` look. Under `'ce'` this is the
   * MEASURED Dynamics record header region (padding 14/20/0/20): a 40px initials avatar in a 2px
   * ring (Fluent `colorful`, hashed from `title` — which reproduces Dynamics' colour), the title at
   * 20/600/28 followed by `- {status}`, an `entityName · form switcher` row, value-over-label
   * `headerFields` separated by 1×38 dividers, the `owner` persona, and an expand chevron.
   * Render it as `PivotSurface look="ce"`'s `header` to get the header card with the tab strip.
   */
  look?: SurfaceLook;
  /** ce: the entity display name before the form switcher (e.g. `"Account"`). Falls back to `subtitle`. */
  entityName?: ReactNode;
  /** ce: the forms offered by the switcher. With fewer than two, the active form's name renders as text. */
  forms?: SurfaceFormOption[];
  activeFormId?: string;
  onFormChange?: (formId: string) => void;
  /** ce: value-over-label header fields (e.g. Annual Revenue). An empty value renders `---`. */
  headerFields?: SurfaceHeaderField[];
  /** ce: the owner persona at the end of the header fields. */
  owner?: SurfaceHeaderOwner;
  /** ce: shows the expand chevron; called when it is clicked. */
  onExpand?: () => void;
  expanded?: boolean;
  /**
   * ce: the element the title renders as. Default `'h1'` — right for a full-page record, as in
   * Dynamics; pass `'h2'` (etc.) when the header sits inside a dialog, panel or an app shell that
   * already has its own `h1`.
   */
  titleAs?: 'h1' | 'h2' | 'h3' | 'h4' | 'span';
}

/** A form offered by the record header's form switcher. */
export interface SurfaceFormOption {
  id: string;
  label: string;
}

/** A value-over-label field in the record header. */
export interface SurfaceHeaderField {
  id?: string;
  label: string;
  /** Empty (`null`/`undefined`/`''`) renders Dynamics' `---`. */
  value?: ReactNode;
}

/** The owner persona in the record header. */
export interface SurfaceHeaderOwner {
  name: string;
  /** Caption under the name. Default `"Owner"`. */
  label?: string;
  /**
   * The avatar. Default: a 32px Fluent `Avatar` with `color="colorful"` (and a presence badge when
   * `presence` is set). ★ Dynamics' owner colour does NOT follow Fluent's hash (measured: "System Administrator"
   * renders solid red #d13438; Fluent's hash gives grape), and its rule is unmeasured — pass an
   * avatar to match a specific org.
   */
  avatar?: ReactNode;
  /**
   * Presence shown on the DEFAULT avatar (ignored when `avatar` is given). No badge unless set:
   * a badge is announced to screen readers, so it must reflect real presence.
   */
  presence?: 'available' | 'away' | 'busy' | 'do-not-disturb' | 'offline' | 'out-of-office' | 'blocked' | 'unknown';
  onClick?: () => void;
}

export interface SurfaceTab {
  id: string;
  label: string;
  content: ReactNode;
  /** A rendered v9 icon element for the tab. */
  icon?: ReactElement;
  disabled?: boolean;
}

export interface PivotSurfaceProps {
  tabs: SurfaceTab[];
  selectedId?: string;
  defaultSelectedId?: string;
  onTabChange?: (id: string) => void;
  /** v9 `TabList` appearance. Default `'transparent'`. */
  appearance?: 'transparent' | 'subtle';
  /** v9 `TabList` size. Default `'medium'`. */
  size?: 'small' | 'medium' | 'large';
  className?: string;
  /**
   * Appearance family. OPT-IN: unlike most surfaces this does NOT follow the ambient `FormSurface`
   * look (it is page-level chrome; a pivot nested in a ce Section stays plain). Under `'ce'` it
   * ignores `appearance`/`size` and renders the MEASURED Dynamics header card — `header` (e.g. a `FormHeader`) above a tab strip (45px tabs,
   * 16/28 text, 20px gaps, a 3px brand underline) — then the selected tab's content BELOW the
   * card, in the tab body (16px top, 21px bottom), with the page's 8px left / 20px right insets.
   */
  look?: SurfaceLook;
  /** Rendered above the tab strip — inside the header card under `'ce'`. Icon tabs are unmeasured under `'ce'`. */
  header?: ReactNode;
}

export interface CommandSurfaceProps {
  /**
   * Appearance family. OPT-IN (does not follow the ambient `FormSurface` look): under `'ce'` this is
   * page chrome — the MEASURED Dynamics command bar card (1474×46 at 1710px; shadow4, 8px radius), 8px below the page top and
   * 16px above the header card, with the page insets (16 left / 20 right): optional back and pop-out
   * buttons each followed by a divider, then abutting 32px commands (16px icon, 7px gap, 14px REGULAR
   * label), menu (▾) and split commands, the ⋮ overflow, and `farItems` as outlined 24px buttons
   * (Share). Pass 16px Fluent icons (`*16Regular`) for commands and 20px (`*20Regular`) for farItems. Commands are NOT folded into ⋮ automatically
   * (Dynamics does, by an unmeasured rule): pass `overflowItems` explicitly.
   */
  look?: SurfaceLook;
  /** ce: shows the back button (before the first divider). */
  onBack?: () => void;
  /** ce: shows the "open in new window" button (before the second divider). */
  onPopOut?: () => void;
  items: SurfaceToolbarItem[];
  /** Rendered behind a "more" overflow menu after the primary items. */
  overflowItems?: SurfaceToolbarItem[];
  /** Right-aligned items (e.g. a settings button). */
  farItems?: SurfaceToolbarItem[];
  /** v9 `Toolbar` size. Default `'small'`. */
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export interface ActionBarProps {
  buttons: SurfaceActionButton[];
  /** Default `'right'`. */
  alignment?: Alignment;
  /** Stick to the bottom of the scroll container. Default true. */
  sticky?: boolean;
  className?: string;
}

export interface FooterProps {
  /** Default true. */
  sticky?: boolean;
  align?: Alignment;
  className?: string;
  children?: ReactNode;
}

// --- overlay surfaces ---------------------------------------------------------

/** Full form-dialog (Fluent v9 `Dialog`) with header/counter/close + sticky footer. */
export interface FormDialogSurfaceProps {
  isOpen: boolean;
  onDismiss?: () => void;
  title?: string;
  subheader?: string;
  /** Size preset (default `lg` = 1200). Explicit `width` wins. */
  size?: DialogSizePreset;
  width?: number;
  height?: number;
  /** `true` (default) is a modal dialog; `false` is non-modal. */
  isBlocking?: boolean;
  /** "X of Y" record counter in the header. */
  recordCounter?: { current: number; total: number };
  /** Footer content (e.g. an ActionBar). */
  footer?: ReactNode;
  className?: string;
  children?: ReactNode;
}

/** Generic modal (Fluent v9 `Dialog`) — lighter than FormDialogSurface. */
export interface ModalSurfaceProps {
  isOpen: boolean;
  onDismiss?: () => void;
  title?: string;
  size?: DialogSizePreset;
  width?: number;
  isBlocking?: boolean;
  /** Auto width with a 1000px min (the wide-modal pattern) instead of a fixed preset. */
  autoSize?: boolean;
  footer?: ReactNode;
  className?: string;
  children?: ReactNode;
}

/** A Dynamics side panel (Fluent v9 `OverlayDrawer`). */
export interface PanelSurfaceProps {
  isOpen: boolean;
  onDismiss?: () => void;
  title?: string;
  /** v9 Drawer size. Default derived from `width`: >500 → `medium`, else `small`. An explicit `width` renders a custom-width drawer. */
  drawerSize?: 'small' | 'medium' | 'large' | 'full';
  width?: number;
  hasCloseButton?: boolean;
  /** Dismiss on overlay click / Esc. Default true. */
  isLightDismiss?: boolean;
  /** Non-modal drawer (no blocking overlay). Default false. */
  isNonModal?: boolean;
  footer?: ReactNode;
  children?: ReactNode;
}

/** A lightweight contextual callout (Fluent v9 `Popover`) anchored to a target. */
export interface CalloutSurfaceProps {
  /** Anchor — a selector string, an element, or a ref. */
  target: string | Element | RefObject<Element> | null;
  isOpen?: boolean;
  onDismiss?: () => void;
  width?: number;
  /** v9 position relative to the target. Default `'below'`. */
  position?: SurfacePosition;
  /** v9 alignment along the position edge. Default `'start'`. */
  align?: SurfaceAlign;
  /** Show the pointing arrow. Default true. */
  isBeakVisible?: boolean;
  className?: string;
  children?: ReactNode;
}

export interface TooltipSurfaceProps {
  /** Tooltip body — what the v9 `Tooltip` renders (string or element). */
  content: string | ReactElement;
  /** v9 position relative to the child. Default `'above'`. */
  position?: SurfacePosition;
  /** Delay before showing: `zero`→0ms, `medium`→250ms, `long`→500ms. Default `medium`. */
  delay?: 'zero' | 'medium' | 'long';
  /** Whether the tooltip labels or merely describes its child (v9 `relationship`). Default `'label'`. */
  relationship?: 'label' | 'description';
  children: ReactElement;
}

// --- layouts ------------------------------------------------------------------

/** Where a field's label sits relative to its control. */
export type FieldLabelPosition = 'beside' | 'above' | 'auto';

export interface FieldRowProps {
  /**
   * The field label. Omit for a label-less control: the control then sits where a beside control
   * would, full width. (Dynamics' own label-less controls, such as the timeline, use different,
   * control-specific padding that is not modelled here.)
   */
  label?: ReactNode;
  /** Draws the required marker (`*`) after the label. */
  required?: boolean;
  /** Associates the label with the control (`<label htmlFor>`); pass the control's id. */
  htmlFor?: string;
  /**
   * `'beside'` (formxml `Left`), `'above'` (formxml `Top`), or `'auto'`: beside while the row is
   * wide enough, above when it is narrow, as Dynamics does (see CE_LABEL_ABOVE_BELOW_ROW_WIDTH —
   * the switch point is provisional). An `'auto'` row is a CSS size container, so it needs a
   * parent of definite width (not a shrink-to-fit popover or `auto` grid track).
   * Default `'auto'` under the `ce` look, `'beside'` otherwise. Under the default look `'auto'`
   * behaves as `'beside'` (with the phone stack at 480px).
   */
  labelPosition?: FieldLabelPosition;
  /** Override the label column width (px or CSS length). Default: 184 under `ce`, 130 otherwise. */
  labelWidth?: number | string;
  /** Override the ambient look for this row. */
  look?: SurfaceLook;
  className?: string;
  style?: CSSProperties;
  /**
   * ★ Rows span every column of a grid parent. Under `ce`, every row pads 12px on top; the section
   *   body pulls up by `ceFieldRowFirstOffset` so the first row sits at Dynamics' 8px —
   *   `Section look="ce"` does this for you.
   *
   * The control. Under the `ce` look use stock Fluent v9 controls with `appearance="filled-darker"`
   * (the measured field: #f5f5f5 fill, transparent border, 32px) and `placeholder="---"` for the
   * empty state, as Dynamics shows.
   */
  children?: ReactNode;
}

export interface TabColumnsProps {
  /**
   * Declared column shares, as in the formxml tab `<column width="33%">`, e.g. `[33, 42, 25]`.
   * One entry per child column. Default: equal shares.
   */
  widths?: readonly number[];
  /** Minimum rendered column width in px. Default 340 under `ce` (measured), 300 otherwise. */
  minColumnWidth?: number;
  /** Gap between columns, and between sections stacked in a column, in px. Default 16 under `ce`, 20 otherwise. */
  gap?: number;
  /** Override the ambient look. */
  look?: SurfaceLook;
  className?: string;
  style?: CSSProperties;
  /** One child per column; each child's own children are the column's stacked sections. */
  children?: ReactNode;
}
