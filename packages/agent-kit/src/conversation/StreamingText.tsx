import * as React from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';

export interface StreamingTextProps {
  text: string;
  streaming?: boolean;
}

const useStyles = makeStyles({
  root: { whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  caret: {
    display: 'inline-block',
    width: '2px',
    height: '1em',
    marginLeft: '2px',
    verticalAlign: 'text-bottom',
    backgroundColor: tokens.colorBrandForeground1,
    animationName: { '0%,49%': { opacity: 1 }, '50%,100%': { opacity: 0 } },
    animationDuration: '1s',
    animationIterationCount: 'infinite',
    // WCAG 2.2.2: a blinking caret is motion, and some readers cannot tolerate it.
    '@media (prefers-reduced-motion: reduce)': { animationName: 'none', opacity: 1 },
  },
});

/**
 * The in-flight answer.
 *
 * ★ A STABLE element, deliberately. If this subtree remounted per token, any focus inside the
 *   streaming bubble (a citation chip, a copy button) would be thrown to `<body>` mid-answer.
 *   Only the text node changes; the element identity does not. `useStreamingText.test.tsx`
 *   pins that as an invariant rather than leaving it to a comment.
 */
export function StreamingText({ text, streaming }: StreamingTextProps): React.ReactElement {
  const styles = useStyles();
  return (
    <span className={styles.root} data-testid="agentkit-streaming-text">
      {text}
      {streaming ? <span className={styles.caret} aria-hidden="true" /> : null}
    </span>
  );
}
