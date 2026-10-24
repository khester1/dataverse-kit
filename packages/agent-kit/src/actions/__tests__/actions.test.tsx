import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/react';
import { ApprovalCard, ToolCallCard, ParameterReview, ConfirmInline } from '..';
import { renderWithKit, expectNoAxeViolations } from '../../conversation/__tests__/testUtils';
import type { AgentToolCall } from '../../core';

const call: AgentToolCall = {
  id: 'c1',
  name: 'create_credit_note',
  argumentsJson: '{"accountId":"contoso","amount":6200,"currency":"GBP"}',
  status: 'proposed',
  requiresApproval: true,
};

describe('ApprovalCard', () => {
  /**
   * ★★ A TWO-FIELD SIGNATURE, because counting the callback alone is a one-field one.
   *
   * Counting `onApprove` shows what the component SENT. A card that re-enabled itself after an
   * async settle would still pass that and still double-submit later. So the second field is
   * the control's own state: it must be gone or disabled once a decision is made.
   */
  it('cannot double-submit: ONE callback across two clicks, AND the control is gone after', async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn();
    const { getByRole, queryByRole } = renderWithKit(
      <ApprovalCard toolCall={call} onApprove={onApprove} onDeny={() => {}} />,
    );

    const approve = getByRole('button', { name: /approve/i });
    await user.click(approve);
    // Second click on the same node — the user double-clicking, or a slow host.
    await user.click(approve);

    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(queryByRole('button', { name: /^approve$/i })).toBeNull();
    expect(queryByRole('button', { name: /deny/i })).toBeNull();
  });

  it('approving and denying are mutually exclusive', async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn();
    const onDeny = vi.fn();
    const { getByRole } = renderWithKit(
      <ApprovalCard toolCall={call} onApprove={onApprove} onDeny={onDeny} />,
    );
    await user.click(getByRole('button', { name: /deny/i }));
    expect(onDeny).toHaveBeenCalledTimes(1);
    expect(onApprove).not.toHaveBeenCalled();
  });

  it('passes the EDITED arguments, not the originals', async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn();
    const { getByRole, getByLabelText } = renderWithKit(
      <ApprovalCard toolCall={call} onApprove={onApprove} onDeny={() => {}} allowEdit />,
    );
    await user.click(getByRole('button', { name: /^edit$/i }));
    const field = getByLabelText('currency');
    await user.clear(field);
    await user.type(field, 'USD');
    await user.click(getByRole('button', { name: /approve/i }));

    const [, sentArgs] = onApprove.mock.calls[0] as [unknown, string];
    // The row where "wired up" and "passes the original" must differ.
    expect(JSON.parse(sentArgs).currency).toBe('USD');
    expect(sentArgs).not.toBe(call.argumentsJson);
  });

  it('shows the outcome once the host reports back, with no decision buttons', () => {
    const { queryByRole, getByText } = renderWithKit(
      <ApprovalCard
        toolCall={{ ...call, status: 'succeeded', resultText: 'Credit note CN-91 created.' }}
        onApprove={() => {}}
        onDeny={() => {}}
      />,
    );
    expect(getByText(/CN-91/)).toBeTruthy();
    expect(queryByRole('button', { name: /approve/i })).toBeNull();
  });
});

describe('ParameterReview', () => {
  // ★ A half-streamed arguments blob is not valid JSON. Rendering nothing would ask a user to
  //   approve something they cannot see.
  it('falls back to the RAW string when the JSON does not parse', () => {
    const { container } = renderWithKit(<ParameterReview argumentsJson='{"amount":62' />);
    expect(container.textContent).toContain('{"amount":62');
    expect(container.textContent).toMatch(/unparsed/i);
  });

  it('lays parsed arguments out as key/value pairs', () => {
    const { container } = renderWithKit(<ParameterReview argumentsJson={call.argumentsJson} />);
    expect(container.querySelectorAll('dt')).toHaveLength(3);
    expect(container.textContent).toContain('accountId');
    expect(container.textContent).toContain('contoso');
  });
});

describe('ToolCallCard', () => {
  it('states the status in TEXT, not only as a badge colour', () => {
    const { container } = renderWithKit(<ToolCallCard toolCall={{ ...call, status: 'failed' }} />);
    // WCAG 1.4.1 — a red badge with no word is invisible to a colour-blind reader.
    expect(container.textContent).toMatch(/Failed/);
  });
});

describe('ConfirmInline — the three things the precedent gets wrong', () => {
  function Harness(): React.ReactElement {
    const [open, setOpen] = React.useState(false);
    return (
      <div>
        <button type="button" onClick={() => setOpen(true)}>
          Delete
        </button>
        <ConfirmInline
          open={open}
          title="Delete this?"
          body="It cannot be undone."
          onConfirm={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </div>
    );
  }

  it('(1) declares aria-modal — the role without it is a claim the code does not honour', async () => {
    const user = userEvent.setup();
    const { getByRole } = renderWithKit(<Harness />);
    await user.click(getByRole('button', { name: 'Delete' }));
    const dialog = getByRole('alertdialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();
    expect(dialog.getAttribute('aria-describedby')).toBeTruthy();
  });

  it('(2) TRAPS focus — Tab cannot walk out of it', async () => {
    const user = userEvent.setup();
    const { getByRole } = renderWithKit(<Harness />);
    const trigger = getByRole('button', { name: 'Delete' });
    await user.click(trigger);

    const dialog = getByRole('alertdialog');
    const inside = [...dialog.querySelectorAll('button')];
    expect(inside.length).toBeGreaterThan(1);

    // Tab right round the cycle — focus must never land on the trigger outside.
    for (let i = 0; i < inside.length + 2; i++) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
      expect(document.activeElement).not.toBe(trigger);
    }
  });

  it('(3) RETURNS focus to the trigger on close', async () => {
    const user = userEvent.setup();
    const { getByRole } = renderWithKit(<Harness />);
    const trigger = getByRole('button', { name: 'Delete' });
    await user.click(trigger);
    expect(getByRole('alertdialog').contains(document.activeElement)).toBe(true);

    await user.click(getByRole('button', { name: 'Cancel' }));
    // ★ waitFor, not a bare assert: focus restoration happens in an effect CLEANUP, which races
    //   userEvent's own act() batching. One unreproduced failure was seen here before this was
    //   added (10 subsequent runs were clean, so the cause was never pinned). waitFor removes the
    //   timing sensitivity WITHOUT weakening the claim — it still fails if focus never returns.
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('closes on Escape, and still returns focus', async () => {
    const user = userEvent.setup();
    const { getByRole, queryByRole } = renderWithKit(<Harness />);
    const trigger = getByRole('button', { name: 'Delete' });
    await user.click(trigger);
    await user.keyboard('{Escape}');
    expect(queryByRole('alertdialog')).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});

describe('axe', () => {
  it('the action family is clean', async () => {
    const { container } = renderWithKit(
      <div>
        <ApprovalCard toolCall={call} onApprove={() => {}} onDeny={() => {}} allowEdit />
        <ToolCallCard toolCall={{ ...call, status: 'succeeded', resultText: 'ok' }} defaultExpanded />
      </div>,
    );
    await expectNoAxeViolations(container);
  });
});
