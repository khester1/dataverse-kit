import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, makeStyles, tokens } from '@fluentui/react-components';
import { ApprovalCard, ToolCallCard, ActionResult, ConfirmInline } from '../actions';
import { proposedCall } from './grounding.data';
import type { AgentToolCall } from '../core';

const useStyles = makeStyles({
  col: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, maxWidth: '560px' },
});

const meta: Meta = { title: 'Actions' };
export default meta;

/** The full approval round trip: propose → decide → outcome. */
function ApprovalDemo(): React.ReactElement {
  const styles = useStyles();
  const [call, setCall] = React.useState<AgentToolCall>(proposedCall);

  const settle = (status: AgentToolCall['status'], resultText?: string) =>
    setCall((c) => ({ ...c, status, resultText }));

  return (
    <div className={styles.col}>
      <ApprovalCard
        toolCall={call}
        allowEdit
        onApprove={(_, args) => {
          // The HOST runs the tool. The kit only reports the decision.
          setCall((c) => ({ ...c, status: 'running', argumentsJson: args }));
          setTimeout(() => settle('succeeded', 'Credit note CN-91 created.'), 900);
        }}
        onDeny={() => settle('denied')}
      />
      <Button size="small" onClick={() => setCall(proposedCall)}>
        Reset
      </Button>
    </div>
  );
}
export const Approval: StoryObj = { render: () => <ApprovalDemo /> };

/** Every tool-call state — the status is in the label, not only the badge colour. */
function ToolCallsDemo(): React.ReactElement {
  const styles = useStyles();
  const statuses: AgentToolCall['status'][] = ['proposed', 'running', 'succeeded', 'failed', 'denied'];
  return (
    <div className={styles.col}>
      {statuses.map((status) => (
        <ToolCallCard
          key={status}
          toolCall={{
            ...proposedCall,
            id: status,
            status,
            resultText: status === 'succeeded' ? '{"creditNoteId":"CN-91"}' : undefined,
            failure: status === 'failed' ? { status: 'error', message: 'Dataverse rejected the write.' } : undefined,
          }}
        />
      ))}
      <ActionResult status="succeeded" message="Credit note CN-91 created." correlationId="8f3a-11ee" />
      <ActionResult status="failed" message="Dataverse rejected the write." correlationId="9c2b-11ee" onRetry={() => {}} />
    </div>
  );
}
export const ToolCalls: StoryObj = { render: () => <ToolCallsDemo /> };

/**
 * The in-tree confirmation replacing Fluent's `Dialog`.
 *
 * ★ Try it with the keyboard: Tab cannot leave it, Escape closes it, and focus returns to the
 *   trigger. The gallery precedent this replaces does none of those three.
 */
function ConfirmDemo(): React.ReactElement {
  const styles = useStyles();
  const [open, setOpen] = React.useState(false);
  return (
    <div className={styles.col}>
      <div>
        <Button onClick={() => setOpen(true)}>Delete this credit note</Button>
      </div>
      <ConfirmInline
        open={open}
        destructive
        title="Delete credit note CN-91?"
        body="It will be removed from case 4417. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
export const Confirm: StoryObj = { render: () => <ConfirmDemo /> };
