import type { Meta, StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { DefaultButton } from '@fluentui/react';
import { CalloutSurface } from './CalloutSurface';
import { DemoFields } from '../_storybook/sample';

const meta = {
  title: 'Surface Kit/Overlays/Callout',
  component: CalloutSurface,
  args: { target: null },
} satisfies Meta<typeof CalloutSurface>;

export default meta;
type Story = StoryObj<typeof meta>;

const CalloutDemo: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <DefaultButton id="callout-anchor" text="Toggle callout" onClick={() => setOpen((o) => !o)} />
      <CalloutSurface target="#callout-anchor" isOpen={open} onDismiss={() => setOpen(false)} width={320}>
        <DemoFields count={2} />
      </CalloutSurface>
    </>
  );
};

export const Default: Story = { render: () => <CalloutDemo /> };
