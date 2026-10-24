import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { EditableOptionSetCell } from './EditableOptionSetCell';
import type { IReusableColumn } from '../types';

const meta: Meta = {
  title: 'Cell Renderers/Editable/EditableOptionSetCell',
  component: EditableOptionSetCell as any,
  tags: ['autodocs'],
};
export default meta;

interface DemoItem { key: string; status: number }

const statusOptions = [
  { value: 0, label: 'Active' },
  { value: 1, label: 'Inactive' },
  { value: 2, label: 'Draft' },
  { value: 3, label: 'Archived' },
];

const makeColumn = (overrides?: Partial<IReusableColumn<DemoItem>>): IReusableColumn<DemoItem> => ({
  key: 'status',
  name: 'Status',
  fieldName: 'status',
  fieldType: 'optionset',
  minWidth: 150,
  optionSetOptions: statusOptions,
  colorMap: { 0: '#107c10', 1: '#d13438', 2: '#ffb900', 3: '#605e5c' },
  ...overrides,
});

const item: DemoItem = { key: '1', status: 0 };

const EditableOptionSetDemo = ({
  editMode,
  dirty,
  error,
  initial = 0,
}: {
  editMode: boolean;
  dirty?: boolean;
  error?: string;
  initial?: number | null;
}) => {
  const [val, setVal] = useState<unknown>(initial);
  return (
    <div style={{ width: 200, height: 42, display: 'flex', alignItems: 'center' }}>
      <EditableOptionSetCell
        item={item}
        column={makeColumn({ formatValue: (v) => statusOptions.find(o => o.value === v)?.label || '-' })}
        value={initial}
        itemKey="1"
        isEditMode={editMode}
        isDirty={dirty || false}
        editedValue={val}
        onValueChange={(_, __, v) => setVal(v)}
        errorMessage={error}
      />
    </div>
  );
};

export const ReadModeActive: StoryObj = {
  render: () => <EditableOptionSetDemo editMode={false} initial={0} />,
};

export const ReadModeInactive: StoryObj = {
  render: () => <EditableOptionSetDemo editMode={false} initial={1} />,
};

export const EditMode: StoryObj = {
  render: () => <EditableOptionSetDemo editMode={true} initial={0} />,
};

export const DirtyState: StoryObj = {
  render: () => <EditableOptionSetDemo editMode={true} dirty={true} initial={2} />,
};

export const ErrorState: StoryObj = {
  render: () => <EditableOptionSetDemo editMode={true} error="Status is required" />,
};

export const NullValue: StoryObj = {
  render: () => <EditableOptionSetDemo editMode={false} initial={null} />,
};
