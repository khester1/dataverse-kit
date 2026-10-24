import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import userEvent from '@testing-library/user-event';
import { AgentLauncher } from '../AgentLauncher';
import { AssistantPanel } from '../AssistantPanel';
import { FeedbackPanel } from '../FeedbackPanel';
import { renderWithKit } from '../../conversation/__tests__/testUtils';

const icon = <span aria-hidden="true">i</span>;

/**
 * ★★ THE ARIA THESE THREE HAND-ROLL, ASSERTED DIRECTLY.
 *
 * All three are in-tree rather than Fluent TabList/Menu, because one Fluent Menu costs +185 KB and
 * 2 attrHandlers.set calls in a PCF bundle (measured 2026-09-25). That trade is only defensible if
 * the ARIA they replace is actually correct, and axe cannot see most of it — it has no rule for a
 * tab whose aria-controls dangles, nor for a button whose only name appears on hover.
 */
describe('AgentLauncher — collapsed must not mean unnamed', () => {
  it('keeps the label in the accessible name while visually collapsed', () => {
    renderWithKit(
      <AgentLauncher items={[{ id: 'help', label: 'Help & support', icon }]} onSelect={() => {}} />,
    );
    const btn = document.querySelector('button')!;
    // ★ The reference reveals text on hover only. If the kit did that, this would be an unnamed
    //   button to a screen reader at rest — the defect this assertion exists for.
    expect(btn.textContent).toContain('Help & support');
    expect(document.querySelector('[role="group"]')?.getAttribute('aria-label')).toBe('Assistant');
  });

  it('the ICON is the unshrinkable child, and the label is hidden by opacity not by clipping', () => {
    renderWithKit(
      <AgentLauncher items={[{ id: 'help', label: 'Help & support', icon: <svg /> }]} onSelect={() => {}} />,
    );
    const btn = document.querySelector('button')!;
    const [iconWrap, label] = [...btn.children] as HTMLElement[];

    // ★★ THE DEFECT THIS EXISTS FOR, reported on Chromatic build 18 as "the content is off screen".
    //    flexShrink was on the LABEL, so in a 44px pill the unshrinkable label took the whole
    //    content box and squeezed the icon to ZERO WIDTH — the collapsed rail showed two clipped
    //    letters instead of a glyph. jsdom cannot measure the SVG, but it can pin which child is
    //    allowed to shrink, which is the actual bug.
    expect(getComputedStyle(iconWrap).flexShrink).toBe('0');
    expect(getComputedStyle(label).flexShrink).not.toBe('0');

    // ★ Collapsed means INVISIBLE, not ABSENT — the accessible name must survive (see the
    //   component docstring). Opacity, never display/visibility, never a hover-only text swap.
    expect(getComputedStyle(label).opacity).toBe('0');
    expect(label.textContent).toBe('Help & support');
    expect(btn.textContent).toContain('Help & support');
  });

  it('renders nothing rather than an empty rail when there are no items', () => {
    renderWithKit(<AgentLauncher items={[]} onSelect={() => {}} />);
    expect(document.querySelector('[role="group"]')).toBeNull();
  });
});

