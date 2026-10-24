import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { initializeIcons, MessageBar, Stack, Text } from '@fluentui/react';
import { DataGrid } from '../hosts/DataGrid';
import type { ColumnDef } from '../types';

initializeIcons();

const meta: Meta = {
  title: 'Grid Kit/File Drop',
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
};
export default meta;

interface DocRow extends Record<string, unknown> {
  key: string;
  name: string;
  invoice: string;
  certificate: string;
}
const rows: DocRow[] = [
  { key: '1', name: 'Order 1001', invoice: 'Missing', certificate: 'Missing' },
  { key: '2', name: 'Order 1002', invoice: 'Uploaded', certificate: 'Missing' },
  { key: '3', name: 'Order 1003', invoice: 'Missing', certificate: 'Uploaded' },
];

const CellFileDropDemo: React.FC = () => {
  const [log, setLog] = useState<string[]>([]);
  const dropCol = (key: string, name: string): ColumnDef<DocRow> => ({
    key,
    fieldName: key,
    name,
    rendererType: 'fileDrop',
    minWidth: 160,
    rendererConfig: {
      accept: ['.pdf', '.png', '.jpg'],
      label: 'Drop file ⤓',
      onDrop: (files: File[], item: DocRow) => setLog((l) => [`Dropped ${files[0].name} on ${item.name} / ${name}`, ...l]),
      onReject: (reason: string) => setLog((l) => [`Rejected: ${reason}`, ...l]),
    },
  });
  const columns: ColumnDef<DocRow>[] = [
    { key: 'name', fieldName: 'name', name: 'Order', rendererType: 'text', minWidth: 120 },
    dropCol('invoice', 'Invoice'),
    dropCol('certificate', 'Certificate'),
  ];
  return (
    <Stack tokens={{ childrenGap: 10 }}>
      <Text variant="mediumPlus">Drag a .pdf/.png/.jpg from your desktop onto a cell. Each cell highlights on hover.</Text>
      {/* Notification banner sits ABOVE the grid (not below). */}
      {log.length > 0 && <MessageBar>{log[0]}</MessageBar>}
      <DataGrid<DocRow> items={rows} columns={columns} getKey={(r) => r.key} />
    </Stack>
  );
};

const RowFileDropDemo: React.FC = () => {
  const [log, setLog] = useState<string>('');
  const columns: ColumnDef<DocRow>[] = [
    { key: 'name', fieldName: 'name', name: 'Order', rendererType: 'text', minWidth: 120 },
    { key: 'invoice', fieldName: 'invoice', name: 'Invoice', rendererType: 'text', minWidth: 120 },
    { key: 'certificate', fieldName: 'certificate', name: 'Certificate', rendererType: 'text', minWidth: 120 },
  ];
  return (
    <Stack tokens={{ childrenGap: 10 }}>
      <Text variant="mediumPlus">Drop a file anywhere on a row — the whole row is the drop target.</Text>
      {/* Notification banner sits ABOVE the grid (not below) so it's visible without scrolling. */}
      {log && <MessageBar>{log}</MessageBar>}
      <DataGrid<DocRow>
        items={rows}
        columns={columns}
        getKey={(r) => r.key}
        rowFileDrop={{
          accept: ['.pdf', '.png', '.jpg'],
          onDrop: (item, files) => setLog(`Dropped ${files[0].name} on ${item.name}`),
          onReject: (item, reason) => setLog(`Rejected on ${item.name}: ${reason}`),
        }}
      />
    </Stack>
  );
};

/** Per-cell file drop: drop a PDF/image onto the Invoice or Certificate cell. */
export const CellFileDrop: StoryObj = { render: () => <CellFileDropDemo /> };

/** Whole-row file drop: drop a file anywhere on a row. */
export const RowFileDrop: StoryObj = { render: () => <RowFileDropDemo /> };
