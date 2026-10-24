import * as React from 'react';
import { Badge, Spinner, makeStyles, tokens } from '@fluentui/react-components';
import type { AgentToolCall, ToolCallStatus } from '../core';
import { Disclosure, CardSurface } from '../internal';
import { ParameterReview } from './ParameterReview';

export interface ToolCallCardProps {
  toolCall: AgentToolCall;
  defaultExpanded?: boolean;
}

const LABEL: Record<ToolCallStatus, string> = {
  proposed: 'Proposed',
  running: 'Running',
  succeeded: 'Succeeded',
  failed: 'Failed',
  denied: 'Denied',
};
const COLOUR: Record<ToolCallStatus, 'informative' | 'success' | 'danger' | 'warning'> = {
  proposed: 'informative',
  running: 'informative',
  succeeded: 'success',
  failed: 'danger',
  denied: 'warning',
};

const useStyles = makeStyles({
  head: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalXS },
  name: { fontFamily: tokens.fontFamilyMonospace, fontSize: tokens.fontSizeBase200 },
  result: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    marginTop: tokens.spacingVerticalXS,
  },
});

/** A tool call that needed no approval — collapsed by default, expandable for the arguments.
 *  ★ A Disclosure rather than `Accordion`: see internal/Disclosure.tsx. */
export function ToolCallCard({ toolCall, defaultExpanded = false }: ToolCallCardProps): React.ReactElement {
  const styles = useStyles();
  const id = React.useId();

  return (
    <CardSurface>
      <Disclosure
        id={id}
        defaultOpen={defaultExpanded}
        summary={
          <span className={styles.head}>
            <span className={styles.name}>{toolCall.name}</span>
            {/* ★ The status is in the LABEL, not only in the badge colour (WCAG 1.4.1). */}
            <Badge appearance="tint" color={COLOUR[toolCall.status]}>
              {LABEL[toolCall.status]}
            </Badge>
            {toolCall.status === 'running' ? <Spinner size="extra-tiny" /> : null}
          </span>
        }
      >
        <ParameterReview argumentsJson={toolCall.argumentsJson} />
        {toolCall.resultText ? <div className={styles.result}>{toolCall.resultText}</div> : null}
        {toolCall.failure ? <div className={styles.result}>{toolCall.failure.message}</div> : null}
      </Disclosure>
    </CardSurface>
  );
}
