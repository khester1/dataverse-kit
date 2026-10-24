import * as React from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { renumberCitations, type AgentSource } from '../core';
import { Disclosure } from '../internal';
import { SourceCard } from './SourceCard';

export interface CitationListProps {
  /** The answer text — used to work out which sources were actually cited. */
  text: string;
  sources: readonly AgentSource[];
  onOpenSource?: (source: AgentSource) => void;
  defaultOpen?: boolean;
}

const useStyles = makeStyles({
  list: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS, listStyle: 'none', margin: 0, padding: 0 },
});

/**
 * The sources under an answer.
 *
 * ★★ IT SHOWS ONLY THE SOURCES THE TEXT ACTUALLY CITES. A retriever commonly returns a dozen
 *    chunks for a two-citation answer, and listing all twelve implies the answer rests on
 *    twelve things when it rests on two. That overstated provenance is what makes a citation
 *    panel decorative instead of trustworthy, so `renumberCitations` drops the uncited ones
 *    and renumbers what remains into first-appearance order.
 *
 * ★ A Disclosure, not Fluent's `Accordion`: APG's disclosure pattern is `<button aria-expanded
 *   aria-controls>` and a labelled region, and `Accordion` reaches `useArrowNavigationGroup`
 *   to add arrow-key movement between headers that a single source list does not need.
 */
export function CitationList({
  text,
  sources,
  onOpenSource,
  defaultOpen = false,
}: CitationListProps): React.ReactElement | null {
  const styles = useStyles();
  const id = React.useId();
  const { used, citations } = React.useMemo(() => renumberCitations(text, sources), [text, sources]);

  if (used.length === 0) return null;

  const markerFor = (sourceId: string) => citations.find((c) => c.sourceId === sourceId)?.marker;

  return (
    <Disclosure
      id={id}
      defaultOpen={defaultOpen}
      summary={`${used.length} source${used.length === 1 ? '' : 's'}`}
    >
      <ul className={styles.list}>
        {used.map((source) => (
          <li key={source.id}>
            <SourceCard source={source} marker={markerFor(source.id)} onOpen={onOpenSource} />
          </li>
        ))}
      </ul>
    </Disclosure>
  );
}
