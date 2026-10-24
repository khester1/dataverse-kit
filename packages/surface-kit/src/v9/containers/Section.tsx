import React, { useState } from 'react';
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import type { SectionProps } from '../types';
import { scaleSpacing } from '../../tokens/density';
import { BREAKPOINTS } from '../../responsive/breakpoints';
import { useDensity } from '../../hooks/useDensity';
import { useLook } from '../../hooks/useLook';
import { ceForm } from '../../tokens';
import { ceFieldRowFirstOffset } from '../layouts/FieldRow';
import { SectionHeader } from './SectionHeader';

// ★ look="ce" is the MEASURED Dynamics section (dynamics-ui-kit apps/ce-parity/reference):
//   shadow4 card, 8px radius, padding 4/16/16/16, the title as given, and a gap-free body that
//   pulls rows up by ceFieldRowFirstOffset so the first FieldRow sits at Dynamics' 8px. A
//   multi-column CE section takes ONE CHILD PER COLUMN (section → columns → rows, as in formxml):
//   equal columns, no gap, 21px right gutter on every column but the last (captured on a
//   formxml columns="11" section). Density is ignored under ce: its spacing is measured.

const px = (v: readonly number[]) => v.map((n) => `${n}px`).join(' ');

/** Flatten children positionally (arrays expanded, empty slots dropped), like TabColumns. */
function columnsOf(children: React.ReactNode): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const walk = (n: React.ReactNode) => {
    if (Array.isArray(n)) n.forEach(walk);
    else if (!(n === null || n === undefined || typeof n === 'boolean' || n === '')) out.push(n);
  };
  walk(children);
  return out;
}

// The Fluent v9 counterpart of the v8 Section: a grid-positioned card with a header and an
// internal N-column field grid + the three `variant`s (card/flat/placeholder), `collapsible`,
// and phone-stacking of the body. Chrome is inline (v9 theme `tokens` are CSS-var strings, so
// they stay theme-reactive); only the @media child-stacking uses griffel. Density math is the
// shared framework-agnostic layer (scaleSpacing).

const useStyles = makeStyles({
  // Phone-stack the internal field grid below `sm` (griffel — inline can't do @media).
  bodyStack: {
    [`@media (max-width: ${BREAKPOINTS.sm}px)`]: { '& > *': { gridColumn: '1 / -1' } },
  },
});

