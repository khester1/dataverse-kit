import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';
import { DefaultButton, PrimaryButton } from '@fluentui/react';
import { Footer } from './Footer';

/** A page/dialog footer that hosts arbitrary children (typically buttons). `sticky`
 *  is disabled here so it renders inline within the canvas. */
const meta = {
  title: 'Surface Kit/Containers/Footer',
  component: Footer,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 640, position: 'relative', minHeight: 80, border: '1px dashed #edebe9' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    sticky: false,
    children: (
      <>
        <DefaultButton text="Cancel" />
        <PrimaryButton text="Submit" />
      </>
    ),
  },
} satisfies Meta<typeof Footer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RightAligned: Story = {};
export const LeftAligned: Story = { args: { align: 'left' } };
export const Centered: Story = { args: { align: 'center' } };
