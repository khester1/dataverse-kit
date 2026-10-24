import * as React from 'react';
import { makeStyles, tokens, Button } from '@fluentui/react-components';
import { NavigationRegular } from '@fluentui/react-icons';
import { BREAKPOINTS, resolveBreakpoint, useContainerWidth } from '@dataverse-kit/surface-kit/v9';

export interface AgentAppShellProps {
  /** The left icon rail. Hidden below `sm`. */
  rail?: React.ReactNode;
  /** The conversation list. Collapses to an overlay below `md`. */
  sidebar?: React.ReactNode;
  /** The conversation header, above the main region. */
  header?: React.ReactNode;
  /** The transcript + composer. */
  children?: React.ReactNode;
  /** The detail pane. Hidden below `lg` — the consumer decides what to do with it there. */
  rightPane?: React.ReactNode;
  sidebarWidth?: number;
  /**
   * Drive the layout from a KNOWN width instead of measuring.
   *
   * ★ Mirrors `FormSurface.containerWidth` in surface-kit/v9, and exists for the same reason: a
   *   PCF host already knows its `context.allocatedWidth`, so making it wait for a
   *   ResizeObserver round-trip is a needless reflow. It is also what makes the collapse
   *   TESTABLE — jsdom's ResizeObserver is a stub that never fires, so a measured width stays 0
   *   forever and only the roomy branch would ever run.
   */
  containerWidth?: number;
  /** Controlled sidebar visibility on narrow widths. */
  sidebarOpen?: boolean;
  onSidebarOpenChange?: (open: boolean) => void;
  label?: string;
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    height: '100%',
    minHeight: 0,
    backgroundColor: tokens.colorNeutralBackground2,
    position: 'relative',
    overflow: 'hidden',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  // Below `md` the list overlays the conversation instead of shrinking it to nothing.
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 2,
    boxShadow: tokens.shadow16,
  },
  scrim: { position: 'absolute', inset: '0', zIndex: 1, backgroundColor: tokens.colorBackgroundOverlay },
  main: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 },
  body: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' },
  toggle: { position: 'absolute', top: tokens.spacingVerticalS, left: tokens.spacingHorizontalS, zIndex: 3 },
});

/**
 * The Teams-like frame: rail │ list │ conversation │ detail pane.
 *
 * ★★ BOUNDARY WITH surface-kit, in one sentence: **surface-kit owns record/form geometry;
 *    agent-kit owns conversation geometry.** `FormSurface`/`Section`/`PivotSurface` are for a
 *    Dataverse record; this is for a thread. `MasterDetailSurface` is not this — it is v8-only
 *    and two-pane. When surface-kit's deferred v9 composites land, this row is the one to check
 *    for overlap.
 *
 * ★★ IT IS NOT A SECOND BREAKPOINT AUTHORITY. The cutoffs come from
 *    `@dataverse-kit/surface-kit/v9` (`BREAKPOINTS`, `resolveBreakpoint`), which surface-kit's
 *    CLAUDE.md states as an invariant: "every responsive stacking decision flows through
 *    responsive/builders.ts". Redeclaring 480/768 here is how two files start disagreeing.
 *
 * ★ It measures its CONTAINER, not the viewport (`useContainerWidth`). A PCF control or a
 *   custom page occupies a pane, not a window — `context.allocatedWidth`, not `window.innerWidth`
 *   — so a viewport media query would collapse the wrong way in the host this kit targets.
 */
export function AgentAppShell(props: AgentAppShellProps): React.ReactElement {
  const {
    rail, sidebar, header, children, rightPane,
    sidebarWidth = 280, sidebarOpen, onSidebarOpenChange, label = 'Agent workspace',
  } = props;
  const styles = useStyles();

  const [containerRef, measuredWidth] = useContainerWidth<HTMLDivElement>();
  // ★ `useContainerWidth` starts at 0 and stays 0 until a ResizeObserver entry lands — so 0
  //   means NOT YET MEASURED, not "zero pixels wide". Treating it as a real width would collapse
  //   the whole shell on first paint and expand it a frame later, which is a visible jolt.
  //   An explicit `containerWidth` wins outright.
  const width = props.containerWidth ?? (measuredWidth > 0 ? measuredWidth : undefined);
  const effective = width ?? BREAKPOINTS.xl;
  const breakpoint = resolveBreakpoint(effective);

  const railVisible = effective >= BREAKPOINTS.sm;
  const sidebarInline = effective >= BREAKPOINTS.md;
  const rightPaneVisible = effective >= BREAKPOINTS.lg;

  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const overlayOpen = sidebarOpen ?? uncontrolledOpen;
  const setOverlayOpen = (open: boolean) => {
    onSidebarOpenChange?.(open);
    if (sidebarOpen === undefined) setUncontrolledOpen(open);
  };

  return (
    <div ref={containerRef} className={styles.root} data-breakpoint={breakpoint} aria-label={label}>
      {rail && railVisible ? rail : null}

      {sidebar && sidebarInline ? (
        <div className={styles.sidebar} style={{ width: sidebarWidth }}>
          {sidebar}
        </div>
      ) : null}

      {sidebar && !sidebarInline && overlayOpen ? (
        <>
          <div
            className={styles.scrim}
            onClick={() => setOverlayOpen(false)}
            // Decorative: Escape and the toggle are the real affordances.
            aria-hidden="true"
          />
          <div className={`${styles.sidebar} ${styles.sidebarOverlay}`} style={{ width: sidebarWidth }}>
            {sidebar}
          </div>
        </>
      ) : null}

      <div className={styles.main}>
        {sidebar && !sidebarInline ? (
          <Button
            className={styles.toggle}
            size="small"
            appearance="subtle"
            icon={<NavigationRegular />}
            aria-label={overlayOpen ? 'Hide conversations' : 'Show conversations'}
            aria-expanded={overlayOpen}
            onClick={() => setOverlayOpen(!overlayOpen)}
          />
        ) : null}
        {header}
        <div className={styles.body}>{children}</div>
      </div>

      {rightPaneVisible ? rightPane : null}
    </div>
  );
}
