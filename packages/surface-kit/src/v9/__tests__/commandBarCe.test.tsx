import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FluentProvider } from '@fluentui/react-components';
import { Save16Regular } from '@fluentui/react-icons';
import { CommandSurface } from '../containers/CommandSurface';
import { FormSurface } from '../containers/FormSurface';
import { dynamicsCeTheme, dynamicsV9Theme } from '../theme';

// ★ jsdom does no layout. The command bar's geometry was matched to the org capture in a real
//   browser (every command within 0.2px, ce-parity "Forms/Account (main)"); these pin structure,
//   behaviour and the inline geometry handed to the browser.

const ce = ({ children }: { children: React.ReactNode }) => (
  <FluentProvider theme={dynamicsCeTheme}>
    <FormSurface look="ce">{children}</FormSurface>
  </FluentProvider>
);
const plain = ({ children }: { children: React.ReactNode }) => (
  <FluentProvider theme={dynamicsV9Theme}>{children}</FluentProvider>
);
const parts = (root: ParentNode, name: string) =>
  Array.from(root.querySelectorAll(`[data-surface-part="${name}"]`)) as HTMLElement[];

describe('v9 CommandSurface — look="ce"', () => {
  it('draws the card (page padding lives in a class, not an inline style)', () => {
    const { container } = render(<CommandSurface look="ce" items={[{ id: 's', label: 'Save' }]} />, { wrapper: ce });
    const root = parts(container, 'command-bar')[0];
    expect(root.dataset.look).toBe('ce');
    // Padding is a class now (host-overridable); its value is ceForm-derived and browser-verified.
    expect(root.getAttribute('style')).toBeNull();
    expect(parts(container, 'command-card')).toHaveLength(1);
  });

  it('back / pop-out buttons appear only when their handlers are given, each followed by a divider', () => {
    const onBack = vi.fn();
    const { container, rerender } = render(<CommandSurface look="ce" items={[]} />, { wrapper: ce });
    expect(parts(container, 'command-nav')).toHaveLength(0);
    rerender(<CommandSurface look="ce" items={[]} onBack={onBack} onPopOut={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Open in new window' })).toBeTruthy();
    // Measured widths (Fluent caps icon-only buttons at 32, so these are set explicitly).
    expect(parts(container, 'command-back')[0].style.width).toBe('42px');
    expect(parts(container, 'command-popout')[0].style.width).toBe('40px');
    expect(parts(container, 'command-nav')[0].querySelectorAll('[role="separator"]')).toHaveLength(2);
  });

  it('commands run their onClick; a menu command opens its menu; a split runs main + opens menu', async () => {
    const save = vi.fn();
    const connect = vi.fn();
    const another = vi.fn();
    render(
      <CommandSurface
        look="ce"
        items={[
          { id: 'save', label: 'Save', icon: <Save16Regular />, onClick: save },
          { id: 'process', label: 'Process', menuItems: [{ id: 'switch', label: 'Switch Process' }] },
          { id: 'connect', label: 'Connect', split: true, onClick: connect, menuItems: [{ id: 'a', label: 'To Another', onClick: another }] },
        ]}
      />,
      { wrapper: ce },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(save).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /Process/ }));
    expect(await screen.findByRole('menuitem', { name: 'Switch Process' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));
    expect(connect).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'More Connect options' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'To Another' }));
    expect(another).toHaveBeenCalledTimes(1);
  });

  it('the split chevron is 40 wide but overhangs its 35px slot by 5 (measured)', () => {
    const { container } = render(
      <CommandSurface look="ce" items={[{ id: 'c', label: 'Connect', split: true, menuItems: [{ id: 'a', label: 'A' }] }]} />,
      { wrapper: ce },
    );
    const chevron = parts(container, 'command-split-chevron')[0];
    expect(chevron.style.width).toBe('40px');
    expect(chevron.style.marginRight).toBe('-5px');
  });

  it('overflow ⋮ is 44 wide and lists the overflow items; far items render as outlined buttons', async () => {
    const { container } = render(
      <CommandSurface look="ce" items={[]} overflowItems={[{ id: 'w', label: 'Word Templates' }]} farItems={[{ id: 'share', label: 'Share' }]} />,
      { wrapper: ce },
    );
    const overflow = parts(container, 'command-overflow')[0];
    expect(overflow.style.width).toBe('44px');
    fireEvent.click(overflow);
    expect(await screen.findByRole('menuitem', { name: 'Word Templates' })).toBeTruthy();
    expect(parts(container, 'command-far-button')[0].textContent).toBe('Share');
  });
});

