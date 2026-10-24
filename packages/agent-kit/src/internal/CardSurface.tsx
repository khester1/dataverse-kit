import * as React from 'react';
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';

export interface CardSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Renders a highlighted edge — used by ApprovalCard while a decision is pending. */
  emphasis?: 'none' | 'attention';
  children?: React.ReactNode;
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    padding: tokens.spacingVerticalM,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    boxShadow: tokens.shadow2,
  },
  attention: { borderLeft: `3px solid ${tokens.colorBrandStroke1}` },
});

/**
 * The in-tree replacement for Fluent's `Card`.
 *
 * ★★ Fluent's `Card` calls `useFocusableGroup()` UNCONDITIONALLY — `react-card/useCard.js:66`,
 *    a hook call, so the `shouldApplyFocusAttributes` guard below it only decides whether the
 *    ATTRIBUTES are applied, not whether the hook runs. That reaches `getGroupper` and
 *    `core.attrHandlers.set`, which throws against a Dynamics form's tabster (8.2.0, no
 *    `attrHandlers`) and unmounts the whole React tree.
 *
 * ★★ It is also the single easiest thing in this kit to get wrong: `Card` is the obvious
 *    import for anything card-shaped, the estate's closest existing v9 chat component wraps
 *    its ENTIRE surface in one, and the canonical grep in the PCF standard
 *    (`useArrowNavigationGroup|useModalAttributes|useRestoreFocus`) does not find `react-card`
 *    because it omits `useFocusableGroup`. eslint bans `Card` by name outside this directory.
 *
 * ★ What is lost is Groupper's "card is one tab stop, Enter to enter, Escape to exit". The
 *   cards here hold at most a couple of buttons, so the plain tab order is correct and
 *   cheaper; if a card ever holds many controls, revisit rather than reaching for `Card`.
 */
export const CardSurface = React.forwardRef<HTMLDivElement, CardSurfaceProps>(
  function CardSurface({ emphasis = 'none', className, children, ...rest }, ref) {
    const styles = useStyles();
    return (
      <div
        ref={ref}
        className={mergeClasses(styles.root, emphasis === 'attention' && styles.attention, className)}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
