import * as React from 'react';
import { Button, Spinner, makeStyles, tokens } from '@fluentui/react-components';
import { CheckmarkRegular, DismissRegular, EditRegular } from '@fluentui/react-icons';
import type { AgentToolCall } from '../core';
import { ActionCard } from './ActionCard';
import { ParameterReview } from './ParameterReview';
import { ActionResult } from './ActionResult';

export interface ApprovalCardProps {
  toolCall: AgentToolCall;
  onApprove: (call: AgentToolCall, argumentsJson: string) => void;
  onDeny: (call: AgentToolCall) => void;
  /** Enables in-place editing of the proposed arguments before approval. */
  allowEdit?: boolean;
  busy?: boolean;
}

const useStyles = makeStyles({
  busy: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalXS, fontSize: tokens.fontSizeBase200 },
});

/**
 * A tool call awaiting a human decision.
 *
 * ★★ THE KIT DOES NOT RUN THE TOOL. It renders the request and raises a callback; the HOST
 *    executes and feeds the outcome back as a `tool_result` event. That is what keeps "the kit
 *    has no tools" a structural statement about this package rather than a promise about a
 *    prompt — `IAgentService` has no method that could invoke one.
 *
 * ★★ IT CANNOT DOUBLE-SUBMIT, and that is asserted two ways, because counting the callback
 *    alone is a one-field signature: it shows what the component SENT, and a card that
 *    re-enables after an async settle would still submit twice later. The gate asserts one
 *    `onApprove` across two synchronous clicks AND that the control is disabled afterwards.
 */
export function ApprovalCard({
  toolCall, onApprove, onDeny, allowEdit = false, busy = false,
}: ApprovalCardProps): React.ReactElement {
  const styles = useStyles();
  const [args, setArgs] = React.useState(toolCall.argumentsJson);
  const [editing, setEditing] = React.useState(false);
  // Latched locally: the decision is final from this card's point of view the moment it is
  // made, regardless of how long the host takes to report a status back.
  const [decided, setDecided] = React.useState(false);

  const settled =
    toolCall.status === 'succeeded' || toolCall.status === 'failed' || toolCall.status === 'denied';

  if (settled) {
    return (
      <ActionCard title={toolCall.name} description="Tool call">
        <ParameterReview argumentsJson={toolCall.argumentsJson} />
        <ActionResult
          status={toolCall.status === 'succeeded' ? 'succeeded' : toolCall.status === 'denied' ? 'denied' : 'failed'}
          message={toolCall.resultText ?? toolCall.failure?.message ?? 'Completed.'}
          correlationId={toolCall.failure?.correlationId}
        />
      </ActionCard>
    );
  }

  const locked = decided || busy || toolCall.status === 'running';

  const approve = () => {
    if (locked) return;
    setDecided(true);
    onApprove(toolCall, args);
  };
  const deny = () => {
    if (locked) return;
    setDecided(true);
    onDeny(toolCall);
  };

  return (
    <ActionCard
      title={toolCall.name}
      description="The agent is asking to run this. Check the details before approving."
      pending={!locked}
      footer={
        locked ? (
          <span className={styles.busy}>
            <Spinner size="tiny" /> Submitting…
          </span>
        ) : (
          <>
            {allowEdit ? (
              <Button size="small" icon={<EditRegular />} onClick={() => setEditing((v) => !v)}>
                {editing ? 'Done editing' : 'Edit'}
              </Button>
            ) : null}
            <Button size="small" icon={<DismissRegular />} onClick={deny} disabled={locked}>
              Deny
            </Button>
            <Button size="small" appearance="primary" icon={<CheckmarkRegular />} onClick={approve} disabled={locked}>
              Approve
            </Button>
          </>
        )
      }
    >
      <ParameterReview argumentsJson={args} readOnly={!editing} onChange={setArgs} />
    </ActionCard>
  );
}
