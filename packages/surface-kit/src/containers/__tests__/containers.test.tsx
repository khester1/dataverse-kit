import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Section } from '../Section';
import { FormSurface } from '../FormSurface';
import { ActionBar } from '../ActionBar';
import { FormHeader } from '../FormHeader';

describe('Section', () => {
  it('renders a card title + children', () => {
    render(
      <Section title="General" columnSpan={6}>
        <div>field</div>
      </Section>,
    );
    expect(screen.getByText('General')).toBeTruthy();
    expect(screen.getByText('field')).toBeTruthy();
  });

  it('placeholder variant renders no children', () => {
    render(
      <Section variant="placeholder" columnSpan={6}>
        <div>hidden</div>
      </Section>,
    );
    expect(screen.queryByText('hidden')).toBeNull();
  });

  it('collapsible + defaultCollapsed hides the body', () => {
    render(
      <Section title="Coll" collapsible defaultCollapsed columnSpan={12}>
        <div>body</div>
      </Section>,
    );
    expect(screen.queryByText('body')).toBeNull();
    // expanding via the chevron reveals the body
    fireEvent.click(screen.getByRole('button', { name: 'Expand section' }));
    expect(screen.getByText('body')).toBeTruthy();
  });
});

describe('FormSurface', () => {
  it('renders children', () => {
    render(
      <FormSurface>
        <div>section</div>
      </FormSurface>,
    );
    expect(screen.getByText('section')).toBeTruthy();
  });
});

describe('ActionBar', () => {
  it('renders buttons and fires onClick', () => {
    const onClick = vi.fn();
    render(<ActionBar buttons={[{ id: 'save', label: 'Save', appearance: 'primary', onClick }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('omits hidden buttons', () => {
    render(<ActionBar buttons={[{ id: 'x', label: 'Hidden', hidden: true }]} />);
    expect(screen.queryByText('Hidden')).toBeNull();
  });

  it('inverted reverses the right cluster so the primary leads', () => {
    render(
      <ActionBar
        inverted
        buttons={[
          { id: 'saveClose', label: 'Save & Close' },
          { id: 'save', label: 'Save', appearance: 'primary' },
        ]}
      />,
    );
    const labels = screen.getAllByRole('button').map((b) => b.textContent);
    expect(labels).toEqual(['Save', 'Save & Close']);
  });

  it('alignment sets the right cluster justification', () => {
    render(<ActionBar alignment="center" buttons={[{ id: 'save', label: 'Save' }]} />);
    const cluster = screen.getByRole('button', { name: 'Save' }).parentElement as HTMLElement;
    expect(cluster.style.justifyContent).toBe('center');
  });
});

describe('FormHeader', () => {
  it('renders headerFields as value + label pairs', () => {
    render(
      <FormHeader
        title="Contoso"
        headerFields={[
          { label: 'Annual Revenue', value: '$5,000,000' },
          { label: 'Owner', value: 'A. Reyes' },
        ]}
      />,
    );
    expect(screen.getByText('$5,000,000')).toBeTruthy();
    expect(screen.getByText('Annual Revenue')).toBeTruthy();
    expect(screen.getByText('A. Reyes')).toBeTruthy();
    expect(screen.getByText('Owner')).toBeTruthy();
  });
});
