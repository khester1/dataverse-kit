import type { Meta, StoryObj } from '@storybook/react-vite';
import React, { useRef, useState } from 'react';
import { FluentProvider, Button, Field, Input } from '@fluentui/react-components';
import { FormDialogSurface } from './overlays/FormDialogSurface';
import { ModalSurface } from './overlays/ModalSurface';
import { PanelSurface } from './overlays/PanelSurface';
import { CalloutSurface } from './overlays/CalloutSurface';
import { TooltipSurface } from './overlays/TooltipSurface';
import { ActionBar } from './containers/ActionBar';
import { dynamicsV9Theme } from './theme';

const decorators = [
  (Story: React.ComponentType) => (
    <FluentProvider theme={dynamicsV9Theme}>
      <Story />
    </FluentProvider>
  ),
];

const meta = {
  title: 'Surface Kit v9/Overlays',
  decorators,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Full form dialog (v9 Dialog) sized from the shared 1200 / 95vh scalars, with a record counter + footer. */
export const FormDialog: Story = {
  render: () => {
    const Demo = () => {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Button appearance="primary" onClick={() => setOpen(true)}>
            Open form dialog
          </Button>
          <FormDialogSurface
            isOpen={open}
            onDismiss={() => setOpen(false)}
            title="Edit Account"
            subheader="Acme Corporation"
            recordCounter={{ current: 2, total: 5 }}
            footer={
              <ActionBar
                sticky={false}
                buttons={[
                  { id: 'cancel', label: 'Cancel', appearance: 'default', onClick: () => setOpen(false) },
                  { id: 'save', label: 'Save', appearance: 'primary', onClick: () => setOpen(false) },
                ]}
              />
            }
          >
            <Field label="Account name">
              <Input defaultValue="Acme Corporation" />
            </Field>
          </FormDialogSurface>
        </>
      );
    };
    return <Demo />;
  },
};

/** A lighter generic modal (v9 Dialog). */
export const Modal: Story = {
  render: () => {
    const Demo = () => {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Button onClick={() => setOpen(true)}>Open modal</Button>
          <ModalSurface
            isOpen={open}
            onDismiss={() => setOpen(false)}
            title="Quick edit"
            size="sm"
            footer={<Button appearance="primary" onClick={() => setOpen(false)}>Done</Button>}
          >
            <div>Modal body content.</div>
          </ModalSurface>
        </>
      );
    };
    return <Demo />;
  },
};

/** A right-edge side panel (v9 OverlayDrawer). */
export const Panel: Story = {
  render: () => {
    const Demo = () => {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Button onClick={() => setOpen(true)}>Open panel</Button>
          <PanelSurface isOpen={open} onDismiss={() => setOpen(false)} title="Details" width={600}>
            <Field label="Notes">
              <Input />
            </Field>
          </PanelSurface>
        </>
      );
    };
    return <Demo />;
  },
};

/** A contextual callout (v9 Popover) anchored to a target element. */
export const Callout: Story = {
  render: () => {
    const Demo = () => {
      const [open, setOpen] = useState(false);
      const ref = useRef<HTMLButtonElement>(null);
      return (
        <>
          <button ref={ref} onClick={() => setOpen((v) => !v)}>
            Toggle callout
          </button>
          <CalloutSurface target={ref} isOpen={open} onDismiss={() => setOpen(false)} position="below" align="start">
            <div>Contextual callout content.</div>
          </CalloutSurface>
        </>
      );
    };
    return <Demo />;
  },
};

/** A tooltip (v9 Tooltip) wrapping a trigger. */
export const Tooltip: Story = {
  render: () => (
    <TooltipSurface content="Saves the current record" position="above">
      <Button>Save</Button>
    </TooltipSurface>
  ),
};
