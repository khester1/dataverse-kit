// @dataverse-kit/surface-kit — canonical public prop contract.
// Prop interfaces are defined here (one place) and imported by the components.
import type { ReactNode, ReactElement, CSSProperties, RefObject } from 'react';
import type { ICommandBarItemProps } from '@fluentui/react';
import type { Breakpoint } from '../responsive/breakpoints';
import type { ColumnCount } from '../core/columns';
import type { DialogSizePreset } from '../core/sizePresets';
import type { Density } from '../tokens/density';

// --- shared -------------------------------------------------------------------

export type SurfaceVariant = 'card' | 'flat' | 'placeholder';
export type Alignment = 'left' | 'center' | 'right';

export interface SurfaceActionButton {
  id: string;
  label: string;
  iconName?: string;
  appearance?: 'primary' | 'default' | 'subtle';
  position?: 'left' | 'right';
  disabled?: boolean;
  hidden?: boolean;
  onClick?: () => void;
}

// --- layouts ------------------------------------------------------------------

export interface ColumnLayoutProps {
  columns: ColumnCount;
  /** Gap (px number or any CSS value). Default `'4px 24px'`. */
  gap?: number | string;
  /** Stack responsively (caps at 2 cols <=768, 1 col <=480). Default true. */
  responsive?: boolean;
  /** Responsive driver: viewport `@media` (default) or `@container`. */
  mode?: 'media' | 'container';
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export interface TwoColumnLayoutProps {
  gap?: number | string;
  /** Collapse to one column below this breakpoint. Default `'sm'`. */
  collapseBelow?: Breakpoint;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export interface FieldRowProps {
  label?: ReactNode;
  required?: boolean;
  /** Span both columns of a two-column grid. */
  fullWidth?: boolean;
  /** Label column width. Default `'130px'`. */
  labelWidth?: string;
  /** Label beside the control (default) or stacked above it. */
  labelPosition?: 'beside' | 'above';
  className?: string;
  children?: ReactNode;
}

// --- containers ---------------------------------------------------------------

export interface FormSurfaceProps {
  /** Outer grid column count. Default 12. */
  columns?: number;
  /** Grid gap in px. Default 20. */
  gap?: number;
  /** Padding in px. Default 20. */
  padding?: number;
  /** Spacing density: `'compact'` scales gap + padding by 0.75 and cascades to child
   *  Sections via context. Default `'comfortable'` (byte-identical to no density). */
  density?: Density;
  /** Canvas background. Default the Dynamics form canvas. */
  background?: string;
  /** Container width hint (e.g. a PCF `context.allocatedWidth`) — drives stacking off the container, not the viewport. */
  containerWidth?: number;
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
  /** Internal field-grid column count. Default 12. */
  internalColumns?: number;
  showCommandBar?: boolean;
  commandBarItems?: ICommandBarItemProps[];
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
   *  `'compact'` scales the card padding + internal field gap by 0.75. */
  density?: Density;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export interface SectionCardProps extends SectionProps {
  /** Accent color of the top border (Dynamics blue). Default brand. */
  accentColor?: string;
  /** Accent top-border width in px. Default 3. */
  accentWidth?: number;
}

export interface SectionHeaderProps {
  title?: string;
  statusText?: string;
  showCommandBar?: boolean;
  commandBarItems?: ICommandBarItemProps[];
  actions?: ReactNode;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
}

/** A Dynamics form-header field: a small label above its (usually bolder) value. */
export interface HeaderField {
  label: ReactNode;
  value: ReactNode;
}

export interface FormHeaderProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  status?: ReactNode;
  titleColor?: string;
  subtitleColor?: string;
  /** Avatar/persona shown to the left of the title. */
  persona?: ReactNode;
  /** Dynamics-style header fields (label-over-value KPI pairs, separated) shown on the
   *  right. Renders before `actions`. */
  headerFields?: HeaderField[];
  /** Right side of the header (e.g. custom controls) — rendered after `headerFields`. */
  actions?: ReactNode;
  className?: string;
}

export interface SurfaceTab {
  id: string;
  label: string;
  content: ReactNode;
  iconName?: string;
  /** Hover tooltip for the tab (shows on the label + icon via Fluent TooltipHost). */
  tooltip?: string;
  disabled?: boolean;
}

export interface PivotSurfaceProps {
  tabs: SurfaceTab[];
  selectedId?: string;
  defaultSelectedId?: string;
  onTabChange?: (id: string) => void;
  /** Fluent Pivot link format. */
  linkFormat?: 'links' | 'tabs';
  className?: string;
}

export interface CommandSurfaceProps {
  items: ICommandBarItemProps[];
  overflowItems?: ICommandBarItemProps[];
  farItems?: ICommandBarItemProps[];
  className?: string;
}

export interface ActionBarProps {
  buttons: SurfaceActionButton[];
  /** Alignment of the right button cluster (left-positioned buttons always pin left).
   *  Default `'right'`. */
  alignment?: Alignment;
  /** Reverse the right cluster's order so the primary action sits first (leftmost) —
   *  the "inverted" Dynamics footer order. Default false. */
  inverted?: boolean;
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

// --- composites ---------------------------------------------------------------

export interface MasterDetailSurfaceProps {
  master: ReactNode;
  detail: ReactNode;
  /** Rendered in the detail pane when `detail` is null/undefined. */
  detailFallback?: ReactNode;
  /** Master pane width fraction (0–1). Default 0.38. */
  splitRatio?: number;
  /** Stack master over detail below this breakpoint. Default `'md'`. */
  collapseBelow?: Breakpoint;
  className?: string;
}

export interface DashboardSurfaceProps {
  tiles: ReactNode[];
  /** Tile columns. Default 2. */
  columns?: ColumnCount;
  gap?: number;
  className?: string;
}

// --- overlay surfaces ---------------------------------------------------------

export type FluentPanelType =
  | 'smallFixedFar'
  | 'smallFixedNear'
  | 'medium'
  | 'large'
  | 'largeFixed'
  | 'extraLarge'
  | 'custom'
  | 'customNear';

export type CalloutDirection =
  | 'topLeftEdge'
  | 'topCenter'
  | 'topRightEdge'
  | 'topAutoEdge'
  | 'bottomLeftEdge'
  | 'bottomCenter'
  | 'bottomRightEdge'
  | 'bottomAutoEdge'
  | 'leftTopEdge'
  | 'leftCenter'
  | 'leftBottomEdge'
  | 'rightTopEdge'
  | 'rightCenter'
  | 'rightBottomEdge';

/** Full form-dialog (Fluent v8 Modal) with header/counter/close + sticky footer. */
export interface FormDialogSurfaceProps {
  isOpen: boolean;
  onDismiss?: () => void;
  title?: string;
  subheader?: string;
  /** Size preset (default `lg` = 1200). Explicit `width` wins. */
  size?: DialogSizePreset;
  width?: number;
  height?: number;
  isBlocking?: boolean;
  /** "X of Y" record counter in the header. */
  recordCounter?: { current: number; total: number };
  /** Footer content. Rendered **bare** (no wrapper border/padding), so pass a component
   *  that supplies its own top divider + padding + alignment — use `ActionBar` or `Footer`.
   *  Raw content (e.g. a lone `<button>`) renders flush against the body. */
  footer?: ReactNode;
  className?: string;
  children?: ReactNode;
}

/** Generic modal (Fluent v8 Modal) — lighter than FormDialogSurface. */
export interface ModalSurfaceProps {
  isOpen: boolean;
  onDismiss?: () => void;
  title?: string;
  size?: DialogSizePreset;
  width?: number;
  isBlocking?: boolean;
  /** Auto width with a 1000px min (the wide-modal pattern) instead of a fixed preset. */
  autoSize?: boolean;
  /** Footer content. Rendered **bare** (no wrapper border/padding), so pass a component
   *  that supplies its own top divider + padding + alignment — use `ActionBar` or `Footer`.
   *  Raw content (e.g. a lone `<button>`) renders flush against the body. */
  footer?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export interface PanelSurfaceProps {
  isOpen: boolean;
  onDismiss?: () => void;
  title?: string;
  /** Fluent PanelType (default derived from `width`: >500 → medium, else custom). */
  panelType?: FluentPanelType;
  width?: number;
  hasCloseButton?: boolean;
  isLightDismiss?: boolean;
  isFooterAtBottom?: boolean;
  isNonModal?: boolean;
  footer?: ReactNode;
  children?: ReactNode;
}

export interface CalloutSurfaceProps {
  /** Anchor — a selector string, an element, or a ref. */
  target: string | Element | RefObject<Element> | null;
  isOpen?: boolean;
  onDismiss?: () => void;
  width?: number;
  directionalHint?: CalloutDirection;
  isBeakVisible?: boolean;
  beakWidth?: number;
  gapSpace?: number;
  className?: string;
  children?: ReactNode;
}

export interface TooltipSurfaceProps {
  /** Tooltip body — what Fluent's TooltipHost actually renders (string or element(s)). */
  content: string | ReactElement | ReactElement[];
  directionalHint?: CalloutDirection;
  delay?: 'zero' | 'medium' | 'long';
  children: ReactElement;
}
