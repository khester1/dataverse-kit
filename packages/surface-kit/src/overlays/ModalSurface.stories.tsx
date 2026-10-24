import type { Meta, StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { DefaultButton } from '@fluentui/react';
import { ModalSurface } from './ModalSurface';
import { ActionBar } from '../containers/ActionBar';
import { DemoFields } from '../_storybook/sample';

const meta = {
  title: 'Surface Kit/Overlays/Modal',
  component: ModalSurface,
  args: { isOpen: false },
} satisfies Meta<typeof ModalSurface>;

export default meta;
type Story = StoryObj<typeof meta>;

const ModalDemo: React.FC<{ autoSize?: boolean }> = ({ autoSize }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <DefaultButton text={`Open ${autoSize ? 'auto-size' : 'medium'} modal`} onClick={() => setOpen(true)} />
      <ModalSurface
        isOpen={open}
        onDismiss={() => setOpen(false)}
        title="Quick Edit"
        size="md"
        autoSize={autoSize}
        footer={
          <ActionBar
            sticky={false}
            buttons={[{ id: 'ok', label: 'OK', appearance: 'primary', onClick: () => setOpen(false) }]}
          />
        }
      >
        <DemoFields count={3} />
      </ModalSurface>
    </>
  );
};

export const Medium: Story = { render: () => <ModalDemo /> };
export const AutoSize: Story = { render: () => <ModalDemo autoSize /> };
