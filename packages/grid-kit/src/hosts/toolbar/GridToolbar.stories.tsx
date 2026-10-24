import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { initializeIcons } from '@fluentui/react';
import { GridToolbar } from './GridToolbar';
import { DataGrid } from '../DataGrid';
import { demoColumns, demoRows } from '../../_storybook/sample';
import type { DemoRow } from '../../_storybook/sample';
import type { GridCommand, GridToolbarConfig } from '../../types';

// The consumer registers icons — grid-kit never does.
initializeIcons();

/**
 * `layout: 'dynamics'` — the model-driven subgrid command bar, for custom pages
 * (where the platform draws no command bar around a grid): title left, commands
 * right-aligned, commands that do not fit fold into `⋮`.
 */
const meta: Meta<typeof GridToolbar> = {
  title: 'Grid Kit/Toolbar (Dynamics layout)',
  component: GridToolbar as never,
  parameters: { layout: 'padded', chromatic: { delay: 300 } },
  // Measure after web fonts (incl. the icon font) settle, so collapse points are stable.
  loaders: [async () => ({ fontsReady: await document.fonts?.ready })],
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

const log = (what: string) => () => console.log(`[story] ${what}`);

/** The commands on the Choice Grid subgrid in the reference screenshot. */
const choiceGridCommands: GridCommand[] = [
  { key: 'new', text: 'New Dev Item', iconName: 'Add', onClick: log('new') },
  { key: 'addExisting', text: 'Add Existing Dev Item', iconName: 'AddTo', onClick: log('add existing') },
  { key: 'refresh', text: 'Refresh', iconName: 'Refresh', onClick: log('refresh') },
  {
    key: 'flow',
    text: 'Flow',
    iconName: 'Flow',
    subMenuProps: {
      items: [
        { key: 'run', text: 'Run a flow', onClick: log('run flow') },
        { key: 'create', text: 'Create a flow', onClick: log('create flow') },
      ],
    },
  },
  { key: 'share', text: 'Share', iconName: 'Share', position: 'overflow', onClick: log('share') },
];

const choiceGridConfig: GridToolbarConfig = { layout: 'dynamics', title: 'Choice Grid', commands: choiceGridCommands };

const Frame: React.FC<{ width: number | string; label?: string; children: React.ReactNode }> = ({ width, label, children }) => (
  <div style={{ marginBottom: 24 }}>
    {label && <div style={{ font: '12px Segoe UI', color: '#605e5c', marginBottom: 4 }}>{label}</div>}
    <div style={{ width, border: '1px solid #edebe9', borderRadius: 4, padding: '8px 12px', background: '#fff' }}>{children}</div>
  </div>
);

/** Title + New / Add Existing / Refresh / Flow ▾ over a grid, with Share pinned in `⋮`. */
export const ChoiceGridToolbar: Story = {
  render: () => (
    <Frame width={1100}>
      <DataGrid<DemoRow> items={demoRows} columns={demoColumns} getKey={(r) => r.key} toolbar={choiceGridConfig} />
    </Frame>
  ),
};

/** The same bar at three widths: the rightmost commands fold into `⋮` first. */
export const NarrowOverflow: Story = {
  render: () => (
    <>
      <Frame width={940} label="940px">
        <GridToolbar config={choiceGridConfig} />
      </Frame>
      <Frame width={560} label="560px">
        <GridToolbar config={choiceGridConfig} />
      </Frame>
      <Frame width={330} label="330px">
        <GridToolbar config={choiceGridConfig} />
      </Frame>
    </>
  ),
};

/**
 * Drag the frame's bottom-right corner. Only the CONTAINER resizes — the window does
 * not — which is the case a custom-page pane or side panel produces.
 */
export const ContainerResize: Story = {
  render: () => (
    <div style={{ resize: 'horizontal', overflow: 'hidden', width: 900, minWidth: 200, maxWidth: '100%', border: '1px dashed #8a8886', padding: 8 }}>
      <GridToolbar config={choiceGridConfig} />
    </div>
  ),
};

/** Icon-only, like the Dynamics Timeline header. The text is each button's tooltip + name. */
export const TimelineIconOnly: Story = {
  render: () => (
    <Frame width={520}>
      <GridToolbar
        config={{
          layout: 'dynamics',
          title: 'Timeline',
          iconOnly: true,
          commands: [
            { key: 'new', text: 'Create a timeline record', iconName: 'Add' },
            { key: 'bookmark', text: 'Pin', iconName: 'Pinned' },
            { key: 'filter', text: 'Filter', iconName: 'Filter' },
            { key: 'sort', text: 'Sort', iconName: 'SortLines' },
            { key: 'refresh', text: 'Refresh timeline', iconName: 'Refresh' },
            { key: 'expand', text: 'Expand all records', position: 'overflow' },
          ],
        }}
      />
    </Frame>
  ),
};

/**
 * Select rows: Edit shows for exactly one, Delete for one or more. The consumer
 * mirrors the grid's selection into `selectedCount`.
 */
export const SelectionGated: Story = {
  render: () => {
    const Demo: React.FC = () => {
      const [count, setCount] = useState(0);
      return (
        <Frame width={1100}>
          <DataGrid<DemoRow>
            items={demoRows}
            columns={demoColumns}
            getKey={(r) => r.key}
            selectionMode="multiple"
            onSelectionChanged={(rows) => setCount(rows.length)}
            toolbar={{
              layout: 'dynamics',
              title: `Accounts (${count} selected)`,
              selectedCount: count,
              commands: [
                { key: 'new', text: 'New', iconName: 'Add' },
                { key: 'edit', text: 'Edit', iconName: 'Edit', minSelectionCount: 1, maxSelectionCount: 1 },
                { key: 'delete', text: 'Delete', iconName: 'Delete', minSelectionCount: 1 },
                { key: 'refresh', text: 'Refresh', iconName: 'Refresh' },
              ],
            }}
          />
        </Frame>
      );
    };
    return <Demo />;
  },
};

/** The default layout, unchanged — kept here as the regression reference. */
export const DefaultLayoutReference: Story = {
  render: () => (
    <Frame width={940}>
      <GridToolbar
        config={{
          showSearch: true,
          searchPlaceholder: 'Search',
          commands: choiceGridCommands.filter((c) => c.key !== 'share'),
        }}
      />
    </Frame>
  ),
};
