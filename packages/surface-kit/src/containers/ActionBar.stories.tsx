import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';
import { ActionBar } from './ActionBar';
import type { SurfaceActionButton } from '../types';

/** A form action bar (Save / Cancel etc.). `sticky` is disabled in these stories so it
 *  renders inline within the canvas instead of pinning to the viewport bottom. */
const buttons: SurfaceActionButton[] = [
  { id: 'cancel', label: 'Cancel', appearance: 'default', position: 'left' },
  { id: 'saveClose', label: 'Save & Close', appearance: 'default' },
  { id: 'save', label: 'Save', appearance: 'primary' },
];

const meta = {
  title: 'Surface Kit/Containers/ActionBar',
  component: ActionBar,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 640, position: 'relative', minHeight: 80, border: '1px dashed #edebe9' }}>
        <Story />
      </div>
    ),
  ],
  args: { buttons, sticky: false },
} satisfies Meta<typeof ActionBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RightAligned: Story = {};
export const LeftAligned: Story = { args: { alignment: 'left' } };
export const Centered: Story = { args: { alignment: 'center' } };

/** `inverted` reverses the right cluster so the primary action leads (Save first). */
export const Inverted: Story = { args: { inverted: true } };

export const WithDisabled: Story = {
  args: {
    buttons: [
      { id: 'cancel', label: 'Cancel', appearance: 'default', position: 'left' },
      { id: 'save', label: 'Save', appearance: 'primary', disabled: true },
    ],
  },
};