describe('AssistantPanel — the in-tree tab strip', () => {
  const tabs = [{ id: 'chat', label: 'Chat' }, { id: 'history', label: 'History' }];

  it('marks only the active tab selected, and its aria-controls RESOLVES', () => {
    renderWithKit(
      <AssistantPanel title="Support Assistant" tabs={tabs} activeTabId="chat" onTabChange={() => {}} />,
    );
    const all = [...document.querySelectorAll('[role="tab"]')];
    expect(all.length).toBe(2);
    expect(all.map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false']);
    // ★ A DANGLING aria-controls raises no axe rule — it is silent. Resolve it.
    const panelId = all[0].getAttribute('aria-controls')!;
    expect(document.getElementById(panelId)).not.toBeNull();
    expect(document.getElementById(panelId)!.getAttribute('role')).toBe('tabpanel');
  });

  it('exposes exactly ONE tab stop for the strip (roving tabindex)', () => {
    renderWithKit(
      <AssistantPanel title="Support Assistant" tabs={tabs} activeTabId="chat" onTabChange={() => {}} />,
    );
    const tabbable = [...document.querySelectorAll('[role="tab"]')].filter((t) => t.getAttribute('tabindex') === '0');
    expect(tabbable.length).toBe(1);
  });

  it('arrows move focus WITHOUT selecting; Enter selects (manual activation)', async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    renderWithKit(
      <AssistantPanel title="Support Assistant" tabs={tabs} activeTabId="chat" onTabChange={onTabChange} />,
    );
    (document.querySelector('[role="tab"]') as HTMLElement).focus();

    await user.keyboard('{ArrowRight}');
    // ★ Pins the CHOICE, not just the behaviour. The kit's roving tabindex is manual-activation
    //   throughout, so arrowing must NOT fire the change — a component that quietly switched to
    //   automatic activation would be inconsistent with every other strip in the kit.
    expect(onTabChange).not.toHaveBeenCalled();
    expect(document.activeElement?.textContent).toContain('History');

    await user.keyboard('{Enter}');
    expect(onTabChange).toHaveBeenCalledWith('history');
  });

  it('moves the single tab stop when the host changes the tab externally', () => {
    const { rerender } = renderWithKit(
      <AssistantPanel title="Support Assistant" tabs={tabs} activeTabId="chat" onTabChange={() => {}} />,
    );
    rerender(
      <AssistantPanel title="Support Assistant" tabs={tabs} activeTabId="history" onTabChange={() => {}} />,
    );
    const tabbable = [...document.querySelectorAll('[role="tab"]')].filter((t) => t.getAttribute('tabindex') === '0');
    expect(tabbable.length).toBe(1);
    expect(tabbable[0].textContent).toContain('History');
  });

  it('keeps the pre-arrival status out of the transcript, as chrome', () => {
    renderWithKit(
      <AssistantPanel
        title="Support Assistant" tabs={tabs} activeTabId="chat" onTabChange={() => {}}
        status="Support Assistant will be with you in a moment"
      >
        <div data-testid="transcript">messages</div>
      </AssistantPanel>,
    );
    const status = [...document.querySelectorAll('div')].find((d) => d.textContent === 'Support Assistant will be with you in a moment');
    expect(status).toBeTruthy();
    // it must NOT be inside a live region — announcing it would interleave with the real reply
    expect(status!.closest('[aria-live]')).toBeNull();
  });
});

describe('FeedbackPanel — consent is required, and "unanswered" is not "no"', () => {
  const base = { rating: 0, comment: '' };

  it('blocks submit until BOTH a rating and a consent answer exist', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const Harness = () => {
      const [v, setV] = React.useState(base as { rating: number; comment: string; mayContact?: boolean });
      return <FeedbackPanel value={v} onChange={setV} onSubmit={onSubmit} />;
    };
    renderWithKit(<Harness />);
    const submit = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Submit')!;
    expect(submit.hasAttribute('disabled')).toBe(true);

    // rating alone is not enough — consent is still unanswered
    await user.click(document.querySelectorAll('[role="radio"]')[3] as HTMLElement);
    expect(submit.hasAttribute('disabled')).toBe(true);

    await user.click([...document.querySelectorAll('input[type="radio"]')][0] as HTMLElement);
    expect(submit.hasAttribute('disabled')).toBe(false);
    await user.click(submit);
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ rating: 4, mayContact: true }));
  });

  it('the star rating is a radiogroup with one checked radio', async () => {
    const user = userEvent.setup();
    const Harness = () => {
      const [v, setV] = React.useState(base as { rating: number; comment: string; mayContact?: boolean });
      return <FeedbackPanel value={v} onChange={setV} onSubmit={() => {}} />;
    };
    renderWithKit(<Harness />);
    const stars = [...document.querySelectorAll('[role="radio"]')];
    expect(stars.length).toBe(5);
    expect(document.querySelector('[role="radiogroup"]')).not.toBeNull();
    await user.click(stars[2] as HTMLElement);
    const checked = [...document.querySelectorAll('[role="radio"]')].filter((s) => s.getAttribute('aria-checked') === 'true');
    expect(checked.length).toBe(1);
    expect(checked[0].getAttribute('aria-label')).toBe('3 of 5');
  });
});

