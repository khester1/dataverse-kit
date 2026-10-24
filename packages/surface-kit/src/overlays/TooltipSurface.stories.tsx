import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';
import { DefaultButton } from '@fluentui/react';
import { TooltipSurface } from './TooltipSurface';

const meta = {
  title: 'Surface Kit/Overlays/Tooltip',
  component: TooltipSurface,
} satisfies Meta<typeof TooltipSurface>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    content: 'This is a Dynamics-style tooltip',
    children: <DefaultButton text="Hover me" />,
  },
};
