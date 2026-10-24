import * as React from 'react';
import { MessageBar, MessageBarBody, MessageBarTitle, MessageBarActions, Button, makeStyles, tokens } from '@fluentui/react-components';

export interface ActionResultProps {
  status: 'succeeded' | 'failed' | 'denied';
  message: string;
  correlationId?: string;
  onRetry?: () => void;
}

const INTENT = { succeeded: 'success', failed: 'error', denied: 'warning' } as const;
const TITLE = { succeeded: 'Done', failed: 'Failed', denied: 'Not approved' } as const;

const useStyles = makeStyles({
  id: { display: 'block', marginTop: tokens.spacingVerticalXXS, fontSize: tokens.fontSizeBase100, color: tokens.colorNeutralForeground3, fontFamily: tokens.fontFamilyMonospace },
});

/** ★ The correlation id is surfaced, not hidden: it is the only thing that lets someone paged
 *  at 3am find this specific run in App Insights. */
export function ActionResult({ status, message, correlationId, onRetry }: ActionResultProps): React.ReactElement {
  const styles = useStyles();
  return (
    <MessageBar intent={INTENT[status]}>
      <MessageBarBody>
        <MessageBarTitle>{TITLE[status]}</MessageBarTitle>
        {message}
        {correlationId ? <span className={styles.id}>Correlation id: {correlationId}</span> : null}
      </MessageBarBody>
      {status === 'failed' && onRetry ? (
        <MessageBarActions>
          <Button size="small" onClick={onRetry}>Try again</Button>
        </MessageBarActions>
      ) : null}
    </MessageBar>
  );
}
