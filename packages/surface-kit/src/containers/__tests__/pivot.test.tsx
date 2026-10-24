import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PivotSurface } from '../PivotSurface';

const tabs = [
  { id: 'a', label: 'Alpha', content: <div>alpha-body</div> },
  { id: 'b', label: 'Beta', content: <div>beta-body</div> },
];

describe('PivotSurface', () => {
  it('renders the first tab content by default', () => {
    render(<PivotSurface tabs={tabs} />);
    expect(screen.getByText('alpha-body')).toBeTruthy();
    expect(screen.queryByText('beta-body')).toBeNull();
  });

  it('switches content on tab click (uncontrolled)', () => {
    render(<PivotSurface tabs={tabs} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Beta' }));
    expect(screen.getByText('beta-body')).toBeTruthy();
  });

  it('respects controlled selectedId and reports changes without self-updating', () => {
    const onTabChange = vi.fn();
    render(<PivotSurface tabs={tabs} selectedId="b" onTabChange={onTabChange} />);
    expect(screen.getByText('beta-body')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Alpha' }));
    expect(onTabChange).toHaveBeenCalledWith('a');
    // Controlled: content stays on 'b' until the parent updates selectedId.
    expect(screen.getByText('beta-body')).toBeTruthy();
  });

  it('seeds the first enabled tab when the first is disabled', () => {
    const t = [
      { id: 'x', label: 'X', content: <div>x-body</div>, disabled: true },
      { id: 'y', label: 'Y', content: <div>y-body</div> },
    ];
    render(<PivotSurface tabs={t} />);
    expect(screen.getByText('y-body')).toBeTruthy();
    expect(screen.queryByText('x-body')).toBeNull();
  });

  it('clicking a disabled tab neither switches content nor reports a change', () => {
    const onTabChange = vi.fn();
    const t = [
      { id: 'a', label: 'Alpha', content: <div>alpha-body</div> },
      { id: 'z', label: 'Zeta', content: <div>zeta-body</div>, disabled: true },
    ];
    render(<PivotSurface tabs={t} onTabChange={onTabChange} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Zeta' }));
    expect(onTabChange).not.toHaveBeenCalled();
    expect(screen.getByText('alpha-body')).toBeTruthy();
    expect(screen.queryByText('zeta-body')).toBeNull();
  });
});
