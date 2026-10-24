import type { Meta, StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { DetailsList, SelectionMode, DefaultButton, type IColumn } from '@fluentui/react';
import { Section } from '../containers/Section';
import { FormDialogSurface } from '../overlays/FormDialogSurface';
import { PanelSurface } from '../overlays/PanelSurface';
import { ActionBar } from '../containers/ActionBar';

/**
 * Grid-in-container integration.
 *
 * surface-kit owns the *shell* (a `Section`, a `FormDialogSurface`, a `PanelSurface`)
 * with its header / footer / bounded-and-scrollable body; a data grid drops in as
 * `children` and fills the space the shell allots — no layout glue at the call site.
 *
 * The grid here is a plain Fluent v8 `DetailsList` so this story stays self-contained.
 * In a real app you'd drop in grid-kit's container-filling host instead — one swap:
 *   `import { DataGrid } from '@dataverse-kit/grid-kit';`
 *   `<DataGrid items={ROWS} columns={GRID_COLUMNS} fill />`
 * (`fill` makes the grid flex to the shell's height with an internally-scrolling body;
 * the surface-kit `tsconfig.stories` already aliases `@dataverse-kit/grid-kit` → its dist).
 */

interface Row {
  key: string;
  name: string;
  city: string;
  revenue: string;
  status: string;
}

const COLUMNS: IColumn[] = [
  { key: 'name', name: 'Account', fieldName: 'name', minWidth: 140, maxWidth: 220, isResizable: true },
  { key: 'city', name: 'City', fieldName: 'city', minWidth: 100, isResizable: true },
  { key: 'revenue', name: 'Revenue', fieldName: 'revenue', minWidth: 100, isResizable: true },
  { key: 'status', name: 'Status', fieldName: 'status', minWidth: 90, isResizable: true },
];

const CITIES = ['Seattle', 'Austin', 'Denver', 'Boston'];
const ROWS: Row[] = Array.from({ length: 28 }, (_, i) => ({
  key: String(i + 1),
  name: `Account ${i + 1}`,
  city: CITIES[i % CITIES.length],
  revenue: `$${(i + 1) * 37}K`,
  status: i % 3 === 0 ? 'On hold' : 'Active',
}));

/** Stand-in grid (swap for grid-kit's <DataGrid fill /> in real usage). */
const SampleGrid: React.FC = () => (
  <DetailsList items={ROWS} columns={COLUMNS} selectionMode={SelectionMode.none} setKey="grid" compact />
);

const meta = {
  title: 'Surface Kit/Integration/Grid in Container',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** A subgrid pattern: the grid sits in a Section, scrolling within a bounded height. */
export const InSection: Story = {
  render: () => (
    <Section title="Related Accounts" statusText={`${ROWS.length} records`}>
      <div style={{ maxHeight: 300, overflow: 'auto' }}>
        <SampleGrid />
      </div>
    </Section>
  ),
};

/** The grid as the body of a form dialog — header + record counter + sticky footer. */
export const InDialog: Story = {
  render: () => {
    const DialogDemo: React.FC = () => {
      const [open, setOpen] = useState(false);
      return (
        <>
          <DefaultButton text="Open grid dialog" onClick={() => setOpen(true)} />
          <FormDialogSurface
            isOpen={open}
            onDismiss={() => setOpen(false)}
            title="Accounts"
            subheader="All active and on-hold accounts"
            size="lg"
            recordCounter={{ current: 1, total: ROWS.length }}
            footer={
              <ActionBar
                sticky={false}
                buttons={[{ id: 'close', label: 'Close', appearance: 'primary', onClick: () => setOpen(false) }]}
              />
            }
          >
            <SampleGrid />
          </FormDialogSurface>
        </>
      );
    };
    return <DialogDemo />;
  },
};

/** The grid in a slide-in panel — the panel bounds the height and scrolls the body. */
export const InPanel: Story = {
  render: () => {
    const PanelDemo: React.FC = () => {
      const [open, setOpen] = useState(false);
      return (
        <>
          <DefaultButton text="Open grid panel" onClick={() => setOpen(true)} />
          <PanelSurface
            isOpen={open}
            onDismiss={() => setOpen(false)}
            title="Accounts"
            panelType="large"
            footer={
              <ActionBar
                sticky={false}
                buttons={[{ id: 'close', label: 'Close', onClick: () => setOpen(false) }]}
              />
            }
          >
            <SampleGrid />
          </PanelSurface>
        </>
      );
    };
    return <PanelDemo />;
  },
};
