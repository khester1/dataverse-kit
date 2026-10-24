import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { CalendarView } from './CalendarView';
import { tokyo } from '../__tests__/zones';

const events = [
  { id: 'a', title: 'Alpha consult', start: '2026-09-28T00:00:00.000Z', end: '2026-09-28T01:00:00.000Z' },
  { id: 'b', title: 'Bravo all day', start: '2026-09-29', end: '2026-09-30' },
  { id: 'c', title: 'Charlie floating', start: '2026-09-30T09:00:00' },
];

describe('CalendarView renders', () => {
  it('every event, in the list view (no layout measurement needed)', () => {
    render(<CalendarView events={events} zone={tokyo} view="list" initialDate="2026-09-28" />);
    // ★ Count the structure, not a screenshot: exactly these three titles, each once.
    for (const t of ['Alpha consult', 'Bravo all day', 'Charlie floating']) expect(screen.getAllByText(t)).toHaveLength(1);
  });

  it('shows the instant on the TOKYO day (Mon 28th 09:00), not the process-zone day', () => {
    render(<CalendarView events={[events[0]]} zone={tokyo} view="list" initialDate="2026-09-28" />);
    // ★ The DAY row, found by role (measured list-view DOM): "Monday September 28, 2026 9:00 – 10:00am".
    //   00:00Z is Mon 09:00 in Tokyo and Sun 17:00 in Los Angeles — the process zone would say Sunday.
    const day = screen.getByText('Alpha consult').closest('[role="listitem"]');
    expect(day?.textContent ?? '').toContain('September 28');
    expect(day?.textContent ?? '').toMatch(/9:00\s*[–-]\s*10:00\s*am/i);
  });

  it('is a labelled region', () => {
    render(<CalendarView events={events} view="list" initialDate="2026-09-28" aria-label="Clinic schedule" />);
    expect(screen.getByRole('region', { name: 'Clinic schedule' })).toBeTruthy();
  });

  it('renders the TIME-GRID views without throwing (an unset option once crashed them)', () => {
    for (const view of ['week', 'workWeek', 'day', 'month'] as const) {
      const { unmount, container } = render(<CalendarView events={events} zone={tokyo} view={view} initialDate="2026-09-28" />);
      expect(container.querySelectorAll('button').length).toBeGreaterThan(3);
      unmount();
    }
  });
});
