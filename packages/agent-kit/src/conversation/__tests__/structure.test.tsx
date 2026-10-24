import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import userEvent from '@testing-library/user-event';
import { MessageList } from '../MessageList';
import { Composer } from '../Composer';
import { EmptyConversation } from '../EmptyConversation';
import { SuggestedPrompts } from '../SuggestedPrompts';
import { Disclosure, ActionToolbar } from '../../internal';
import { renderWithKit, msg, T0 } from './testUtils';
import { CopyRegular } from '@fluentui/react-icons';

/**
 * ★★ THE ARIA THIS PACKAGE HAND-ROLLS, ASSERTED DIRECTLY.
 *
 * axe cannot see any of it — measured: it has no toolbar-name rule and does not report a
 * dangling `aria-controls`. Since the split-by-cost decision means the kit OWNS a roving
 * toolbar and a disclosure, these contracts have to be pinned by hand or nothing checks them.
 *
 * Each assertion below was watched failing against a deliberate defect.
 */

const actions = [
  { key: 'a', label: 'Copy', icon: <CopyRegular />, onClick: vi.fn() },
  { key: 'b', label: 'Retry', icon: <CopyRegular />, onClick: vi.fn() },
  { key: 'c', label: 'Rate', icon: <CopyRegular />, onClick: vi.fn() },
];

describe('ActionToolbar — the roving tabindex contract', () => {
  it('is a NAMED toolbar', () => {
    const { container } = renderWithKit(<ActionToolbar actions={actions} label="Message actions" />);
    const toolbar = container.querySelector('[role="toolbar"]')!;
    expect(toolbar).toBeTruthy();
    // axe has no rule for this. An unnamed toolbar is announced as "toolbar" and nothing else.
    expect(toolbar.getAttribute('aria-label')).toBe('Message actions');
  });

  it('exposes exactly ONE tab stop for the whole row', () => {
    const { container } = renderWithKit(<ActionToolbar actions={actions} label="Message actions" />);
    const buttons = [...container.querySelectorAll('button')];
    expect(buttons).toHaveLength(3);
    // Without a roving index this would be 3 — and a 20-message transcript would add 80 tab
    // stops between the reader and the composer.
    expect(buttons.filter((b) => b.tabIndex === 0)).toHaveLength(1);
    expect(buttons.filter((b) => b.tabIndex === -1)).toHaveLength(2);
  });

  it('moves focus with Left/Right and wraps, and jumps with Home/End', async () => {
    const user = userEvent.setup();
    const { container } = renderWithKit(<ActionToolbar actions={actions} label="Message actions" />);
    const buttons = [...container.querySelectorAll('button')];

    buttons[0].focus();
    expect(document.activeElement).toBe(buttons[0]);

    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(buttons[1]);

    await user.keyboard('{End}');
    expect(document.activeElement).toBe(buttons[2]);

    await user.keyboard('{ArrowRight}'); // wraps
    expect(document.activeElement).toBe(buttons[0]);

    await user.keyboard('{ArrowLeft}'); // wraps back
    expect(document.activeElement).toBe(buttons[2]);

    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(buttons[0]);
  });
});

describe('Disclosure — the APG contract', () => {
  it('wires aria-expanded and an aria-controls that RESOLVES', async () => {
    const user = userEvent.setup();
    const { container } = renderWithKit(
      <Disclosure id="sources" summary="Sources">
        <p>a source</p>
      </Disclosure>,
    );
    const trigger = container.querySelector('button')!;
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    const controls = trigger.getAttribute('aria-controls')!;
    // ★ axe reports NOTHING for a dangling aria-controls — neither violation nor incomplete.
    //   If this id does not resolve, the relationship the attribute claims does not exist.
    expect(controls).toBeTruthy();
    // ★ getElementById, not querySelector(`#id`): jsdom does not expose CSS.escape, and an
    //   unescaped id selector would throw on a React useId value (they contain colons).
    expect(document.getElementById(controls)).toBeTruthy();

    await user.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById(controls)?.textContent).toContain('a source');
  });

  it('labels the panel back to its trigger', () => {
    const { container } = renderWithKit(
      <Disclosure id="trace" summary="Trace" defaultOpen>
        <p>step</p>
      </Disclosure>,
    );
    const panel = container.querySelector('[role="region"]')!;
    expect(panel.getAttribute('aria-labelledby')).toBe('trace');
    expect(container.querySelector('#trace')).toBeTruthy();
  });
});

