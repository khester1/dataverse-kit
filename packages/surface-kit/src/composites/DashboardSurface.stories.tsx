import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';
import { DashboardSurface } from './DashboardSurface';
import { Section } from '../containers/Section';

/** A big-number KPI tile body. */
const Kpi: React.FC<{ value: string; caption: string }> = ({ value, caption }) => (
  <div>
    <div style={{ fontSize: 32, fontWeight: 700, color: '#323130', lineHeight: 1.1 }}>{value}</div>
    <div style={{ fontSize: 12, color: '#605e5c', marginTop: 4 }}>{caption}</div>
  </div>
);

const RecentList: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    {['Contoso Ltd', 'Fabrikam Inc', 'Adventure Works', 'Tailwind Traders'].map((n) => (
      <div key={n} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
        <span>{n}</span>
        <span style={{ color: '#605e5c' }}>Active</span>
      </div>
    ))}
  </div>
);

const TILES = [
  <Section key="open" title="Open Opportunities" variant="card">
    <Kpi value="42" caption="+8 this week" />
  </Section>,
  <Section key="rev" title="Revenue (QTD)" variant="card">
    <Kpi value="$1.2M" caption="78% to target" />
  </Section>,
  <Section key="won" title="Win Rate" variant="card">
    <Kpi value="61%" caption="Last 90 days" />
  </Section>,
  <Section key="recent" title="Recent Accounts" variant="card">
    <RecentList />
  </Section>,
];

const meta = {
  title: 'Surface Kit/Composites/Dashboard',
  component: DashboardSurface,
  args: { tiles: TILES, columns: 2 },
} satisfies Meta<typeof DashboardSurface>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Two columns; reflows to one below the small breakpoint (try the Mobile viewport). */
export const TwoColumns: Story = {};

/** Three across for wider dashboards. */
export const ThreeColumns: Story = { args: { columns: 3 } };

/** Single column — e.g. a narrow side panel or a phone. */
export const SingleColumn: Story = { args: { columns: 1 } };
