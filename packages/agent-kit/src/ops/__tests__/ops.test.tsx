import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import userEvent from '@testing-library/user-event';
import {
  AgentStatusBadge, runStatusLabel, AvailabilityBanner, UsageMeter, ThrottleNotice,
  ModelBadge, AgentPicker, RunTimeline, RunHistoryPanel, AgentOpsPanel,
} from '..';
import { renderWithKit, expectNoAxeViolations } from '../../conversation/__tests__/testUtils';
import type { AgentRunStatus, AgentMessage } from '../../core';
import type { AgentDescriptor, AgentRunRecord } from '../types';

/** Enumerated by hand so adding a seventh state is visible here, not silently unhandled. */
const ALL_STATUSES: AgentRunStatus[] = [
  'succeeded', 'blocked', 'refused', 'error', 'notProvisioned', 'cancelled',
];

describe('AgentStatusBadge — the six states', () => {
  /**
   * ★★ THE INCREMENT-5 GATE. The run ladder is six-valued rather than {ok|error} precisely
   *    because these need different reactions: a content filter, the model declining, nobody
   *    having configured the service, the user pressing stop. If two states share a label that
   *    distinction is gone from the UI, whatever the type says.
   */
  it('gives every status a DISTINCT, non-empty label', () => {
    expect(ALL_STATUSES).toHaveLength(6); // non-vacuity

    const labels = ALL_STATUSES.map(runStatusLabel);
    for (const [i, label] of labels.entries()) {
      expect(label, `status ${ALL_STATUSES[i]}`).toBeTruthy();
      expect(label.trim().length).toBeGreaterThan(0);
    }
    // Distinctness is the half that matters: six non-empty labels that are all "Error" would
    // pass a non-empty check.
    expect(new Set(labels).size).toBe(6);
  });

  it('renders the label as TEXT, not only as a badge colour', () => {
    for (const status of ALL_STATUSES) {
      const { container, unmount } = renderWithKit(<AgentStatusBadge status={status} />);
      // WCAG 1.4.1 — four of these would otherwise be shades of red.
      expect(container.textContent, status).toContain(runStatusLabel(status));
      unmount();
    }
  });

  it('does not call a declined answer an error', () => {
    // The specific collapse the ladder exists to prevent.
    expect(runStatusLabel('refused')).not.toBe(runStatusLabel('error'));
    expect(runStatusLabel('blocked')).not.toBe(runStatusLabel('error'));
    expect(runStatusLabel('notProvisioned')).not.toBe(runStatusLabel('error'));
  });
});

describe('UsageMeter', () => {
  // ★ A provider that does not report cost and one that cost nothing are different facts.
  //   `$0.00` for the first is a confident lie that looks like data.
  it('says "not reported" rather than showing zero', () => {
    const { container } = renderWithKit(<UsageMeter usage={{ model: 'gpt-4.1' }} />);
    expect(container.textContent).toMatch(/not reported/);
    expect(container.textContent).not.toMatch(/\$0\.000000/);
  });

  it('shows real figures when they are reported', () => {
    const { container } = renderWithKit(
      <UsageMeter usage={{ inputTokens: 412, outputTokens: 28, costUsd: 0.000912, durationMs: 1840 }} />,
    );
    expect(container.textContent).toContain('412 in / 28 out');
    expect(container.textContent).toContain('$0.000912');
    expect(container.textContent).toContain('1840 ms');
    expect(container.textContent).not.toMatch(/not reported/);
  });

  it('renders nothing without usage', () => {
    const { container } = renderWithKit(<UsageMeter />);
    expect(container.textContent).toBe('');
  });
});

describe('AvailabilityBanner', () => {
  it('treats notProvisioned as INFORMATION, not an error', () => {
    const { container } = renderWithKit(
      <AvailabilityBanner
        availability={{ available: false, status: 'notProvisioned', reason: 'No Foundry project configured.' }}
      />,
    );
    expect(container.textContent).toMatch(/No agent configured/);
    expect(container.textContent).toMatch(/No Foundry project configured/);
    // An outage and an unconfigured environment need different responses.
    expect(container.textContent).not.toMatch(/unavailable/i);
  });

  it('shows a different title for an actual outage', () => {
    const { container } = renderWithKit(
      <AvailabilityBanner availability={{ available: false, reason: 'Upstream 500.' }} />,
    );
    expect(container.textContent).toMatch(/unavailable/i);
  });

  it('renders nothing when the agent IS available', () => {
    const { container } = renderWithKit(<AvailabilityBanner availability={{ available: true }} />);
    expect(container.textContent).toBe('');
  });
});

