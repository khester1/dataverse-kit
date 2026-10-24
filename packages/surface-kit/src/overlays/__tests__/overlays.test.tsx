import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FormDialogSurface } from '../FormDialogSurface';
import { ModalSurface } from '../ModalSurface';
import { PanelSurface } from '../PanelSurface';
import { CalloutSurface } from '../CalloutSurface';
import { TooltipSurface } from '../TooltipSurface';

// Modal/Panel/Callout render through a Layer into document.body — screen still finds them.

describe('FormDialogSurface', () => {
  it('renders title, counter, footer, and children when open', () => {
    render(
      <FormDialogSurface isOpen title="Edit Account" recordCounter={{ current: 2, total: 5 }} footer={<button>Save</button>}>
        <div>dialog-body</div>
      </FormDialogSurface>,
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
    );
    expect(screen.queryByText('nope')).toBeNull();
  });

  it('fires onDismiss from the close button', () => {
    const onDismiss = vi.fn();
    render(
      <FormDialogSurface isOpen title="X" onDismiss={onDismiss}>
        <div>b</div>
      </FormDialogSurface>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onDismiss).toHaveBeenCalled();
  });
});

describe('ModalSurface', () => {
  it('renders title + children', () => {
    render(
      <ModalSurface isOpen title="Quick Modal">
        <div>modal-body</div>
      </ModalSurface>,
    );
    expect(screen.getByText('Quick Modal')).toBeTruthy();
    expect(screen.getByText('modal-body')).toBeTruthy();
  });
});

describe('PanelSurface', () => {
  it('renders headerText + children when open', () => {
    render(
      <PanelSurface isOpen title="Details" width={600}>
        <div>panel-body</div>
      </PanelSurface>,
    );
    expect(screen.getByText('Details')).toBeTruthy();
    expect(screen.getByText('panel-body')).toBeTruthy();
  });
});

describe('CalloutSurface', () => {
  it('renders children when open and nothing when closed', () => {
    const { rerender } = render(
      <CalloutSurface target={null} isOpen>
        <div>callout-body</div>
      </CalloutSurface>,
    );
    expect(screen.getByText('callout-body')).toBeTruthy();
    rerender(
      <CalloutSurface target={null} isOpen={false}>
        <div>callout-body</div>
      </CalloutSurface>,
    );
    expect(screen.queryByText('callout-body')).toBeNull();
  });
});

describe('FormDialogSurface (headerless)', () => {
  it('renders children only and no close button when no title/counter/onDismiss', () => {
    render(
      <FormDialogSurface isOpen>
        <div>headerless-body</div>
      </FormDialogSurface>,
    );
    expect(screen.getByText('headerless-body')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  });
});

describe('PanelSurface (custom width)', () => {
  it('renders the custom panelType + children', () => {
    render(
      <PanelSurface isOpen title="Narrow" panelType="custom" width={420}>
        <div>custom-panel-body</div>
      </PanelSurface>,
    );
    expect(screen.getByText('custom-panel-body')).toBeTruthy();
  });
});

describe('TooltipSurface', () => {
  it('renders its trigger child', () => {
    render(
      <TooltipSurface content="A helpful tip">
        <button>hover me</button>
      </TooltipSurface>,
    );
    expect(screen.getByRole('button', { name: 'hover me' })).toBeTruthy();
  });
});
