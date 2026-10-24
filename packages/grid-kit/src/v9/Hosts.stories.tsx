import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FluentProvider } from '@fluentui/react-components';
import { CardGrid } from './hosts/CardGrid';
import { FocusedViewGrid } from './hosts/FocusedViewGrid';
import { GroupedGrid } from './hosts/GroupedGrid';
import { NestedGrid } from './hosts/nested/NestedGrid';
import { dynamicsV9Theme } from './theme';
import { demoColumns, demoRows } from '../_storybook/sample';
import type { DemoRow } from '../_storybook/sample';
import type { ColumnDef, NestedConfig } from '../types';

interface ContactRow extends Record<string, unknown> {
  key: string;
  fullname: string;
  role: string;
}
const contactColumns: ColumnDef<ContactRow>[] = [
  { key: 'fullname', fieldName: 'fullname', name: 'Contact', rendererType: 'text' },
  { key: 'role', fieldName: 'role', name: 'Role', rendererType: 'text' },
];
const getContacts = (r: DemoRow): ContactRow[] => [
  { key: `${r.key}-1`, fullname: `${r.owner}`, role: 'Primary' },
  { key: `${r.key}-2`, fullname: 'Jamie Fox', role: 'Billing' },
];
const nestedInline: NestedConfig<DemoRow, ContactRow> = { mode: 'inline', childColumns: contactColumns, getChildren: getContacts };
const nestedPanel: NestedConfig<DemoRow, ContactRow> = {
  mode: 'side-panel',
  childColumns: contactColumns,
  getChildren: getContacts,
  triggerLabel: 'View {count} contacts',
  // Multi-select in the drawer so the trigger cell can show "N selected".
  childSelectionMode: 'multiple',
};

const meta: Meta = {
  title: 'Grid Kit v9/Hosts',
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <FluentProvider theme={dynamicsV9Theme}>
        <Story />
      </FluentProvider>
    ),
  ],
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

/** Card view — each row a v9 Card; fields render through the shared v9 registry. */
export const Cards: Story = {
  render: () => (
    <CardGrid<DemoRow>
      items={demoRows}
      columns={demoColumns}
      getKey={(r) => r.key}
      card={{ cardsPerRow: 2, titleField: 'name', subtitleField: 'owner' }}
      selectionMode="multiple"
    />
  ),
};

/** Responsive cards — `minCardWidth` reflows the grid to the container width. */
export const ResponsiveCards: Story = {
  render: () => (
    <CardGrid<DemoRow>
      items={demoRows}
      columns={demoColumns}
      getKey={(r) => r.key}
      card={{ cardsPerRow: 3, minCardWidth: 260, titleField: 'name' }}
    />
  ),
};

/** Grouped — rows bucketed by a field into collapsible v9 Accordion groups (each a DataGrid). */
export const Grouped: Story = {
  render: () => (
    <GroupedGrid<DemoRow>
      items={demoRows}
      columns={demoColumns.map((c) => (c.key === 'revenue' ? { ...c, aggregate: 'sum' } : c))}
      getKey={(r) => r.key}
      group={{ groupBy: 'status', showGroupAggregates: true }}
      selectionMode="multiple"
    />
  ),
};

/** Nested (inline) — a chevron expands each parent row to reveal its child grid. */
export const NestedInlineExpand: Story = {
  render: () => <NestedGrid<DemoRow, ContactRow> items={demoRows} columns={demoColumns} getKey={(r) => r.key} nested={nestedInline} />,
};

/** Nested (side-panel) — a per-row trigger opens a v9 OverlayDrawer with the child grid. */
export const NestedSidePanel: Story = {
  render: () => <NestedGrid<DemoRow, ContactRow> items={demoRows} columns={demoColumns} getKey={(r) => r.key} nested={nestedPanel} />,
};

/** Master-detail — a summary rail drives a detail pane; the search box filters the rail. */
export const FocusedView: Story = {
  render: () => (
    <FocusedViewGrid<DemoRow>
      items={demoRows}
      columns={demoColumns}
      getKey={(r) => r.key}
      focusedView={{
        rows: [
          {
            id: 'r1',
            primaryField: { fieldName: 'name', label: 'Account' },
            secondaryField: { fieldName: 'owner', label: 'Owner' },
          },
        ],
        detailFields: ['owner', 'status', 'revenue', 'created'],
      }}
    />
  ),
};
