import * as React from 'react';
import { Button, Text, makeStyles, tokens } from '@fluentui/react-components';
import {
  DocumentRegular, DatabaseRegular, GlobeRegular, BookRegular, DocumentBulletListRegular,
} from '@fluentui/react-icons';
import type { AgentSource } from '../core';
import { CardSurface } from '../internal';

export interface SourceCardProps {
  source: AgentSource;
  /** The marker this source was cited as, if any. */
  marker?: string;
  onOpen?: (source: AgentSource) => void;
  showSnippet?: boolean;
}

const ICONS = {
  dataverse: DatabaseRegular,
  document: DocumentRegular,
  web: GlobeRegular,
  knowledge: BookRegular,
  other: DocumentBulletListRegular,
} as const;

const useStyles = makeStyles({
  root: { gap: tokens.spacingVerticalXXS },
  head: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalXS },
  marker: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  snippet: { color: tokens.colorNeutralForeground2, fontSize: tokens.fontSizeBase200 },
  meta: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS, marginTop: tokens.spacingVerticalXXS },
});

export function SourceCard({ source, marker, onOpen, showSnippet = true }: SourceCardProps): React.ReactElement {
  const styles = useStyles();
  const Icon = ICONS[source.kind] ?? ICONS.other;

  return (
    <CardSurface className={styles.root}>
      <div className={styles.head}>
        <Icon aria-hidden="true" />
        {marker ? <span className={styles.marker}>[{marker}]</span> : null}
        <Text weight="semibold">{source.title}</Text>
      </div>
      {showSnippet && source.snippet ? <span className={styles.snippet}>{source.snippet}</span> : null}
      <div className={styles.meta}>
        {/* ★ The kit never calls Xrm. It raises a callback and the HOST navigates. */}
        {onOpen && (source.recordId || source.url) ? (
          <Button size="small" appearance="subtle" onClick={() => onOpen(source)}>
            {source.recordId ? 'Open record' : 'Open'}
          </Button>
        ) : null}
        {/* ★ "not reported" is shown as such, never as zero confidence — a retriever that
            returns no score and one that returns 0 mean completely different things. */}
        <span className={styles.snippet}>
          {source.score === undefined ? 'Relevance not reported' : `Relevance ${Math.round(source.score * 100)}%`}
        </span>
      </div>
    </CardSurface>
  );
}
