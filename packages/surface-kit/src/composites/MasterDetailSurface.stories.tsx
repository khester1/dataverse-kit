import type { Meta, StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { MasterDetailSurface } from './MasterDetailSurface';
import { Section } from '../containers/Section';
import { FieldRow } from '../layouts/FieldRow';

interface Account {
  id: string;
  name: string;
  city: string;
  owner: string;
  revenue: string;
}

const ACCOUNTS: Account[] = [
  { id: '1', name: 'Contoso Ltd', city: 'Seattle', owner: 'Pat Smith', revenue: '$1,200,000' },
  { id: '2', name: 'Fabrikam Inc', city: 'Austin', owner: 'Lee Park', revenue: '$840,000' },
  { id: '3', name: 'Adventure Works', city: 'Denver', owner: 'Sam Diaz', revenue: '$2,450,000' },
  { id: '4', name: 'Tailwind Traders', city: 'Boston', owner: 'Robin Lee', revenue: '$610,000' },
];

/** A minimal selectable master list (in production this is typically a grid-kit grid). */
const MasterList: React.FC<{ selectedId?: string; onSelect: (id: string) => void }> = ({
  selectedId,
  onSelect,
}) => (
  <div aria-label="Accounts" style={{ display: 'flex', flexDirection: 'column' }}>
    {ACCOUNTS.map((a) => {
      const active = a.id === selectedId;
      return (
        <button
          key={a.id}
          type="button"
          aria-pressed={active}
          onClick={() => onSelect(a.id)}
          style={{
            textAlign: 'left',
            padding: '10px 12px',
            border: 'none',
            borderLeft: `3px solid ${active ? '#0078d4' : 'transparent'}`,
            background: active ? '#f3f9fd' : 'transparent',
            cursor: 'pointer',
            font: 'inherit',
          }}
        >
          <div style={{ fontWeight: 600 }}>{a.name}</div>
          <div style={{ fontSize: 12, color: '#605e5c' }}>{a.city}</div>
        </button>
      );
    })}
  </div>
);

const DetailView: React.FC<{ account: Account }> = ({ account }) => (
  <Section title={account.name} variant="flat" internalColumns={1}>
    <FieldRow label="City">{account.city}</FieldRow>
    <FieldRow label="Owner">{account.owner}</FieldRow>
    <FieldRow label="Annual Revenue">{account.revenue}</FieldRow>
  </Section>
);

const MasterDetailDemo: React.FC<{ splitRatio?: number; collapseBelow?: 'sm' | 'md' | 'lg' }> = ({
  splitRatio,
  collapseBelow,
}) => {
  const [selectedId, setSelectedId] = useState<string | undefined>(ACCOUNTS[0].id);
  const selected = ACCOUNTS.find((a) => a.id === selectedId);
  return (
    <MasterDetailSurface
      splitRatio={splitRatio}
      collapseBelow={collapseBelow}
      master={<MasterList selectedId={selectedId} onSelect={setSelectedId} />}
      detail={selected ? <DetailView account={selected} /> : undefined}
      detailFallback={
        <Section variant="placeholder" minHeight={160}>
          Select an account to see its details.
        </Section>
      }
    />
  );
};

const meta = {
  title: 'Surface Kit/Composites/Master-Detail',
  component: MasterDetailSurface,
  // master/detail are required props; the stories below drive them via `render`
  // (they need selection state), so satisfy the type with empty placeholders.
  args: { master: null, detail: null },
} satisfies Meta<typeof MasterDetailSurface>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default 38% master / 62% detail split; click a row to drive the detail pane. */
export const Default: Story = { render: () => <MasterDetailDemo /> };

/** Even 50/50 split via `splitRatio`. */
export const EvenSplit: Story = { render: () => <MasterDetailDemo splitRatio={0.5} /> };

/**
 * Stacks master OVER detail below the `lg` breakpoint. Switch the Viewport toolbar
 * to Tablet/Mobile to see the responsive collapse (surface-kit owns the cutoffs).
 */
export const CollapseBelowLg: Story = { render: () => <MasterDetailDemo collapseBelow="lg" /> };