describe('Composer — the keyboard contract', () => {
  it('sends on Enter and inserts a newline on Shift+Enter', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    const onChange = vi.fn();
    renderWithKit(<Composer value="hello" onChange={onChange} onSend={onSend} />);

    const box = document.querySelector('textarea')!;
    box.focus();

    await user.keyboard('{Shift>}{Enter}{/Shift}');
    expect(onSend).not.toHaveBeenCalled();

    await user.keyboard('{Enter}');
    expect(onSend).toHaveBeenCalledWith('hello');
  });

  it('honours sendOn="mod+enter" for dictation-friendly hosts', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    renderWithKit(<Composer value="hello" onChange={() => {}} onSend={onSend} sendOn="mod+enter" />);
    const box = document.querySelector('textarea')!;
    box.focus();

    await user.keyboard('{Enter}');
    expect(onSend).not.toHaveBeenCalled();

    await user.keyboard('{Control>}{Enter}{/Control}');
    expect(onSend).toHaveBeenCalledWith('hello');
  });

  it('describes the send shortcut, so it is not folklore', () => {
    const { container } = renderWithKit(<Composer value="" onChange={() => {}} onSend={() => {}} />);
    const box = container.querySelector('textarea')!;
    const describedBy = box.getAttribute('aria-describedby')!;
    expect(document.getElementById(describedBy)?.textContent).toMatch(/Enter to send/i);
  });

  it('does not send blank input', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    renderWithKit(<Composer value="   " onChange={() => {}} onSend={onSend} />);
    document.querySelector('textarea')!.focus();
    await user.keyboard('{Enter}');
    expect(onSend).not.toHaveBeenCalled();
  });
});

describe('MessageActions — reachable without a pointer', () => {
  // ★★ A hover-only affordance is a WCAG 2.1.1 (Level A) failure outright: there is no
  //    keyboard route to it at all. The row is revealed by :hover OR focus-within, so tabbing
  //    into a message must expose its actions.
  it('reveals the action row on keyboard focus, not only on hover', async () => {
    const user = userEvent.setup();
    const { container } = renderWithKit(
      <MessageList
        messages={[msg({ id: 'a', role: 'assistant', authorId: 'agent', text: 'hi' })]}
        now={T0}
        timeZone="UTC"
        onCopy={() => {}}
      />,
    );
    const row = container.querySelector('[role="toolbar"]')!.parentElement!;
    const opacityOf = (el: Element) => getComputedStyle(el).opacity;

    expect(opacityOf(row)).toBe('0');
    await user.tab(); // into the transcript
    await user.tab(); // into the message subtree
    expect(opacityOf(row)).toBe('1');
  });
});

/**
 * ★★ THE COMPOSER'S TEAMS LAYOUT, AND THE A11Y IT TRADES AWAY TO GET IT.
 *
 * Matching Teams means the "Press Enter to send" hint stops being visible. That is a REMOVAL of
 * information from sighted users who could previously read it, and it is only acceptable while
 * the hint stays in the accessibility tree — so "hidden" here must mean CLIPPED, never
 * `display:none` or `visibility:hidden`, which would delete the only statement of the keyboard
 * contract for a screen-reader user.
 *
 * axe sees none of this: a visible hint and a clipped one are equally conformant, and so is a
 * deleted one, because `aria-describedby` pointing at nothing raises no axe rule (measured
 * earlier in this file's history for `aria-controls`).
 */
