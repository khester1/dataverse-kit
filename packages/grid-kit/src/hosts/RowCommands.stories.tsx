import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { initializeIcons, MessageBar, Stack, Text } from '@fluentui/react';
import { DataGrid } from './DataGrid';
import { NestedGrid } from './nested/NestedGrid';
import { FocusedViewGrid } from './FocusedViewGrid';
import { GroupedGrid } from './GroupedGrid';
import { CardGrid } from './CardGrid';
import { demoColumns, demoRows } from '../_storybook/sample';
import type { DemoRow } from '../_storybook/sample';
import type { ColumnDef, NestedConfig, RowCommand } from '../types';

initializeIcons();

const meta: Meta = {
  title: 'Grid Kit/Row Commands',
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
};
export default meta;

/**
 * Right-click any row to open its context menu (`GridProps.rowCommands`). The native
 * browser menu is suppressed. `visible`/`disabled` are evaluated per row — "Delete" is
 * disabled for Inactive accounts, and "Deactivate" only appears for Active ones. The same
 * `rowCommands` work across every host: flat `DataGrid`, `GroupedGrid`, inline `NestedGrid`
 * parents, flat `CardGrid` (card list), card parents (`parentLayout: 'cards'`), and the
 * `FocusedViewGrid` rail.
 */
const RowCommandsDemo: React.FC<{
  variant?: 'flat' | 'grouped' | 'nested' | 'card' | 'flatcard' | 'focused';
}> = ({ variant = 'flat' }) => {
  const [log, setLog] = useState<string[]>([]);
  const push = (msg: string) => setLog((l) => [msg, ...l].slice(0, 5));

  const rowCommands: RowCommand<DemoRow>[] = [
    { key: 'open', text: 'Open', iconName: 'OpenInNewWindow', onClick: (r) => push(`Open → ${r.name}`) },
    { key: 'edit', text: 'Edit', iconName: 'Edit', onClick: (r) => push(`Edit → ${r.name}`) },
    {
      key: 'deactivate',
      text: 'Deactivate',
      iconName: 'Blocked',
      visible: (r) => r.status === 'Active',
      onClick: (r) => push(`Deactivate → ${r.name}`),
    },
    {
      key: 'delete',
      text: 'Delete',
      iconName: 'Delete',
      disabled: (r) => r.status === 'Inactive',
      onClick: (r) => push(`Delete → ${r.name}`),
    },
  ];

  const childColumns: ColumnDef<DemoRow>[] = [
    { key: 'owner', fieldName: 'owner', name: 'Owner', rendererType: 'text', minWidth: 120 },
    { key: 'status', fieldName: 'status', name: 'Status', rendererType: 'text', minWidth: 100 },
  ];
  const nestedConfig: NestedConfig<DemoRow, DemoRow> = {
    mode: 'inline',
    childColumns,
    getChildren: (parent) => demoRows.filter((r) => r.key !== parent.key).slice(0, 2),
  };

  const target =
    variant === 'focused'
      ? 'rail item'
      : variant === 'card' || variant === 'flatcard'
        ? 'card'
        : 'row';

  return (
    <Stack tokens={{ childrenGap: 12 }}>
      <Text variant="small">Right-click a {target} to open its command menu.</Text>
      {variant === 'nested' && (
        <NestedGrid<DemoRow, DemoRow>
          items={demoRows}
          columns={demoColumns}
          getKey={(r) => r.key}
          rowCommands={rowCommands}
          nested={nestedConfig}
        />
      )}
      {variant === 'card' && (
        <NestedGrid<DemoRow, DemoRow>
          items={demoRows}
          columns={demoColumns}
          getKey={(r) => r.key}
          rowCommands={rowCommands}
          nested={{
            // `mode` is ignored for card parents — parentLayout wins.
            ...nestedConfig,
            parentLayout: 'cards',
            parentCard: { cardsPerRow: 2, titleField: 'name', subtitleField: 'owner' },
          }}
        />
      )}
      {variant === 'flatcard' && (
        // Flat card list (standalone <CardGrid>, no nesting). selectionMode="multiple"
        // proves the per-card checkbox stops left-click only — a right-click on it (or
        // anywhere on the card) still opens the row menu.
        <CardGrid<DemoRow>
          items={demoRows}
          columns={demoColumns}
          getKey={(r) => r.key}
          rowCommands={rowCommands}
          selectionMode="multiple"
          card={{ cardsPerRow: 2, titleField: 'name', subtitleField: 'owner' }}
        />
      )}
      {variant === 'focused' && (
        <FocusedViewGrid<DemoRow>
          items={demoRows}
          columns={demoColumns}
          getKey={(r) => r.key}
          rowCommands={rowCommands}
          focusedView={{
            rows: [
              {
                id: 'r1',
                primaryField: { fieldName: 'name', label: 'Account' },
                secondaryField: { fieldName: 'owner', label: 'Owner' },
                iconName: 'Contact',
              },
            ],
            detailFields: ['status', 'revenue', 'progress', 'score', 'created'],
          }}
        />
      )}
      {variant === 'grouped' && (
        <GroupedGrid<DemoRow>
          items={demoRows}
          columns={demoColumns}
          getKey={(r) => r.key}
          rowCommands={rowCommands}
          group={{ groupBy: 'status' }}
        />
      )}
      {variant === 'flat' && (
        <DataGrid<DemoRow>
          items={demoRows}
          columns={demoColumns}
          getKey={(r) => r.key}
          rowCommands={rowCommands}
        />
      )}
      <MessageBar>{log.length ? log.join('  •  ') : 'No command invoked yet.'}</MessageBar>
    </Stack>
  );
};

type Story = StoryObj;

/** Flat `<DataGrid>` with per-row right-click commands. */
export const FlatGrid: Story = { render: () => <RowCommandsDemo /> };

/** Grouped `<GroupedGrid>` — right-click any row (in any group) for its commands. */
export const GroupedRows: Story = { render: () => <RowCommandsDemo variant="grouped" /> };

/** Inline `<NestedGrid>` — the parent rows get the same right-click commands. */
export const InlineNestedParents: Story = { render: () => <RowCommandsDemo variant="nested" /> };

/** Card parents (`parentLayout: 'cards'`) — right-click a card for its commands. */
export const CardParentNested: Story = { render: () => <RowCommandsDemo variant="card" /> };

/** Flat `<CardGrid>` (card list, no nesting) — right-click a card for its commands. */
export const FlatCardGrid: Story = { render: () => <RowCommandsDemo variant="flatcard" /> };

/** `<FocusedViewGrid>` — right-click a left-rail item for its commands. */
export const FocusedViewRail: Story = { render: () => <RowCommandsDemo variant="focused" /> };
