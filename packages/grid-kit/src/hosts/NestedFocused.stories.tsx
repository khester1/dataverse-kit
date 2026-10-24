import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { initializeIcons } from '@fluentui/react';
import { NestedGrid } from './nested/NestedGrid';
import { FocusedViewGrid } from './FocusedViewGrid';
import { demoColumns, demoRows } from '../_storybook/sample';
import type { DemoRow } from '../_storybook/sample';
import type { ColumnDef, NestedConfig } from '../types';

initializeIcons();

const meta: Meta = {
  title: 'Grid Kit/Nested & Focused View',
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
};
export default meta;

// Child (contacts) data per parent account.
interface Contact extends Record<string, unknown> {
  key: string;
  fullname: string;
  role: string;
  status: string;
}
const CONTACTS: Record<string, Contact[]> = {
  '1': [
    { key: '1a', fullname: 'Dana Reeves', role: 'CFO', status: 'Active' },
    { key: '1b', fullname: 'Theo Park', role: 'Buyer', status: 'Active' },
  ],
  '2': [{ key: '2a', fullname: 'Priya Shah', role: 'Owner', status: 'Pending' }],
  '3': [
    { key: '3a', fullname: 'Tom Becker', role: 'Manager', status: 'Inactive' },
    { key: '3b', fullname: 'Iris Vale', role: 'Buyer', status: 'Inactive' },
    { key: '3c', fullname: 'Leo Marsh', role: 'Analyst', status: 'Active' },
  ],
  '4': [{ key: '4a', fullname: 'Lena Ortiz', role: 'Director', status: 'Active' }],
};

const childColumns: ColumnDef<Contact>[] = [
  { key: 'fullname', fieldName: 'fullname', name: 'Contact', rendererType: 'text', minWidth: 140 },
  { key: 'role', fieldName: 'role', name: 'Role', rendererType: 'text', minWidth: 100 },
  {
    key: 'status',
    fieldName: 'status',
    name: 'Status',
    rendererType: 'coloredCell',
    minWidth: 100,
    rendererConfig: { colorMap: { Active: '#107c10', Pending: '#f7e600', Inactive: '#d13438' } },
  },
];

const nested = (mode: NestedConfig<DemoRow, Contact>['mode']): NestedConfig<DemoRow, Contact> => ({
  mode,
  childColumns,
  getChildren: (parent) => CONTACTS[parent.key] ?? [],
  triggerLabel: 'View {count} contacts',
});

const parentColumns = demoColumns.filter((c) => ['name', 'owner', 'status', 'revenue'].includes(c.fieldName));

/** Inline: a chevron expands each row to show its contacts. */
export const NestedInlineMode: StoryObj = {
  render: () => (
    <NestedGrid<DemoRow, Contact> items={demoRows} columns={parentColumns} getKey={(r) => r.key} nested={nested('inline')} />
  ),
};

/**
 * Side panel: a per-row trigger opens a Fluent Panel with the child grid. Selecting
 * child rows updates the trigger cell to "N selected".
 */
export const NestedSidePanel: StoryObj = {
  render: () => (
    <NestedGrid<DemoRow, Contact>
      items={demoRows}
      columns={parentColumns}
      getKey={(r) => r.key}
      nested={{ ...nested('side-panel'), childSelectionMode: 'multiple' }}
    />
  ),
};

/** Hover callout: a count badge reveals the top-N child rows on hover. */
export const NestedHoverCallout: StoryObj = {
  render: () => (
    <NestedGrid<DemoRow, Contact>
      items={demoRows}
      columns={parentColumns}
      getKey={(r) => r.key}
      nested={{ ...nested('hover-callout'), calloutMaxRows: 2 }}
    />
  ),
};

/** Card parents: each parent renders as a card that expands in place to its contacts. */
export const NestedCardParents: StoryObj = {
  render: () => (
    <NestedGrid<DemoRow, Contact>
      items={demoRows}
      columns={parentColumns}
      getKey={(r) => r.key}
      nested={{
        // `mode` is ignored for card parents — parentLayout wins.
        ...nested('inline'),
        parentLayout: 'cards',
        parentCard: { cardsPerRow: 2, titleField: 'name', subtitleField: 'owner' },
      }}
    />
  ),
};

/** Master-detail: left summary rail drives a right detail pane. */
export const FocusedView: StoryObj = {
  render: () => (
    <FocusedViewGrid<DemoRow>
      items={demoRows}
      columns={demoColumns}
      getKey={(r) => r.key}
      focusedView={{
        rows: [
          { id: 'r1', primaryField: { fieldName: 'name', label: 'Account' }, secondaryField: { fieldName: 'owner', label: 'Owner' }, iconName: 'Contact' },
        ],
        detailFields: ['status', 'revenue', 'progress', 'score', 'created'],
      }}
    />
  ),
};

/**
 * Narrow-container responsive (Tier 2): inside a ~360px wrapper the rail + detail
 * STACK into one full-width pane — the rail until a row is picked, then the detail
 * pane with a Back affordance back to the rail. Above the 768px (md) cutoff it is the
 * usual two-pane master/detail. Resize the canvas to watch it cross over.
 */
export const FocusedViewResponsive: StoryObj = {
  render: () => (
    <div style={{ width: 360, border: '1px dashed #c8c6c4', padding: 8 }}>
      <FocusedViewGrid<DemoRow>
        items={demoRows}
        columns={demoColumns}
        getKey={(r) => r.key}
        focusedView={{
          rows: [
            { id: 'r1', primaryField: { fieldName: 'name', label: 'Account' }, secondaryField: { fieldName: 'owner', label: 'Owner' }, iconName: 'Contact' },
          ],
          detailFields: ['status', 'revenue', 'progress', 'score', 'created'],
        }}
      />
    </div>
  ),
};

/** Master-detail with a nested child grid in the detail pane. */
export const FocusedViewWithDetailPaneChild: StoryObj = {
  render: () => (
    <FocusedViewGrid<DemoRow>
      items={demoRows}
      columns={demoColumns}
      getKey={(r) => r.key}
      focusedView={{
        rows: [{ id: 'r1', primaryField: { fieldName: 'name', label: 'Account' }, secondaryField: { fieldName: 'owner', label: 'Owner' }, iconName: 'Contact' }],
        detailFields: ['status', 'revenue'],
      }}
      nested={{
        mode: 'detail-pane',
        childColumns: childColumns as ColumnDef[],
        getChildren: (parent) => CONTACTS[parent.key] ?? [],
        triggerLabel: 'View {count} contacts',
      }}
    />
  ),
};
