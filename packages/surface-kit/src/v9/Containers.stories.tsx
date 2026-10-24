import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';
import { FluentProvider, Avatar, Field, Input } from '@fluentui/react-components';
import { Add20Regular, Delete20Regular, Edit20Regular, Save20Regular } from '@fluentui/react-icons';
import { FormHeader } from './containers/FormHeader';
import { PivotSurface } from './containers/PivotSurface';
import { CommandSurface } from './containers/CommandSurface';
import { ActionBar } from './containers/ActionBar';
import { Footer } from './containers/Footer';
import { Section } from './containers/Section';
import type { SurfaceToolbarItem } from './types';
import { dynamicsV9Theme } from './theme';

const decorators = [
  (Story: React.ComponentType) => (
    <FluentProvider theme={dynamicsV9Theme}>
      <Story />
    </FluentProvider>
  ),
];

const commands: SurfaceToolbarItem[] = [
  { id: 'new', label: 'New', icon: <Add20Regular />, appearance: 'primary' },
  { id: 'edit', label: 'Edit', icon: <Edit20Regular /> },
  { id: 'save', label: 'Save', icon: <Save20Regular /> },
];

const meta = {
  title: 'Surface Kit v9/Containers',
  decorators,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The Dynamics form header: avatar + title/status (left), header fields (right). */
export const Header: Story = {
  render: () => (
    <FormHeader
      persona={<Avatar name="Acme Corporation" color="colorful" />}
      title="Acme Corporation"
      status="Active"
      subtitle="Customer · Seattle, WA"
      actions={<Field label="Annual revenue"><Input defaultValue="$5,000,000" /></Field>}
    />
  ),
};

/** Tabbed sections (v9 TabList). */
export const Tabs: Story = {
  render: () => (
    <PivotSurface
      tabs={[
        { id: 'summary', label: 'Summary', content: <div style={{ padding: 16 }}>Summary content</div> },
        { id: 'details', label: 'Details', content: <div style={{ padding: 16 }}>Details content</div> },
        { id: 'related', label: 'Related', content: <div style={{ padding: 16 }}>Related content</div>, disabled: true },
      ]}
    />
  ),
};

/** A command bar (v9 Toolbar) with a primary action, overflow menu, and a far-item. */
export const CommandBar: Story = {
  render: () => (
    <CommandSurface
      items={commands}
      overflowItems={[{ id: 'delete', label: 'Delete', icon: <Delete20Regular /> }]}
      farItems={[{ id: 'refresh', label: 'Refresh' }]}
    />
  ),
};

/** A sticky action bar (v9 Buttons) with left + right groups. */
export const Actions: Story = {
  render: () => (
    <ActionBar
      buttons={[
        { id: 'back', label: 'Back', position: 'left', appearance: 'subtle' },
        { id: 'cancel', label: 'Cancel', appearance: 'default' },
        { id: 'save', label: 'Save', appearance: 'primary', icon: <Save20Regular /> },
      ]}
    />
  ),
};

/** The three Section variants: card (default), flat, and placeholder. */
export const SectionVariants: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16, maxWidth: 480 }}>
      <Section title="Card (default)" internalColumns={1}>
        <Field label="Name"><Input /></Field>
      </Section>
      <Section title="Flat" variant="flat" internalColumns={1}>
        <Field label="Name"><Input /></Field>
      </Section>
      <Section variant="placeholder" minHeight={80} />
    </div>
  ),
};

/** Command bar + form + sticky footer, a common Dynamics dialog body composition. */
export const WithFooter: Story = {
  render: () => (
    <div style={{ height: 260, display: 'flex', flexDirection: 'column', border: '1px solid #edebe9' }}>
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>Scrollable form body…</div>
      <Footer>
        <ActionBar
          sticky={false}
          buttons={[
            { id: 'cancel', label: 'Cancel', appearance: 'default' },
            { id: 'save', label: 'Save', appearance: 'primary' },
          ]}
        />
      </Footer>
    </div>
  ),
};
