import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { initializeIcons, Stack, Text } from '@fluentui/react';
import { DataGrid } from '../hosts';
import { createCellRegistry } from '../registry';
import { toGridCustomizerOverrides } from './toGridCustomizerOverrides';
import type { GcCellRendererOverrides } from './toGridCustomizerOverrides';
import { demoColumns, demoRows } from '../_storybook/sample';
import type { DemoRow } from '../_storybook/sample';

initializeIcons();

const meta: Meta = {
  title: 'Grid Kit/Cross-Host Proof',
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
};
export default meta;

/**
 * A tiny NON-DetailsList host that renders the SAME registry through the Grid
 * Customizer `cellRendererOverrides` path — proving one registry serves both.
 */
const MiniGcGrid: React.FC<{ overrides: GcCellRendererOverrides }> = ({ overrides }) => (
  <table style={{ borderCollapse: 'collapse', width: '100%' }}>
    <thead>
      <tr>
        {demoColumns.map((c) => (
          <th
            key={c.key}
            style={{ textAlign: 'left', padding: 6, borderBottom: '1px solid #edebe9', fontSize: 13 }}
          >
            {c.name}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {demoRows.map((row) => (
        <tr key={row.key}>
          {demoColumns.map((c) => {
            const Override = overrides[c.fieldName];
            return (
              <td key={c.key} style={{ padding: 6, borderBottom: '1px solid #f3f2f1' }}>
                <Override
                  value={row[c.fieldName]}
                  column={{ name: c.fieldName, dataType: c.rendererType }}
                  rowData={row}
                  entityId={row.key}
                />
              </td>
            );
          })}
        </tr>
      ))}
    </tbody>
  </table>
);

export const SameRegistryBothHosts: StoryObj = {
  render: () => {
    const registry = createCellRegistry();
    const overrides = toGridCustomizerOverrides<DemoRow>(demoColumns, registry);
    return (
      <Stack tokens={{ childrenGap: 24 }}>
        <Stack.Item>
          <Text variant="large">DetailsList host — &lt;DataGrid&gt;</Text>
          <DataGrid<DemoRow> items={demoRows} columns={demoColumns} registry={registry} getKey={(r) => r.key} />
        </Stack.Item>
        <Stack.Item>
          <Text variant="large">Grid Customizer host — cellRendererOverrides</Text>
          <MiniGcGrid overrides={overrides} />
        </Stack.Item>
      </Stack>
    );
  },
};
