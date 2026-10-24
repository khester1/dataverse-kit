import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MasterDetailSurface } from '../MasterDetailSurface';
import { DashboardSurface } from '../DashboardSurface';

describe('MasterDetailSurface', () => {
  it('renders both panes', () => {
    render(<MasterDetailSurface master={<div>master-pane</div>} detail={<div>detail-pane</div>} />);
    expect(screen.getByText('master-pane')).toBeTruthy();
    expect(screen.getByText('detail-pane')).toBeTruthy();
  });

  it('renders detailFallback when detail is null', () => {
    render(<MasterDetailSurface master={<div>m</div>} detail={null} detailFallback={<div>nothing-selected</div>} />);
    expect(screen.getByText('nothing-selected')).toBeTruthy();
  });
});

describe('DashboardSurface', () => {
  it('renders every tile', () => {
    render(
      <DashboardSurface
        tiles={[<div key="1">tile-1</div>, <div key="2">tile-2</div>, <div key="3">tile-3</div>]}
      />,
    );
    expect(screen.getByText('tile-1')).toBeTruthy();
    expect(screen.getByText('tile-2')).toBeTruthy();
    expect(screen.getByText('tile-3')).toBeTruthy();
  });
});