describe('v9 CommandSurface — review fixes', () => {
  it('is OPT-IN: inside a ce FormSurface it stays a plain toolbar unless look="ce" is passed', () => {
    const { container } = render(<CommandSurface items={[{ id: 's', label: 'Save' }]} />, { wrapper: ce });
    expect(parts(container, 'command-card')).toHaveLength(0);
  });

  it('look="ce" works with no FormSurface at all', () => {
    const { container } = render(<CommandSurface look="ce" items={[{ id: 's', label: 'Save' }]} />, { wrapper: plain });
    expect(parts(container, 'command-card')).toHaveLength(1);
  });

  it('primary commands keep Fluent\'s on-brand colours (the measured neutral colours are not applied)', () => {
    const { container } = render(
      <CommandSurface look="ce" items={[{ id: 'p', label: 'Primary', appearance: 'primary' }, { id: 's', label: 'Subtle' }]} />,
      { wrapper: plain },
    );
    const [primary, subtle] = parts(container, 'command');
    // jsdom cannot compute griffel colours, so read the attribute set by the same predicate that
    // applies the colour class; the colours themselves were checked in Chrome (ce-parity Record).
    expect(subtle.dataset.measuredColors).toBe('true');
    expect(primary.dataset.measuredColors).toBeUndefined();
    expect(primary.className).not.toBe(subtle.className);
  });

  it('page padding is a class, so a host className can override it (no inline padding)', () => {
    const { container } = render(<CommandSurface look="ce" items={[]} className="host" />, { wrapper: plain });
    const root = parts(container, 'command-bar')[0];
    expect(root.getAttribute('style')).toBeNull();
    expect(root.className).toContain('host');
  });

  it('menu triggers expose aria-haspopup; a far item with a menu opens it; nav/far are labelled groups', async () => {
    const { container } = render(
      <CommandSurface
        look="ce"
        onBack={() => {}}
        items={[{ id: 'p', label: 'Process', menuItems: [{ id: 'x', label: 'Switch' }] }]}
        farItems={[{ id: 'share', label: 'Share', menuItems: [{ id: 'w', label: 'Share with…' }] }]}
      />,
      { wrapper: plain },
    );
    expect(screen.getByRole('button', { name: /Process/ }).getAttribute('aria-haspopup')).toBe('menu');
    fireEvent.click(parts(container, 'command-far-button')[0]);
    expect(await screen.findByRole('menuitem', { name: 'Share with…' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Navigation' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Secondary commands' })).toBeTruthy();
  });

  it('a disabled split command disables both halves', () => {
    render(
      <CommandSurface look="ce" items={[{ id: 'c', label: 'Connect', split: true, disabled: true, menuItems: [{ id: 'a', label: 'A' }] }]} />,
      { wrapper: plain },
    );
    expect((screen.getByRole('button', { name: 'Connect' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'More Connect options' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('v9 CommandSurface — default look unchanged', () => {
  it('an item with menuItems is a working menu button in the default look too (never a dead button)', async () => {
    render(<CommandSurface items={[{ id: 'p', label: 'Process', menuItems: [{ id: 'x', label: 'Switch' }] }]} />, { wrapper: plain });
    fireEvent.click(screen.getByRole('button', { name: 'Process' }));
    expect(await screen.findByRole('menuitem', { name: 'Switch' })).toBeTruthy();
  });

  it('a split item keeps its onClick in the default look (main runs it, chevron opens the menu)', async () => {
    const connect = vi.fn();
    render(
      <CommandSurface items={[{ id: 'c', label: 'Connect', split: true, onClick: connect, menuItems: [{ id: 'a', label: 'To Another' }] }]} />,
      { wrapper: plain },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));
    expect(connect).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'More Connect options' }));
    expect(await screen.findByRole('menuitem', { name: 'To Another' })).toBeTruthy();
  });

  it('renders the plain toolbar with no ce card', () => {
    const { container } = render(<CommandSurface items={[{ id: 's', label: 'Save' }]} />, { wrapper: plain });
    expect(parts(container, 'command-card')).toHaveLength(0);
    expect(screen.getByRole('toolbar', { name: 'Commands' })).toBeTruthy();
  });
});
