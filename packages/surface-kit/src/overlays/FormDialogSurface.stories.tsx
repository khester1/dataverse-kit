import type { Meta, StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { DefaultButton } from '@fluentui/react';
import { FormDialogSurface } from './FormDialogSurface';
import { ActionBar } from '../containers/ActionBar';
import { SectionCard } from '../containers/SectionCard';
import { DemoFields } from '../_storybook/sample';
import type { DialogSizePreset } from '../core/sizePresets';

const meta = {
  title: 'Surface Kit/Overlays/Dialog',
  component: FormDialogSurface,
  // render-based stories drive `isOpen` from local state; this satisfies the required prop.
  args: { isOpen: false },
} satisfies Meta<typeof FormDialogSurface>;

export default meta;
type Story = StoryObj<typeof meta>;

const DialogDemo: React.FC<{ size?: DialogSizePreset }> = ({ size }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <DefaultButton text={`Open ${size ?? 'default'} dialog`} onClick={() => setOpen(true)} />
      <FormDialogSurface
        isOpen={open}
        size={size}
        title="Edit Account"
        subheader="Account · Account"
        recordCounter={{ current: 1, total: 3 }}
        onDismiss={() => setOpen(false)}
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
        <SectionCard title="General" columnSpan={12} internalColumns={2}>
          <DemoFields count={6} />
        </SectionCard>
      </FormDialogSurface>
    </>
  );
};

export const Default: Story = { render: () => <DialogDemo /> };

/** Size matrix — sm:600 / md:900 / lg:1200 / xl:1600. */
export const Small: Story = { render: () => <DialogDemo size="sm" /> };
export const Medium: Story = { render: () => <DialogDemo size="md" /> };
export const Large: Story = { render: () => <DialogDemo size="lg" /> };
export const ExtraLarge: Story = { render: () => <DialogDemo size="xl" /> };
