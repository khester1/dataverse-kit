import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';
import { FormHeader } from './FormHeader';

/** The Dynamics-CE form header strip: title + subtitle + status, with optional
 *  persona (left) and header fields / KPIs (right). */
const meta = {
  title: 'Surface Kit/Containers/FormHeader',
  component: FormHeader,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 900 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    title: 'Contoso Ltd.',
    subtitle: 'Account · Customer',
    status: 'Active',
  },
} satisfies Meta<typeof FormHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {};

export const WithPersona: Story = {
  args: {
    persona: (
      <div
        aria-hidden
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: '#0078d4',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
        }}
      >
        CL
      </div>
    ),
  },
};

/** Right-side header fields — the Dynamics-CE "KPI" row: value-over-label summary tiles
 *  separated by hairline dividers (matches form-runtime's header SummaryTile). */
export const WithHeaderFields: Story = {
  args: {
    headerFields: [
      { label: 'Annual Revenue', value: '$5,000,000' },
      { label: 'Number of Employees', value: '6,200' },
      { label: 'Owner', value: 'A. Reyes' },
    ],
  },
};
