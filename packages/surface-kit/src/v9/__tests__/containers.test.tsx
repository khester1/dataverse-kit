import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FluentProvider } from '@fluentui/react-components';
import { Section } from '../containers/Section';
import { FormSurface } from '../containers/FormSurface';
import { ActionBar } from '../containers/ActionBar';
import { PivotSurface } from '../containers/PivotSurface';
import { CommandSurface } from '../containers/CommandSurface';
import { FormHeader } from '../containers/FormHeader';
import { dynamicsV9Theme } from '../theme';

// Every v9 surface renders inside a FluentProvider (v9's theme/renderer context).
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <FluentProvider theme={dynamicsV9Theme}>{children}</FluentProvider>
);

describe('v9 Section', () => {
  it('renders a card title + children', () => {
    render(
      <Section title="General" columnSpan={6}>
        <div>field</div>
      </Section>,
      { wrapper },
    );
    expect(screen.getByText('General')).toBeTruthy();
    expect(screen.getByText('field')).toBeTruthy();
  });

  it('placeholder variant renders no children', () => {
    render(
      <Section variant="placeholder" columnSpan={6}>
        <div>hidden</div>
      </Section>,
      { wrapper },
    );
    expect(screen.queryByText('hidden')).toBeNull();
  });

  it('collapsible + defaultCollapsed hides the body; the chevron expands it', () => {
    render(
      <Section title="Coll" collapsible defaultCollapsed columnSpan={12}>
        <div>body</div>
      </Section>,
      { wrapper },
    );
    expect(screen.queryByText('body')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Expand section' }));
    expect(screen.getByText('body')).toBeTruthy();
  });

  it('renders a v9 Toolbar of commandItems in the header', () => {
    const onClick = vi.fn();
    render(
      <Section title="With commands" showCommandBar commandItems={[{ id: 'new', label: 'New', onClick }]}>
        <div>x</div>
      </Section>,
      { wrapper },
    );
    fireEvent.click(screen.getByRole('button', { name: 'New' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('v9 FormSurface', () => {
  it('renders children', () => {
    render(
      <FormSurface>
        <div>section</div>
      </FormSurface>,
      { wrapper },
    );
    expect(screen.getByText('section')).toBeTruthy();
  });
});

describe('v9 ActionBar', () => {
  it('renders buttons and fires onClick', () => {
    const onClick = vi.fn();
    render(<ActionBar buttons={[{ id: 'save', label: 'Save', appearance: 'primary', onClick }]} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('omits hidden buttons', () => {
    render(<ActionBar buttons={[{ id: 'x', label: 'Hidden', hidden: true }]} />, { wrapper });
    expect(screen.queryByText('Hidden')).toBeNull();
  });
});

describe('v9 PivotSurface', () => {
  it('renders tabs and switches the active panel', () => {
    render(
      <PivotSurface
        tabs={[
          { id: 'a', label: 'Tab A', content: <div>panel-a</div> },
          { id: 'b', label: 'Tab B', content: <div>panel-b</div> },
        ]}
      />,
      { wrapper },
    );
    expect(screen.getByText('panel-a')).toBeTruthy();
    expect(screen.queryByText('panel-b')).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Tab B' }));
    expect(screen.getByText('panel-b')).toBeTruthy();
  });
});

describe('v9 CommandSurface', () => {
  it('renders its items', () => {
    const onClick = vi.fn();
    render(<CommandSurface items={[{ id: 'refresh', label: 'Refresh', onClick }]} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('v9 FormHeader', () => {
  it('renders title + status', () => {
    render(<FormHeader title="Acme Corp" status="Active" />, { wrapper });
    expect(screen.getByText('Acme Corp')).toBeTruthy();
    expect(screen.getByText('Active')).toBeTruthy();
  });
});
