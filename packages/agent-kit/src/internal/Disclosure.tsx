import * as React from 'react';
import { makeStyles, tokens, mergeClasses } from '@fluentui/react-components';
import { ChevronRightRegular, ChevronDownRegular } from '@fluentui/react-icons';

export interface DisclosureProps {
  id: string;
  summary: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

const useStyles = makeStyles({
  trigger: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: `${tokens.spacingVerticalXXS} 0`,
    color: tokens.colorNeutralForeground2,
    font: 'inherit',
    fontSize: tokens.fontSizeBase200,
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '1px' },
  },
  panel: { paddingTop: tokens.spacingVerticalXS },
});

/**
 * The in-tree replacement for Fluent's `Accordion`.
 *
 * ★ APG's Disclosure pattern really is just `<button aria-expanded aria-controls>` plus a
 *   labelled region — there is nothing else to it. `Accordion` adds arrow navigation between
 *   headers, which a citation list or a trace does not need, and reaches
 *   `useArrowNavigationGroup` to provide it. So this is the cheap side of the split.
 */
export function Disclosure({
  id,
  summary,
  children,
  defaultOpen = false,
  className,
}: DisclosureProps): React.ReactElement {
  const styles = useStyles();
  const [open, setOpen] = React.useState(defaultOpen);
  const panelId = `${id}-panel`;

  return (
    <div className={className}>
      <button
        type="button"
        id={id}
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronDownRegular /> : <ChevronRightRegular />}
        {summary}
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={id}
        hidden={!open}
        className={mergeClasses(styles.panel)}
      >
        {open ? children : null}
      </div>
    </div>
  );
}
