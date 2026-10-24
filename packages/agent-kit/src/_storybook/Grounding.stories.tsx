import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { makeStyles, tokens } from '@fluentui/react-components';
import { CitationList, GroundingPanel, ProviderAttribution, AnswerWithCitations, SourceCard } from '../grounding';
import { renumberCitations } from '../core';
import { groundedSources, GROUNDED_ANSWER, groundingFacts } from './grounding.data';

const useStyles = makeStyles({
  col: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, maxWidth: '640px' },
  answer: {
    padding: tokens.spacingVerticalM,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground3,
  },
});

const meta: Meta = { title: 'Grounding' };
export default meta;

/**
 * ★ The fixture is FIVE sources and an answer citing TWO, out of order. That asymmetry is the
 *   point: a fixture where everything is cited cannot show whether the panel is filtering.
 */
function AccountableAnswerDemo(): React.ReactElement {
  const styles = useStyles();
  const { text, citations, used } = renumberCitations(GROUNDED_ANSWER, groundedSources);
  return (
    <div className={styles.col}>
      <div className={styles.answer}>
        <AnswerWithCitations text={text} citations={citations} sources={used} onOpenSource={() => {}} />
      </div>
      <ProviderAttribution provider="foundry" model="gpt-4.1" />
      <CitationList text={GROUNDED_ANSWER} sources={groundedSources} onOpenSource={() => {}} defaultOpen />
      <GroundingPanel grounding={groundingFacts} />
    </div>
  );
}
export const AccountableAnswer: StoryObj = { render: () => <AccountableAnswerDemo /> };

/** Both directions of the attribution rule, side by side. */
function AttributionDemo(): React.ReactElement {
  const styles = useStyles();
  return (
    <div className={styles.col}>
      <ProviderAttribution provider="foundry" model="gpt-4.1" />
      <ProviderAttribution provider="foundry" model="gpt-4.1" guarded />
    </div>
  );
}
export const Attribution: StoryObj = { render: () => <AttributionDemo /> };

/** Every source kind, and the reported-vs-not distinction. */
function SourcesDemo(): React.ReactElement {
  const styles = useStyles();
  return (
    <div className={styles.col}>
      {groundedSources.map((source, i) => (
        <SourceCard key={source.id} source={source} marker={String(i + 1)} onOpen={() => {}} />
      ))}
    </div>
  );
}
export const Sources: StoryObj = { render: () => <SourcesDemo /> };
