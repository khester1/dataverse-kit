import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FluentProvider } from '@fluentui/react-components';
import { FormDialogSurface } from '../overlays/FormDialogSurface';
import { ModalSurface } from '../overlays/ModalSurface';
import { PanelSurface } from '../overlays/PanelSurface';
import { CalloutSurface } from '../overlays/CalloutSurface';
import { TooltipSurface } from '../overlays/TooltipSurface';
import { dynamicsV9Theme } from '../theme';

// v9 Dialog/Drawer/Popover portal through a mount node — screen still finds them.
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <FluentProvider theme={dynamicsV9Theme}>{children}</FluentProvider>
);

describe('v9 FormDialogSurface', () => {
  it('renders title, counter, footer, and children when open', () => {
    render(
      <FormDialogSurface isOpen title="Edit Account" recordCounter={{ current: 2, total: 5 }} footer={<button>Save</button>}>
        <div>dialog-body</div>
      </FormDialogSurface>,
      { wrapper },
    );
    expect(screen.getByText('Edit Account')).toBeTruthy();
    expect(screen.getByText('2 of 5')).toBeTruthy();
    expect(screen.getByText('dialog-body')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });

  it('renders nothing visible when closed', () => {
    render(
      <FormDialogSurface isOpen={false} title="Hidden">
        <div>nope</div>
      </FormDialogSurface>,
      { wrapper },
    );
    expect(screen.queryByText('nope')).toBeNull();
  });

  it('fires onDismiss from the close button', () => {
    const onDismiss = vi.fn();
    render(
      <FormDialogSurface isOpen title="X" onDismiss={onDismiss}>
        <div>b</div>
      </FormDialogSurface>,
      { wrapper },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('headerless: renders children only and no close button when no title/counter/onDismiss', () => {
    render(
      <FormDialogSurface isOpen>
        <div>headerless-body</div>
      </FormDialogSurface>,
      { wrapper },
    );
    expect(screen.getByText('headerless-body')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  });
});

describe('v9 ModalSurface', () => {
  it('renders title + children', () => {
    render(
      <ModalSurface isOpen title="Quick Modal">
        <div>modal-body</div>
      </ModalSurface>,
      { wrapper },
    );
    expect(screen.getByText('Quick Modal')).toBeTruthy();
    expect(screen.getByText('modal-body')).toBeTruthy();
  });
});

describe('v9 PanelSurface', () => {
  it('renders title + children when open', () => {
    render(
      <PanelSurface isOpen title="Details" width={600}>
        <div>panel-body</div>
      </PanelSurface>,
      { wrapper },
    );
    expect(screen.getByText('Details')).toBeTruthy();
    expect(screen.getByText('panel-body')).toBeTruthy();
  });

  it('fires onDismiss from the close button', () => {
    const onDismiss = vi.fn();
    render(
      <PanelSurface isOpen title="Narrow" width={420} onDismiss={onDismiss}>
        <div>custom-panel-body</div>
      </PanelSurface>,
      { wrapper },
    );
    expect(screen.getByText('custom-panel-body')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onDismiss).toHaveBeenCalled();
  });
});

describe('v9 CalloutSurface', () => {
  it('renders children when open and nothing when closed', () => {
    const { rerender } = render(
      <CalloutSurface target={null} isOpen>
        <div>callout-body</div>
      </CalloutSurface>,
      { wrapper },
    );
    expect(screen.getByText('callout-body')).toBeTruthy();
    rerender(
      <FluentProvider theme={dynamicsV9Theme}>
        <CalloutSurface target={null} isOpen={false}>
          <div>callout-body</div>
        </CalloutSurface>
      </FluentProvider>,
    );
    expect(screen.queryByText('callout-body')).toBeNull();
  });
});

describe('v9 TooltipSurface', () => {
  it('renders its trigger child (relationship="label" makes the content the aria-label)', () => {
    render(
      <TooltipSurface content="A helpful tip">
        <button>hover me</button>
      </TooltipSurface>,
      { wrapper },
    );
    // The child renders; v9 labels it with the tooltip content (accessible name = "A helpful tip").
    expect(screen.getByText('hover me')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'A helpful tip' })).toBeTruthy();
  });
});