/**
 * ★★ THE DRAWER'S FOCUS CONTRACT. None of this is visible to axe: a drawer that never returns
 *    focus, one that traps it, and one that leaves a hidden panel tabbable are all conformant to
 *    an automated pass. Each assertion below was watched failing against a deliberate defect.
 */
describe('AssistantPanel — open/close focus and the deliberate absence of a trap', () => {
  const tabs = [{ id: 'chat', label: 'Chat' }];

  function Harness({ startOpen = false }: { startOpen?: boolean }) {
    const [open, setOpen] = React.useState(startOpen);
    return (
      <>
        <button type="button" data-testid="opener" onClick={() => setOpen(true)}>Open</button>
        <button type="button" data-testid="outside">Elsewhere</button>
        <AssistantPanel
          title="Support Assistant" tabs={tabs} activeTabId="chat" onTabChange={() => {}}
          open={open} onDismiss={() => setOpen(false)}
        />
      </>
    );
  }

  it('moves focus into the panel on open and BACK to the opener on close', async () => {
    const user = userEvent.setup();
    renderWithKit(<Harness />);
    const opener = document.querySelector('[data-testid="opener"]') as HTMLElement;

    await user.click(opener);
    const panel = document.querySelector('section[aria-label="Support Assistant"]')!;
    expect(panel.contains(document.activeElement)).toBe(true);

    // ★ The return target must be captured on OPEN. Reading activeElement at close time would
    //   find something inside the drawer, and focus would never come back.
    await user.keyboard('{Escape}');
    expect(document.activeElement).toBe(opener);
  });

  it('a closed panel is hidden from AT, not merely moved offscreen', () => {
    renderWithKit(<Harness startOpen={false} />);
    const panel = document.querySelector('section[aria-label="Support Assistant"]')!;
    // ★ A translated-off panel that is still in the a11y tree is tabbable — a keyboard user
    //   lands in a drawer they cannot see. visibility:hidden + aria-hidden is what prevents it.
    expect(panel.getAttribute('aria-hidden')).toBe('true');
    expect(getComputedStyle(panel).visibility).toBe('hidden');
  });

  it('does NOT trap focus — the page behind a non-modal drawer stays reachable', async () => {
    const user = userEvent.setup();
    renderWithKit(<Harness startOpen />);
    const outside = document.querySelector('[data-testid="outside"]') as HTMLElement;

    // ★ Pins the DESIGN CHOICE. A docked drawer claims no modality — no aria-modal, no inert
    //   backdrop — so trapping focus would strand a keyboard user with no way out. A future
    //   "improvement" that adds a trap must go red here.
    const panel = document.querySelector('section[aria-label="Support Assistant"]')!;
    expect(panel.getAttribute('aria-modal')).toBeNull();

    // ★★ TAB FORWARD FROM INSIDE, NOT FROM BEFORE. My first version tabbed from a button that
    //    PRECEDES the panel and asserted focus stayed out — but DOM order means Tab legitimately
    //    walks INTO the panel there. That test failed against correct code, which is the more
    //    dangerous direction: the tempting fix is to change the component. The claim is "focus can
    //    LEAVE", so it has to be measured from the last focusable inside.
    const inside = [...panel.querySelectorAll<HTMLElement>('button,[tabindex="0"]')];
    expect(inside.length).toBeGreaterThan(0);
    inside[inside.length - 1].focus();
    expect(panel.contains(document.activeElement)).toBe(true);

    for (let i = 0; i < 6 && panel.contains(document.activeElement); i++) {
      await user.keyboard('{Tab}');
    }
    expect(panel.contains(document.activeElement)).toBe(false);
    expect(outside).toBeTruthy();
  });

  it('Escape does nothing when the host gave no onDismiss', async () => {
    const user = userEvent.setup();
    renderWithKit(
      <AssistantPanel title="Support Assistant" tabs={tabs} activeTabId="chat" onTabChange={() => {}} open />,
    );
    const panel = document.querySelector('section[aria-label="Support Assistant"]') as HTMLElement;
    panel.focus();
    await user.keyboard('{Escape}');
    // still open — a panel must never close itself when the host owns the state
    expect(panel.getAttribute('aria-hidden')).toBeNull();
  });
});
