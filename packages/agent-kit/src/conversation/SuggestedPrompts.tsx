import * as React from 'react';
import { Button, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';

export interface SuggestedPromptsProps {
  prompts: readonly string[];
  onPick: (prompt: string) => void;
  heading?: string;
  /**
   * Row alignment. Defaults to `'start'`, which is right above a composer where the chips read as
   * a continuation of the transcript. `'center'` is for a centred zero state — see
   * `EmptyConversation`, where left-packed chips under a centred heading looked like a defect.
   */
  align?: 'start' | 'center';
}

const useStyles = makeStyles({
  root: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalXS, padding: tokens.spacingVerticalXS },
  // ★ The heading is `width: 100%`, so it takes the PARENT's text-align while the chips take the
  //   flex row's justification. That split is why the label could look centred while the chips
  //   stayed left-packed — the two are aligned by different mechanisms and must both be set.
  center: { justifyContent: 'center' },
  headingCenter: { textAlign: 'center' },
  heading: { width: '100%', fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground3 },
});

/** ★ Plain Buttons in a labelled list, not Fluent's `TagGroup` — `react-tags` reaches
 *  `useArrowNavigationGroup`, and chips gain nothing from it here. */
export function SuggestedPrompts({
  prompts,
  onPick,
  heading = 'Suggested follow-ups',
  align = 'start',
}: SuggestedPromptsProps): React.ReactElement | null {
  const styles = useStyles();
  if (prompts.length === 0) return null;
  const centered = align === 'center';
  return (
    <div
      className={mergeClasses(styles.root, centered && styles.center)}
      role="group"
      aria-label={heading}
    >
      <span className={mergeClasses(styles.heading, centered && styles.headingCenter)}>{heading}</span>
      {prompts.map((prompt) => (
        <Button key={prompt} size="small" appearance="outline" onClick={() => onPick(prompt)}>
          {prompt}
        </Button>
      ))}
    </div>
  );
}
