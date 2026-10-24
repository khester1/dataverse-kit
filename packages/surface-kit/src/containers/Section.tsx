import React, { useState } from 'react';
import { mergeStyleSets, type IStyle } from '@fluentui/react';
import type { SectionProps } from '../types';
import { colors, radius } from '../tokens/tokens';
import { scaleSpacing } from '../tokens/density';
import { BREAKPOINTS } from '../responsive/breakpoints';
import { dynamicsCardStyle, cardShadow } from '../internal/styles';
import { useDensity } from '../hooks/useDensity';
import { SectionHeader } from './SectionHeader';

// Ported + extended from reusable-components/src/ui/section/section.component.tsx.
// Same grid-positioned white card + internal N-column field grid; adds the three
// `variant`s (card/flat/placeholder), `collapsible`, and phone-stacking of the body.

/** A Dynamics-CE form section: positioned card with a header and an internal field grid. */
export const Section: React.FC<SectionProps> = ({
  title,
  columnSpan = 12,
  columnStart,
  rowPosition,
  internalColumns = 12,
  showCommandBar,
  commandBarItems,
  statusText,
  notification,
  collapsible,
  defaultCollapsed = false,
  collapsed: controlledCollapsed,
  onCollapsedChange,
  variant = 'card',
  minHeight = 80,
  density: densityProp,
  className,
  style,
  children,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const collapsed = controlledCollapsed ?? internalCollapsed;
  const toggle = () => {
    const next = !collapsed;
    if (controlledCollapsed == null) setInternalCollapsed(next);
    onCollapsedChange?.(next);
  };

  // Density: an explicit prop wins, else inherit the ambient FormSurface density.
  // `comfortable` is x1, so the padding/gap strings are byte-identical to before.
  const ctxDensity = useDensity();
  const density = densityProp ?? ctxDensity;
  const cardPad = `${scaleSpacing(3, density)}px ${scaleSpacing(20, density)}px ${scaleSpacing(20, density)}px ${scaleSpacing(20, density)}px`;
  const bodyGap = scaleSpacing(7, density);

  const gridColumn = columnStart ? `${columnStart} / span ${columnSpan}` : `span ${columnSpan}`;
  const rootStyle: React.CSSProperties = {
    gridColumn,
    ...(rowPosition ? { gridRowStart: rowPosition } : {}),
    ...style,
  };

  const styles = mergeStyleSets({
    // box-sizing:border-box so the 20px padding + 1px border are contained within
    // `width:100%` — otherwise the card renders 42px wider than its grid cell and
    // spills off the right edge (dashboards, page sections, fields inside dialogs).
    card: { ...dynamicsCardStyle, boxSizing: 'border-box', boxShadow: cardShadow, padding: cardPad, minWidth: 0, width: '100%' },
    flat: {
      background: colors.surface,
      borderRadius: radius.card,
      boxSizing: 'border-box',
      padding: cardPad,
      minWidth: 0,
      width: '100%',
      overflow: 'hidden',
    },
    placeholder: {
      border: `1px dashed ${colors.borderNeutral}`,
      borderRadius: radius.card,
      boxSizing: 'border-box',
      minHeight,
      width: '100%',
      background: 'transparent',
    },
    notification: { marginBottom: scaleSpacing(8, density) },
    body: {
      display: 'grid',
      gridTemplateColumns: `repeat(${internalColumns}, 1fr)`,
      gap: bodyGap,
      alignItems: 'start',
      selectors: {
        [`@media (max-width: ${BREAKPOINTS.sm}px)`]: { selectors: { '> *': { gridColumn: '1 / -1' } } },
      },
    } as IStyle,
  });

  if (variant === 'placeholder') {
    return <div className={[styles.placeholder, className].filter(Boolean).join(' ')} style={rootStyle} />;
  }

  const showHeader = Boolean(title) || showCommandBar || collapsible;

  return (
    <div className={[variant === 'flat' ? styles.flat : styles.card, className].filter(Boolean).join(' ')} style={rootStyle}>
      {notification && <div className={styles.notification}>{notification}</div>}
      {showHeader && (
        <SectionHeader
          title={title}
          statusText={statusText}
          showCommandBar={showCommandBar}
          commandBarItems={commandBarItems}
          collapsible={collapsible}
          collapsed={collapsed}
          onToggle={toggle}
        />
      )}
      {!collapsed && <div className={styles.body}>{children}</div>}
    </div>
  );
};

export default Section;
