import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { FluentCalendar } from './FluentCalendar';

const events = [{ id: 'a', title: 'Alpha consult', start: '2026-09-28T00:00:00.000Z', end: '2026-09-28T01:00:00.000Z' }];

describe('FluentCalendar', () => {
  it('renders the same events inside a FluentProvider', () => {
    render(
      <FluentProvider theme={webLightTheme}>
        <FluentCalendar events={events} view="list" initialDate="2026-09-28" aria-label="Clinic schedule" />
      </FluentProvider>
    );
    expect(screen.getByRole('region', { name: 'Clinic schedule' })).toBeTruthy();
    expect(screen.getAllByText('Alpha consult')).toHaveLength(1);
  });

  it('the Fluent button class lands on EVERY toolbar button (a selector-based rule matched none)', () => {
    const { container } = render(
      <FluentProvider theme={webLightTheme}>
        <FluentCalendar events={[]} view="week" initialDate="2026-09-28" classNames={{ button: 'probe-btn' }} />
      </FluentProvider>
    );
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(3);
    expect(container.querySelectorAll('button.probe-btn').length).toBe(buttons.length);
  });

  it('themes the calendar through Fluent TOKENS (CSS var references), so it follows the host theme', () => {
    const { container } = render(
      <FluentProvider theme={webLightTheme}>
        <FluentCalendar events={[]} view="list" initialDate="2026-09-28" />
      </FluentProvider>
    );
    const root = container.querySelector('[data-calendar-kit]') as HTMLElement;
    expect(root.style.getPropertyValue('--fc-classic-primary')).toMatch(/^var\(--colorBrandBackground\)$/);
    expect(root.style.getPropertyValue('--fc-classic-background')).toMatch(/^var\(--colorNeutralBackground1\)$/);
  });
});
