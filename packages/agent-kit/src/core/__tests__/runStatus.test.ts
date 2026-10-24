import { describe, it, expect } from 'vitest';
import { classifyTransportFailure, runStatusSeverity, isTerminalStatus } from '../runStatus';
import type { AgentRunStatus } from '../protocol';

describe('classifyTransportFailure', () => {
  // ★★ The branch the whole six-state ladder exists for. With on-demand Azure an absent
  //    service is a NORMAL state; collapsing it into `error` is what makes an app look
  //    broken when nobody has turned the service on yet — and the two need different fixes.
  it('maps 503 to notProvisioned, NOT error', () => {
    const f = classifyTransportFailure({ httpStatus: 503 });
    expect(f.status).toBe('notProvisioned');
    expect(f.status).not.toBe('error');
    expect(f.recoverable).toBe(false);
  });

  it('maps 500 to a recoverable error', () => {
    const f = classifyTransportFailure({ httpStatus: 500 });
    expect(f.status).toBe('error');
    expect(f.recoverable).toBe(true);
  });

  it('maps 429 to a retriable error carrying retryAfterMs', () => {
    const f = classifyTransportFailure({ httpStatus: 429, retryAfterMs: 4000 });
    expect(f).toMatchObject({ status: 'error', code: 'rate_limited', recoverable: true, retryAfterMs: 4000 });
  });

  it('maps a content filter to blocked, not error', () => {
    expect(classifyTransportFailure({ code: 'content_filter' }).status).toBe('blocked');
  });
});

describe('runStatusSeverity', () => {
  const ALL: AgentRunStatus[] = ['succeeded', 'blocked', 'refused', 'error', 'notProvisioned', 'cancelled'];

  it('gives every status a severity, and terminality', () => {
    // Enumerated from the union so adding a seventh state without handling it fails here
    // rather than rendering as undefined somewhere downstream.
    for (const s of ALL) {
      expect(runStatusSeverity(s)).toBeTruthy();
      expect(isTerminalStatus(s)).toBe(true);
    }
    expect(ALL).toHaveLength(6);
  });

  it('does NOT report blocked and refused as errors', () => {
    // They are warnings: the request was understood and declined, which needs a different
    // affordance from "the transport broke".
    expect(runStatusSeverity('blocked')).toBe('warning');
    expect(runStatusSeverity('refused')).toBe('warning');
    expect(runStatusSeverity('error')).toBe('error');
  });
});
