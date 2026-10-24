import * as React from 'react';
import { makeStyles } from '@fluentui/react-components';
import { splitTextByCitations, type AgentCitation, type AgentSource } from '../core';
import { CitationChip } from './CitationChip';

export interface AnswerWithCitationsProps {
  text: string;
  citations?: readonly AgentCitation[];
  sources?: readonly AgentSource[];
  onOpenSource?: (source: AgentSource) => void;
}

const useStyles = makeStyles({ root: { whiteSpace: 'pre-wrap', wordBreak: 'break-word' } });

/** Renders the answer with a chip where each marker was. */
export function AnswerWithCitations({
  text,
  citations = [],
  sources = [],
  onOpenSource,
}: AnswerWithCitationsProps): React.ReactElement {
  const styles = useStyles();
  const segments = React.useMemo(() => splitTextByCitations(text, citations), [text, citations]);
  const byId = React.useMemo(() => new Map(sources.map((s) => [s.id, s])), [sources]);

  return (
    <span className={styles.root}>
      {segments.map((segment, i) =>
        segment.kind === 'text' ? (
          <React.Fragment key={i}>{segment.text}</React.Fragment>
        ) : (
          <CitationChip
            key={i}
            marker={segment.marker ?? ''}
            source={segment.sourceId ? byId.get(segment.sourceId) : undefined}
            onOpen={onOpenSource}
          />
        ),
      )}
    </span>
  );
}
