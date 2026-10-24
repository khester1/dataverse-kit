import * as React from 'react';
import { Button, Switch, Text, Tooltip, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { DismissRegular, ArrowDownloadRegular, SpeakerMuteRegular, Speaker2Regular } from '@fluentui/react-icons';
import { useRovingTabindex } from '../a11y/useRovingTabindex';
import { useReturnFocus } from '../a11y/useReturnFocus';
import type { AssistantTab } from './types';

export interface AssistantPanelProps {
  title: string;
  tabs: readonly AssistantTab[];
  activeTabId: string;
  onTabChange: (id: string) => void;
  onClose?: () => void;
  /** The on/off switch in the header. Omit both to hide it. */
  enabled?: boolean;
  onEnabledChange?: (enabled: boolean) => void;
  /**
   * The pre-arrival line ("Support Assistant will be with you in a moment").
   * ★ Chrome, not transcript content — it is never announced as a message.
   */
  status?: string;
  onDownloadTranscript?: () => void;
  muted?: boolean;
  onMutedChange?: (muted: boolean) => void;
  /** The transcript + composer. Slot in `MessageList` and `Composer`. */
  children?: React.ReactNode;
  /**
   * Drives the slide-in and focus handling. Defaults to `true` — a panel a host simply places
   * stays open and unanimated, which is the behaviour that shipped in 0.3.0.
   */
  open?: boolean;
  /** Called on Escape. Omit and Escape does nothing — the panel never closes itself silently. */
  onDismiss?: () => void;
}

const useStyles = makeStyles({
  root: {
    display: 'flex', flexDirection: 'column', height: '100%', minWidth: '320px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderLeft: `1px solid ${tokens.colorNeutralStroke2}`,
    // ★ transform, not width/left — those two lay out on every frame and a transcript is an
    //   expensive subtree to reflow 60 times a second.
    transform: 'translateX(0)',
    transitionProperty: 'transform',
    transitionDuration: tokens.durationGentle,
    transitionTimingFunction: tokens.curveDecelerateMid,
    // ★★ prefers-reduced-motion is honoured, and it is not decoration: a full-height panel
    //   sliding across the viewport is exactly the vestibular trigger the setting exists for.
    '@media (prefers-reduced-motion: reduce)': { transitionDuration: '1ms' },
  },
  closed: {
    transform: 'translateX(100%)',
    // ★ Hidden from AT as well as sight. A translated-off panel is still in the a11y tree and
    //   still tabbable, so a keyboard user would tab into a drawer they cannot see.
    visibility: 'hidden',
  },
  header: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS, padding: tokens.spacingVerticalS },
  tabstrip: { display: 'flex', gap: tokens.spacingHorizontalXXS, flexGrow: 1 },
  tab: {
    display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalXS,
    border: 'none', background: 'none', cursor: 'pointer',
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    color: tokens.colorNeutralForeground2, fontFamily: tokens.fontFamilyBase,
    borderBottom: `2px solid transparent`,
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '-2px' },
  },
  tabSelected: { color: tokens.colorNeutralForeground1, borderBottom: `2px solid ${tokens.colorCompoundBrandStroke}` },
  title: { padding: `0 ${tokens.spacingHorizontalM} ${tokens.spacingVerticalS}` },
  status: {
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalM}`,
    color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200,
  },
  body: { flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' },
  footer: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: tokens.spacingVerticalXS, borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
});

/**
 * The docked assistant drawer, as the M365 admin centre presents Support Assistant: a small tab
 * strip, a title, an on/off switch, the transcript, a pre-arrival status line, and a footer with
 * transcript-download and mute.
 *
 * ★★ THE TAB STRIP IS IN-TREE, not Fluent's `TabList`, and the reason is measured: one Fluent
 *    `Menu` cost **+185 KB and 2 `attrHandlers.set` calls** in a PCF bundle (2026-09-25). For a
 *    two- or three-tab strip the APG pattern is small — roving tabindex, `aria-selected`,
 *    `aria-controls` — and the kit already owns `useRovingTabindex`. Paying the tabster-singleton
 *    hazard for that would be a bad trade. `TabList` remains the right call where the strip is
 *    large, RTL-aware and needs Home/End/PgUp/PgDn.
 *
 * ★ `status` is CHROME. It renders outside the transcript and is not routed through
 *   `LiveAnnouncer`, because "will be with you in a moment" is not a message and announcing it
 *   would interleave with the reply the user is waiting for.
 */
export function AssistantPanel(props: AssistantPanelProps): React.ReactElement {
  const {
    title, tabs, activeTabId, onTabChange, onClose,
    enabled, onEnabledChange, status,
    onDownloadTranscript, muted, onMutedChange, children,
    open = true, onDismiss,
  } = props;
  const styles = useStyles();
  const baseId = React.useId();
  const rootRef = React.useRef<HTMLElement>(null);
  useReturnFocus({ open, containerRef: rootRef as React.RefObject<HTMLElement> });
  const selectedIndex = Math.max(0, tabs.findIndex((t) => t.id === activeTabId));
  const roving = useRovingTabindex({
    itemCount: tabs.length,
    orientation: 'horizontal',
    // ★ MANUAL ACTIVATION: arrows move focus, Enter/Space selects. That is what the kit's
    //   useRovingTabindex does everywhere, and it is the APG pattern for tabs whose panel is not
    //   free to render. Do not special-case it here; consistency is worth more than the one
    //   keystroke, and a divergent strip is the kind of thing nobody notices until it is shipped.
    onActivate: (i) => tabs[i] && onTabChange(tabs[i].id),
  });

  // ★ The tab stop must follow an EXTERNALLY changed tab. Without this the hook keeps its own
  //   index, so a host calling setActiveTab('history') leaves the single tabbable item on 'chat' —
  //   focus lands on a tab that is not the selected one, which reads as a broken strip to a
  //   keyboard user and to nobody else.
  const { setActiveIndex } = roving;
  React.useEffect(() => { setActiveIndex(selectedIndex); }, [selectedIndex, setActiveIndex]);

  return (
    <section
      ref={rootRef}
      className={mergeClasses(styles.root, !open && styles.closed)}
      aria-label={title}
      aria-hidden={!open || undefined}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key !== 'Escape' || !onDismiss) return;
        e.stopPropagation();
        onDismiss();
      }}
    >
      <div className={styles.header}>
        <div className={styles.tabstrip} role="tablist" aria-label={`${title} views`}>
          {tabs.map((tab, i) => {
            const item = roving.getItemProps(i);
            const selected = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`${baseId}-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel`}
                className={mergeClasses(styles.tab, selected && styles.tabSelected)}
                {...item}
                onClick={() => { roving.setActiveIndex(i); onTabChange(tab.id); }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        {onEnabledChange ? (
          <Switch checked={enabled ?? true} onChange={(_, d) => onEnabledChange(d.checked)} label={enabled ?? true ? 'On' : 'Off'} />
        ) : null}
        {onClose ? (
          <Tooltip content="Close" relationship="label" withArrow>
            <Button appearance="subtle" icon={<DismissRegular />} onClick={onClose} />
          </Tooltip>
        ) : null}
      </div>

      <Text as="h2" size={600} weight="semibold" className={styles.title}>{title}</Text>

      <div className={styles.body} id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${activeTabId}`}>
        {status ? <div className={styles.status}>{status}</div> : null}
        {children}
      </div>

      {onDownloadTranscript || onMutedChange ? (
        <div className={styles.footer}>
          {onDownloadTranscript ? (
            <Tooltip content="Download transcript" relationship="label" withArrow>
              <Button appearance="subtle" icon={<ArrowDownloadRegular />} onClick={onDownloadTranscript} />
            </Tooltip>
          ) : <span />}
          {onMutedChange ? (
            <Tooltip content={muted ? 'Unmute' : 'Mute'} relationship="label" withArrow>
              <Button
                appearance="subtle"
                aria-pressed={!!muted}
                icon={muted ? <SpeakerMuteRegular /> : <Speaker2Regular />}
                onClick={() => onMutedChange(!muted)}
              />
            </Tooltip>
          ) : <span />}
        </div>
      ) : null}
    </section>
  );
}