describe('Composer — the Teams send box', () => {
  const hintOf = () => {
    const ta = document.querySelector('textarea')!;
    const id = ta.getAttribute('aria-describedby')!;
    return document.getElementById(id);
  };

  it('keeps the keyboard hint in the a11y tree while hiding it from sight', () => {
    renderWithKit(<Composer value="hi" onChange={() => {}} onSend={() => {}} />);
    const hint = hintOf();

    // It must EXIST and say something — a dangling aria-describedby is silent, not an error.
    expect(hint).not.toBeNull();
    expect(hint!.textContent).toMatch(/Enter/);

    const cs = getComputedStyle(hint!);
    // Hidden from sight: clipped to a 1px box.
    expect(cs.position).toBe('absolute');
    expect(cs.width).toBe('1px');
    // ...but NOT removed from the tree. These two are the whole point.
    expect(cs.display).not.toBe('none');
    expect(cs.visibility).not.toBe('hidden');
  });

  it('puts the affordances and send button INSIDE the field container', () => {
    renderWithKit(
      <Composer
        value="hi"
        onChange={() => {}}
        onSend={() => {}}
        toolbar={<button type="button">Attach</button>}
      />,
    );
    const ta = document.querySelector('textarea')!;
    const send = document.querySelector('button[type="button"]:not([type="submit"])');
    expect(send).not.toBeNull();

    // The Teams shape is ONE rounded box holding both. Before this layout the send button was a
    // sibling of the field's wrapper and drifted to the far right of the composer.
    // ★ Fluent's Textarea root is a <span>, so the nearest div IS the rounded box. Climbing one
    //   more level reaches the wrapper, which legitimately holds the hint — that mistake made
    //   this assertion fail against correct code.
    const box = ta.closest('div')!;
    expect(box.contains(send)).toBe(true);
    expect(box.contains(ta)).toBe(true);
    // The hint is deliberately OUTSIDE the box, so it never affects its height.
    expect(box.contains(hintOf())).toBe(false);
  });

  it('grows by hard newline and stops at the cap', () => {
    const { unmount } = renderWithKit(<Composer value="one" onChange={() => {}} onSend={() => {}} />);
    expect(document.querySelector('textarea')!.getAttribute('rows')).toBe('1');
    unmount();

    renderWithKit(<Composer value={'a\nb\nc'} onChange={() => {}} onSend={() => {}} />);
    expect(document.querySelector('textarea')!.getAttribute('rows')).toBe('3');
    document.body.innerHTML = '';

    renderWithKit(<Composer value={Array(20).fill('x').join('\n')} onChange={() => {}} onSend={() => {}} />);
    expect(document.querySelector('textarea')!.getAttribute('rows')).toBe('6');
  });
});

/**
 * ★ Reported on Chromatic build 6 against `Conversation: Empty` — "Can we center the 'Try one of
 *   these' options?". The heading is `width: 100%` so it inherited the zero state's
 *   `text-align: center`, while the chips are flex children taking the row's justification, which
 *   defaulted to `flex-start`. Label centred, chips not: ONE apparent defect, TWO alignment
 *   mechanisms. Both assertions below exist because fixing either alone still looks wrong.
 *
 * ★ Pinned in BOTH directions. `SuggestedPrompts` also renders above the composer as "Suggested
 *   follow-ups", where left-packed is correct — so a global `justify-content: center` would have
 *   satisfied the report and broken the other caller silently.
 */
describe('SuggestedPrompts — alignment is per-caller', () => {
  const row = () => document.querySelector('[role="group"]') as HTMLElement;

  it('centres both the chips and the heading in the zero state', () => {
    renderWithKit(
      <EmptyConversation prompts={['Summarise this account', 'What is blocked?']} onPick={() => {}} />,
    );
    const g = row();
    expect(getComputedStyle(g).justifyContent).toBe('center');
    const heading = g.querySelector('span')!;
    expect(getComputedStyle(heading).textAlign).toBe('center');
  });

  it('leaves the follow-up row left-packed, which is the other caller', () => {
    renderWithKit(<SuggestedPrompts prompts={['Open case 4417']} onPick={() => {}} />);
    expect(getComputedStyle(row()).justifyContent).not.toBe('center');
  });
});
