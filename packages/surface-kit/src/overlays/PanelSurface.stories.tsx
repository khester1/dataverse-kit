import type { Meta, StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { DefaultButton } from '@fluentui/react';
import { PanelSurface } from './PanelSurface';
import { ActionBar } from '../containers/ActionBar';
import { DemoFields } from '../_storybook/sample';
import type { FluentPanelType } from '../types';

const meta = {
  title: 'Surface Kit/Overlays/Panel',
  component: PanelSurface,
  args: { isOpen: false },
} satisfies Meta<typeof PanelSurface>;

export default meta;
type Story = StoryObj<typeof meta>;

const PanelDemo: React.FC<{ panelType?: FluentPanelType; width?: number }> = ({ panelType, width }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <DefaultButton text={`Open ${panelType ?? 'auto'} panel`} onClick={() => setOpen(true)} />
      <PanelSurface
        isOpen={open}
        onDismiss={() => setOpen(false)}
        title="Account Details"
        panelType={panelType}
        width={width}
        footer={
          <ActionBar
            sticky={false}
            buttons={[
              { id: 'save', label: 'Save', appearance: 'primary', onClick: () => setOpen(false) },
              { id: 'cancel', label: 'Cancel', onClick: () => setOpen(false) },
            ]}
          />
        }
      >
        <DemoFields count={4} />
      </PanelSurface>
    </>
  );
};

export const Medium: Story = { render: () => <PanelDemo panelType="medium" /> };
export const Large: Story = { render: () => <PanelDemo panelType="large" /> };
export const ExtraLarge: Story = { render: () => <PanelDemo panelType="extraLarge" /> };
export const CustomWidth: Story = { render: () => <PanelDemo panelType="custom" width={420} /> };
