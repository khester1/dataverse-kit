import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';
import { Section } from './Section';
import { DemoFields } from '../_storybook/sample';

const meta = {
  title: 'Surface Kit/Containers/Section',
  component: Section,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 640, display: 'grid' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    title: 'General Information',
    columnSpan: 12,
    internalColumns: 1,
    children: <DemoFields count={3} />,
  },
} satisfies Meta<typeof Section>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Card: Story = {};
export const Flat: Story = { args: { variant: 'flat' } };
export const Placeholder: Story = {
  args: { variant: 'placeholder', title: undefined, children: undefined, minHeight: 120 },
};
export const Collapsible: Story = { args: { collapsible: true } };
export const WithStatusAndCommandBar: Story = {
  args: {
    statusText: 'Saved',
    showCommandBar: true,
    commandBarItems: [
      { key: 'edit', text: 'Edit', iconProps: { iconName: 'Edit' } },
      { key: 'refresh', text: 'Refresh', iconProps: { iconName: 'Refresh' } },
    ],
  },
};
export const TwoColumnBody: Story = {
  args: { internalColumns: 2, children: <DemoFields count={6} /> },
};
