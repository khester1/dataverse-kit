import * as React from 'react';
import { render, type RenderResult } from '@testing-library/react';
import axe from 'axe-core';
import { AgentKitHostProvider } from '../../host/AgentKitHostProvider';
import type { AgentMessage } from '../../core';

export const T0 = Date.UTC(2026, 2, 12, 14, 0, 0);

export function msg(over: Partial<AgentMessage> & Pick<AgentMessage, 'id'>): AgentMessage {
  return { role: 'user', authorId: 'u1', text: 'hello', createdAt: T0, ...over };
}

/**
 * Every component test renders through the real provider chain.
 *
 * ★ The returned `rerender` re-wraps in the SAME provider. Calling RTL's raw `rerender` with a
 *   different tree shape remounts the subject — which silently re-fires mount effects and made
 *   the autoscroll counts read 2 and 1 instead of 1 and 0. The bug was in the harness, and it
 *   looked exactly like a bug in the component.
 */
export function renderWithKit(ui: React.ReactElement): RenderResult {
  const result = render(<AgentKitHostProvider idPrefix="test-">{ui}</AgentKitHostProvider>);
  const rerender = (next: React.ReactNode): void =>
    result.rerender(<AgentKitHostProvider idPrefix="test-">{next}</AgentKitHostProvider>);
  return { ...result, rerender };
}

/**
 * Run axe over a container.
 *
 * ★ `color-contrast` is DISABLED, and that is not a convenience. jsdom performs no layout and
 *   computes no rendered colour, so the rule cannot evaluate — leaving it on produces a result
 *   that carries no information either way, which is worse than omitting it. Contrast belongs
 *   to the Chromatic baseline, not here.
 *
 * ★ Proven non-vacuous: `axe-core` under this jsdom does flag a real violation (verified with
 *   a bare `<img>` → `image-alt`), so a green result here means the rules ran.
 */
export async function expectNoAxeViolations(container: HTMLElement): Promise<void> {
  const results = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  });
  const summary = results.violations.map(
    (v) => `${v.id}: ${v.help} (${v.nodes.length} node(s))\n    ${v.nodes[0]?.html ?? ''}`,
  );
  if (summary.length > 0) throw new Error(`axe violations:\n  ${summary.join('\n  ')}`);
}