/** A Dynamics-CE form section (Fluent v9): positioned card with a header and an internal field grid. */
export const Section: React.FC<SectionProps> = ({
  title,
  columnSpan = 12,
  columnStart,
  rowPosition,
  internalColumns: internalColumnsProp,
  showCommandBar,
  commandItems,
  statusText,
  notification,
  collapsible,
  defaultCollapsed = false,
  collapsed: controlledCollapsed,
  onCollapsedChange,
  variant = 'card',
  minHeight = 80,
  density: densityProp,
  look: lookProp,
  className,
  style,
  children,
}) => {
  const styles = useStyles();
  // Default look: 12. (The ce default, 1, is resolved in the ce branch below.)
  const internalColumns = internalColumnsProp ?? 12;
  const ambientLook = useLook();
  const ce = (lookProp ?? ambientLook) === 'ce' && variant === 'card';
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const collapsed = controlledCollapsed ?? internalCollapsed;
  const toggle = () => {
    const next = !collapsed;
    if (controlledCollapsed == null) setInternalCollapsed(next);
    onCollapsedChange?.(next);
  };

  // Density: an explicit prop wins, else inherit the ambient FormSurface density.
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

  if (variant === 'placeholder') {
    const placeholderStyle: React.CSSProperties = {
      ...rootStyle,
      border: `1px dashed ${tokens.colorNeutralStroke2}`,
      borderRadius: tokens.borderRadiusMedium,
      minHeight,
      width: '100%',
      background: 'transparent',
    };
    return <div className={className} style={placeholderStyle} />;
  }

  const chrome: React.CSSProperties =
    variant === 'flat'
      ? {
          backgroundColor: tokens.colorNeutralBackground1,
          borderRadius: tokens.borderRadiusMedium,
          padding: cardPad,
          minWidth: 300,
          width: '100%',
          overflow: 'hidden',
        }
      : {
          backgroundColor: tokens.colorNeutralBackground1,
          border: `1px solid ${tokens.colorNeutralStroke2}`,
          borderRadius: tokens.borderRadiusMedium,
          boxShadow: tokens.shadow4,
          padding: cardPad,
          minWidth: 300,
          width: '100%',
          overflow: 'hidden',
        };

  const showHeader = Boolean(title) || showCommandBar || collapsible;

  if (ce) {
    // A Dynamics section is one column unless its formxml declares more.
    const n = Math.max(1, Math.round(internalColumnsProp ?? 1));
    const ceChrome: React.CSSProperties = {
      backgroundColor: tokens.colorNeutralBackground1,
      border: '1px solid transparent',
      borderRadius: tokens.borderRadiusXLarge,
      boxShadow: tokens.shadow4,
      padding: px(ceForm.section.padding),
      width: '100%',
      boxSizing: 'border-box',
    };
    const cols = n > 1 ? columnsOf(children) : null;
    // ★ Multi-column ce sections take ONE CHILD PER COLUMN. FieldRows passed straight in would each
    //   become a "column" (every row pulled up 4px, laid out across instead of down) with no error,
    //   and it is the natural thing to write when migrating from the default look's 12-column grid.
    if (cols && cols.length !== n && typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(
        `[surface-kit] Section look="ce" with internalColumns={${n}} got ${cols.length} children. ` +
          'A multi-column CE section takes ONE CHILD PER COLUMN (wrap each column\'s FieldRows in an element).',
      );
    }
    return (
      <section className={className} style={{ ...ceChrome, ...rootStyle }} data-surface-part="section" data-look="ce">
        {notification && <div>{notification}</div>}
        {showHeader && (
          <SectionHeader
            look="ce"
            title={title}
            statusText={statusText}
            showCommandBar={showCommandBar}
            commandItems={commandItems}
            collapsible={collapsible}
            collapsed={collapsed}
            onToggle={toggle}
          />
        )}
        {!collapsed &&
          (cols ? (
            // PROVISIONAL: below the phone breakpoint the columns stack (the default look's rule);
            // Dynamics' multi-column reflow is unmeasured.
            <div
              className={styles.bodyStack}
              style={{ display: 'grid', gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, alignItems: 'start' }}
              data-surface-part="section-body"
            >
              {cols.map((col, i) => (
                <div
                  key={React.isValidElement(col) && col.key != null ? col.key : `col-${i}`}
                  style={{
                    // Keyed to the COLUMN (i % n), not the list position: every column but the
                    // last carries the gutter, and only the first grid row is pulled up.
                    marginTop: i < n ? -ceFieldRowFirstOffset : 0,
                    paddingRight: i % n < n - 1 ? ceForm.section.columnGutter : 0,
                    minWidth: 0,
                  }}
                  data-surface-part="section-column"
                >
                  {col}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ marginTop: -ceFieldRowFirstOffset }} data-surface-part="section-body">
              {children}
            </div>
          ))}
      </section>
    );
  }

  const bodyStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${internalColumns}, 1fr)`,
    gap: bodyGap,
    alignItems: 'start',
  };

  return (
    <div className={className} style={{ ...chrome, ...rootStyle }}>
      {notification && <div style={{ marginBottom: scaleSpacing(8, density) }}>{notification}</div>}
      {showHeader && (
        <SectionHeader
          title={title}
          statusText={statusText}
          showCommandBar={showCommandBar}
          commandItems={commandItems}
          collapsible={collapsible}
          collapsed={collapsed}
          onToggle={toggle}
        />
      )}
      {!collapsed && (
        <div className={mergeClasses(styles.bodyStack)} style={bodyStyle}>
          {children}
        </div>
      )}
    </div>
  );
};

export default Section;
