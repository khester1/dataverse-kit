import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FluentProvider } from '@fluentui/react-components';
import {
  Add20Regular,
  AddSquareMultiple20Regular,
  ArrowClockwise20Regular,
  ArrowSort20Regular,
  Bookmark20Regular,
  Delete20Regular,
  Edit20Regular,
  Filter20Regular,
  Flow20Regular,
  Share20Regular,
} from '@fluentui/react-icons';
import { GridToolbar } from './hosts/GridToolbar';
import { DataGrid } from './hosts/DataGrid';
import { dynamicsV9Theme } from './theme';
import type { V9GridCommand, V9GridToolbarConfig } from './types';
import { demoColumns, demoRows } from '../_storybook/sample';
import type { DemoRow } from '../_storybook/sample';

/**
 * `layout: 'dynamics'` (v9) — the model-driven subgrid command bar for custom pages:
 * title left, commands right-aligned, commands that do not fit fold into `⋮`.
 *
 * In a PCF control: the `⋮` menu and icon-only tooltips are PORTALS, so wrap each
 * control instance in its own `IdPrefixProvider` (outside its `FluentProvider`) or
 * they render unthemed — see `choice-grid/…/App.tsx` + `utils/idPrefix.ts`. Toolbar
 * and Menu also use tabster arrow navigation: a `standard` control on a model-driven
 * form needs tabster isolation — see `nested-grid/…/utils/tabsterIsolation.ts`.
 */
const meta: Meta<typeof GridToolbar> = {
  title: 'Grid Kit v9/Toolbar (Dynamics layout)',
  component: GridToolbar as never,
  parameters: { layout: 'padded', chromatic: { delay: 300 } },
  loaders: [async () => ({ fontsReady: await document.fonts?.ready })],
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

const log = (what: string) => () => console.log(`[story] ${what}`);

const choiceGridCommands: V9GridCommand[] = [
  { key: 'new', text: 'New Dev Item', icon: <Add20Regular />, onClick: log('new') },
  { key: 'addExisting', text: 'Add Existing Dev Item', icon: <AddSquareMultiple20Regular />, onClick: log('add existing') },
  { key: 'refresh', text: 'Refresh', icon: <ArrowClockwise20Regular />, onClick: log('refresh') },
  {
    key: 'flow',
    text: 'Flow',
    icon: <Flow20Regular />,
    menuItems: [
      { key: 'run', text: 'Run a flow', onClick: log('run flow') },
      { key: 'create', text: 'Create a flow', onClick: log('create flow') },
    ],
  },
  { key: 'share', text: 'Share', icon: <Share20Regular />, position: 'overflow', onClick: log('share') },
];

const choiceGridConfig: V9GridToolbarConfig = { layout: 'dynamics', title: 'Choice Grid', commands: choiceGridCommands };

const Frame: React.FC<{ width: number | string; label?: string; children: React.ReactNode }> = ({ width, label, children }) => (
  <div style={{ marginBottom: 24 }}>
    {label && <div style={{ font: '12px Segoe UI', color: '#605e5c', marginBottom: 4 }}>{label}</div>}
    <div style={{ width, border: '1px solid #edebe9', borderRadius: 4, padding: '8px 12px', background: '#fff' }}>{children}</div>
  </div>
);

export const ChoiceGridToolbar: Story = {
  render: () => (
    <Frame width={1100}>
      <DataGrid<DemoRow> items={demoRows} columns={demoColumns} getKey={(r) => r.key} aria-label="Choice Grid" toolbar={choiceGridConfig} />
    </Frame>
  ),
};

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

/** Drag the corner: only the container resizes, as in a custom-page pane. */
export const ContainerResize: Story = {
  render: () => (
    <div style={{ resize: 'horizontal', overflow: 'hidden', width: 900, minWidth: 200, maxWidth: '100%', border: '1px dashed #8a8886', padding: 8 }}>
      <GridToolbar config={choiceGridConfig} />
    </div>
  ),
};

export const TimelineIconOnly: Story = {
  render: () => (
    <Frame width={520}>
      <GridToolbar
        config={{
          layout: 'dynamics',
          title: 'Timeline',
          iconOnly: true,
          commands: [
            { key: 'new', text: 'Create a timeline record', icon: <Add20Regular /> },
            { key: 'bookmark', text: 'Pin', icon: <Bookmark20Regular /> },
            { key: 'filter', text: 'Filter', icon: <Filter20Regular /> },
            { key: 'sort', text: 'Sort', icon: <ArrowSort20Regular /> },
            { key: 'refresh', text: 'Refresh timeline', icon: <ArrowClockwise20Regular /> },
            { key: 'expand', text: 'Expand all records', position: 'overflow' },
          ],
        }}
      />
    </Frame>
  ),
};

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
            aria-label="Accounts"
            selectionMode="multiple"
            onSelectionChanged={(rows) => setCount(rows.length)}
            toolbar={{
              layout: 'dynamics',
              title: `Accounts (${count} selected)`,
              selectedCount: count,
              commands: [
                { key: 'new', text: 'New', icon: <Add20Regular /> },
                { key: 'edit', text: 'Edit', icon: <Edit20Regular />, minSelectionCount: 1, maxSelectionCount: 1 },
                { key: 'delete', text: 'Delete', icon: <Delete20Regular />, minSelectionCount: 1 },
                { key: 'refresh', text: 'Refresh', icon: <ArrowClockwise20Regular /> },
              ],
            }}
          />
        </Frame>
      );
    };
    return <Demo />;
  },
};

export const DefaultLayoutReference: Story = {
  render: () => (
    <Frame width={940}>
      <GridToolbar
        config={{
          showSearch: true,
          searchPlaceholder: 'Search',
          commands: choiceGridCommands.filter((c) => !c.menuItems && c.key !== 'share'),
        }}
      />
    </Frame>
  ),
};
