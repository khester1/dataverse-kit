import * as React from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';

export interface TypingIndicatorProps {
  /** Announced. Keep it short — it interrupts nothing but is read on appearance. */
  label?: string;
}

const useStyles = makeStyles({
  root: { display: 'inline-flex', gap: '4px', alignItems: 'center', padding: tokens.spacingVerticalXS },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralForeground3,
    animationName: { '0%,80%,100%': { opacity: 0.3 }, '40%': { opacity: 1 } },
    animationDuration: '1.4s',
    animationIterationCount: 'infinite',
    '@media (prefers-reduced-motion: reduce)': { animationName: 'none', opacity: 0.6 },
  },
  d2: { animationDelay: '0.2s' },
  d3: { animationDelay: '0.4s' },
});

/**
 * ★ This carries "the assistant is responding" for screen readers, via its own `role="status"`
 *   firing when it MOUNTS. That is why `deriveAnnouncement` does not also announce the start —
 *   doing both would say it twice.
 */
export function TypingIndicator({ label = 'Assistant is responding' }: TypingIndicatorProps): React.ReactElement {
  const styles = useStyles();
  return (
    <div className={styles.root} role="status" aria-label={label} data-testid="agentkit-typing">
      <span className={styles.dot} aria-hidden="true" />
      <span className={`${styles.dot} ${styles.d2}`} aria-hidden="true" />
      <span className={`${styles.dot} ${styles.d3}`} aria-hidden="true" />
    </div>
  );
}