describe('ThrottleNotice', () => {
  it('counts down and only enables retry when the window has passed', async () => {
    let clock = 1_000_000;
    const now = () => clock;
    const onRetry = vi.fn();
    const { getByRole, container, rerender } = renderWithKit(
      <ThrottleNotice
        failure={{ status: 'error', message: 'Too many requests.', recoverable: true, retryAfterMs: 3000 }}
        onRetry={onRetry}
        now={now}
      />,
    );
    expect(container.textContent).toMatch(/Try again in 3s/);
    // ★ The DOM property, not jest-dom's toBeDisabled — this repo does not install
    //   @testing-library/jest-dom, and an unknown Chai property fails as a test error rather
    //   than a clean assertion.
    expect((getByRole('button', { name: /try again/i }) as HTMLButtonElement).disabled).toBe(true);

    // Advance the injected clock rather than faking timers — the component polls, and this
    // keeps the test about the COUNTDOWN rather than about timer mocking.
    clock += 3200;
    await new Promise((r) => setTimeout(r, 400));
    rerender(
      <ThrottleNotice
        failure={{ status: 'error', message: 'Too many requests.', recoverable: true, retryAfterMs: 3000 }}
        onRetry={onRetry}
        now={now}
      />,
    );
    expect((getByRole('button', { name: /try again/i }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('renders nothing without a retryAfterMs — it will not invent a wait', () => {
    const { container } = renderWithKit(
      <ThrottleNotice failure={{ status: 'error', message: 'Failed.', recoverable: true }} />,
    );
    expect(container.textContent).toBe('');
  });

  it('renders nothing for a non-recoverable failure', () => {
    const { container } = renderWithKit(
      <ThrottleNotice failure={{ status: 'error', message: 'Failed.', recoverable: false, retryAfterMs: 5000 }} />,
    );
    expect(container.textContent).toBe('');
  });
});

const agents: AgentDescriptor[] = [
  { id: 'triage', name: 'Case triage', model: 'gpt-4.1', version: '6' },
  { id: 'explain', name: 'Label explainer', model: 'gpt-4o', version: '2' },
];

describe('AgentPicker', () => {
  it('selects an agent by id', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { getByRole } = renderWithKit(
      <AgentPicker agents={agents} selectedId="triage" onSelect={onSelect} />,
    );
    await user.click(getByRole('combobox', { name: 'Agent' }));
    await user.click(getByRole('option', { name: /Label explainer/ }));
    expect(onSelect).toHaveBeenCalledWith('explain');
  });
});

const message: AgentMessage = {
  id: 'm1', role: 'assistant', authorId: 'agent', text: 'done', createdAt: 0,
  toolCalls: [
    { id: 'c1', name: 'get_account', argumentsJson: '{}', status: 'succeeded' },
    { id: 'c2', name: 'create_note', argumentsJson: '{}', status: 'denied' },
  ],
  sources: [{ id: 's1', title: 'KB', kind: 'knowledge' }],
  usage: { inputTokens: 10, outputTokens: 5, durationMs: 900 },
};

describe('RunTimeline', () => {
  it('lists tool calls in ORDER with their status in text', async () => {
    const user = userEvent.setup();
    const { getByRole, container } = renderWithKit(<RunTimeline message={message} defaultOpen />);
    const steps = [...container.querySelectorAll('li')].map((li) => li.textContent);
    expect(steps).toHaveLength(2);
    expect(steps[0]).toMatch(/1\..*get_account.*succeeded/);
    expect(steps[1]).toMatch(/2\..*create_note.*denied/);
    await user.click(getByRole('button', { name: /Trace/ }));
  });

  it('renders nothing for a turn with no trace to show', () => {
    const { container } = renderWithKit(
      <RunTimeline message={{ id: 'x', role: 'assistant', authorId: 'a', text: 'hi', createdAt: 0 }} />,
    );
    expect(container.textContent).toBe('');
  });
});

const runs: AgentRunRecord[] = [
  { id: 'r1', status: 'succeeded', startedAt: Date.UTC(2026, 2, 12, 9), prompt: 'Summarise', correlationId: '8f3a', usage: { costUsd: 0.0009 } },
  { id: 'r2', status: 'notProvisioned', startedAt: Date.UTC(2026, 2, 12, 8) },
];

describe('RunHistoryPanel', () => {
  it('renders the fallback list, surfacing the correlation id', () => {
    const { container } = renderWithKit(<RunHistoryPanel runs={runs} locale="en-GB" />);
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(container.textContent).toContain('8f3a');
  });

  it('defers entirely to a supplied grid — the slot that replaces a second grid', () => {
    const { container } = renderWithKit(
      <RunHistoryPanel runs={runs} grid={<div data-testid="host-grid">grid</div>} />,
    );
    expect(container.querySelector('[data-testid="host-grid"]')).toBeTruthy();
    // The fallback must not ALSO render, or the host gets two histories.
    expect(container.querySelectorAll('li')).toHaveLength(0);
  });
});

describe('AgentOpsPanel', () => {
  it('composes availability, picker and history', () => {
    const { container, getByRole } = renderWithKit(
      <AgentOpsPanel
        availability={{ available: true, capabilities: { streaming: true, tools: true, citations: true, attachments: false, cancel: true } }}
        agents={agents}
        selectedAgentId="triage"
        onSelectAgent={() => {}}
        runs={runs}
        locale="en-GB"
      />,
    );
    expect(getByRole('combobox', { name: 'Agent' })).toBeTruthy();
    expect(container.textContent).toMatch(/Recent runs/);
    // Capabilities in words, so a host can hide affordances the provider cannot honour.
    expect(container.textContent).toMatch(/streaming/);
    expect(container.textContent).not.toMatch(/attachments/);
  });
});

describe('axe', () => {
  it('the ops family is clean', async () => {
    const { container } = renderWithKit(
      <div>
        <AgentOpsPanel
          availability={{ available: false, status: 'notProvisioned', reason: 'Not configured.' }}
          agents={agents}
          selectedAgentId="triage"
          onSelectAgent={() => {}}
          runs={runs}
        />
        <RunTimeline message={message} defaultOpen />
        <ThrottleNotice failure={{ status: 'error', message: 'Slow down.', recoverable: true, retryAfterMs: 2000 }} onRetry={() => {}} />
        <ModelBadge provider="foundry" model="gpt-4.1" version="6" />
        {ALL_STATUSES.map((s) => <AgentStatusBadge key={s} status={s} />)}
      </div>,
    );
    await expectNoAxeViolations(container);
  });
});
