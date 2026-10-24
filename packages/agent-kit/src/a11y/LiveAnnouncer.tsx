import * as React from 'react';
import { useVisuallyHiddenStyles } from './visuallyHidden';

export interface LiveAnnouncerProps {
  /** Read at the next pause. Changing this to a new non-empty value announces it. */
  polite?: string;
  /** Interrupts. Failures only. */
  assertive?: string;
}

function useAnnounceWithRepeat(
  next: string,
  set: React.Dispatch<React.SetStateAction<string>>,
): void {
  React.useEffect(() => {
    if (!next) return;
    let cancelled = false;
    // Clear-then-set across two ticks. Screen readers SWALLOW a repeat: assigning a region
    // the text it already holds announces nothing, so two identical answers in a row would
    // be read once. Clearing first guarantees the region genuinely changes.
    set('');
    const id = setTimeout(() => {
      if (!cancelled) set(next);
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [next, set]);
}

/**
 * The two live regions for a conversation surface.
 *
 * ★ The transcript itself is NOT a live region, and that is the point. A live region on the
 *   streaming node queues every token for announcement — NVDA and JAWS re-read the growing
 *   string and never finish. The streaming bubble carries `aria-busy`, the typing indicator's
 *   own `role="status"` covers "responding", and this announces once per turn: the settled
 *   answer (see `deriveAnnouncement` in ./core, which is where the rule lives).
 *
 * ★ `aria-atomic` so the whole message is read, not just the changed fragment.
 */
export function LiveAnnouncer({
  polite = '',
  assertive = '',
}: LiveAnnouncerProps): React.ReactElement {
  const styles = useVisuallyHiddenStyles();
  const [politeText, setPoliteText] = React.useState('');
  const [assertiveText, setAssertiveText] = React.useState('');

  useAnnounceWithRepeat(polite, setPoliteText);
  useAnnounceWithRepeat(assertive, setAssertiveText);

  return (
    <>
      <div
        className={styles.root}
        aria-live="polite"
        aria-atomic="true"
        data-testid="agentkit-live-polite"
      >
        {politeText}
      </div>
      <div
        className={styles.root}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        data-testid="agentkit-live-assertive"
      >
        {assertiveText}
      </div>
    </>
  );
}
