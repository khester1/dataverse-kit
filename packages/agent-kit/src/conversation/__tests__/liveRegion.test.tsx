import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { waitFor } from '@testing-library/react';
import { MessageList } from '../MessageList';
import { Composer } from '../Composer';
import { useConversation } from '../../hooks';
import { MockAgentService, immediateScheduler } from '../../services';
import { renderWithKit } from './testUtils';

/**
 * ★★ THE LIVE-REGION GATE.
 *
 * The kit's primary output is a streamed answer, and both naive choices are wrong: no live
 * region and a screen-reader user never hears it; a live region on the streaming node and
 * every token is queued for announcement, so NVDA and JAWS re-read the growing string and
 * never finish.
 *
 * The rule is therefore "announce on a state TRANSITION, never on a delta", and this is the
 * assertion that can tell the two apart — the same shape as the autoscroll gate beside it.
 */

function Harness({ scenario }: { scenario: 'longAnswer' | 'error' }): React.ReactElement {
  const service = React.useMemo(
    () => new MockAgentService({ scenario, scheduler: immediateScheduler, firstTokenMs: 0, chunkMs: 0, seed: 1 }),
    [scenario],
  );
  const conversation = useConversation({ service, createId: () => 'fixed-id' });
  return (
    <div>
      <MessageList messages={conversation.state.messages} announcement={conversation.announcement} now={0} timeZone="UTC" />
      <Composer value="go" onChange={() => {}} onSend={() => void conversation.send('go')} />
    </div>
  );
}

/**
 * ★ The waits below carry an explicit 8s timeout. The announcement lands only once all 200
 *   deltas have driven a React state update, and on a loaded machine that overruns waitFor's
 *   1s default — observed as a flake in roughly 3 runs of 4 while builds were running
 *   concurrently, failing as `expected '' to match /Response complete/`. The claim under test is
 *   "ONE announcement", not "within one second", so the timeout is what gives, not the
 *   assertion. The gate stays falsifiable: it still fails if the text never arrives, and the
 *   per-token defect is pinned separately and deterministically in core/__tests__/announce.
 */
describe('LiveAnnouncer', () => {
  it('mutates ONCE across a 200-delta answer, not once per delta', async () => {
    const { container, getByRole } = renderWithKit(<Harness scenario="longAnswer" />);
    const polite = container.querySelector('[data-testid="agentkit-live-polite"]') as HTMLElement;
    expect(polite).toBeTruthy();

    // ★ Count ANNOUNCEMENTS, not MutationObserver callbacks.
    //
    //   Counting callbacks was FLAKY — ~2 runs in 6. The observer batches records, so the
    //   clear-then-set repeat trick arrives as one batch or two depending on timing, and the
    //   assertion was measuring that batching rather than the claim. An announcement is a
    //   transition to a NEW NON-EMPTY value, which is deterministic and is also what the rule
    //   actually says.
    const announced: string[] = [];
    const observer = new MutationObserver(() => {
      const text = polite.textContent ?? '';
      if (text && text !== announced[announced.length - 1]) announced.push(text);
    });
    observer.observe(polite, { childList: true, characterData: true, subtree: true });

    getByRole('button', { name: /send/i }).click();

    await waitFor(() => expect(polite.textContent).toMatch(/Response complete/), { timeout: 8000 });
    observer.disconnect();

    // Stimulus landed: the answer really did stream 200 words through the transcript.
    // ★ The LAST streaming-text node, not the first — querySelector returns the USER message
    //   ("go"), whose single word would satisfy a sloppier assertion and make this check
    //   pass while proving nothing about the answer.
    const bubbles = container.querySelectorAll('[data-testid="agentkit-streaming-text"]');
    const answer = bubbles[bubbles.length - 1];
    expect(answer?.textContent?.split(/\s+/).filter(Boolean).length).toBeGreaterThan(150);

    // ONE announcement for a 200-delta answer. A live region over the streaming node would
    // produce ~200 here, which is the defect this rule exists to prevent.
    expect(announced).toEqual(['Response complete, 200 words.']);
    expect(polite.textContent).toBe('Response complete, 200 words.');
  });

  it('summarises a long answer rather than reading all of it', async () => {
    const { container, getByRole } = renderWithKit(<Harness scenario="longAnswer" />);
    const polite = container.querySelector('[data-testid="agentkit-live-polite"]') as HTMLElement;
    getByRole('button', { name: /send/i }).click();
    await waitFor(() => expect(polite.textContent).toBeTruthy(), { timeout: 8000 });
    // The full 200-word answer would be unusable read aloud in a polite region.
    expect(polite.textContent!.length).toBeLessThan(60);
  });

  it('routes a failure to the ASSERTIVE region, not the polite one', async () => {
    const { container, getByRole } = renderWithKit(<Harness scenario="error" />);
    const polite = container.querySelector('[data-testid="agentkit-live-polite"]') as HTMLElement;
    const assertive = container.querySelector('[data-testid="agentkit-live-assertive"]') as HTMLElement;

    getByRole('button', { name: /send/i }).click();
    await waitFor(() => expect(assertive.textContent).toMatch(/rate limited/i), { timeout: 8000 });
    // An error announced politely is an error the user waits through.
    expect(polite.textContent).toBe('');
  });
});
