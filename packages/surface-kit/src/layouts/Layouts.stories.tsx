import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';
import { TextField } from '@fluentui/react';
import { ColumnLayout } from './ColumnLayout';
import { TwoColumnLayout } from './TwoColumnLayout';
import { FieldRow } from './FieldRow';

const meta = {
  title: 'Surface Kit/Layouts/Gallery',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const field = (label: string) => (
  <FieldRow key={label} label={label}>
    <TextField placeholder={label} />
  </FieldRow>
);

/** N-column responsive field grids (resize the viewport to see them cap at 2 then stack). */
export const ColumnLayouts: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 24, maxWidth: 720 }}>
      {[2, 3, 4].map((n) => (
        <div key={n}>
          <h4 style={{ margin: '0 0 8px' }}>{n} columns</h4>
          <ColumnLayout columns={n as 2 | 3 | 4}>
            {Array.from({ length: n * 2 }, (_, i) => field(`Field ${i + 1}`))}
          </ColumnLayout>
        </div>
      ))}
    </div>
  ),
};

export const TwoColumn: Story = {
  render: () => (
    <div style={{ maxWidth: 720 }}>
      <TwoColumnLayout>
        {field('Left A')}
        {field('Right A')}
        {field('Left B')}
        {field('Right B')}
      </TwoColumnLayout>
    </div>
  ),
};

export const FieldRowLabelPositions: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16, maxWidth: 480 }}>
      <FieldRow label="Beside (default)">
        <TextField defaultValue="value" />
      </FieldRow>
      <FieldRow label="Above" labelPosition="above">
        <TextField defaultValue="value" />
      </FieldRow>
      <FieldRow label="Required" required>
        <TextField defaultValue="value" />
      </FieldRow>
    </div>
  ),
};
