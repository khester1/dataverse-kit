import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { EditableDateCell } from './EditableDateCell';
import type { IReusableColumn } from '../types';

const meta: Meta = {
  title: 'Cell Renderers/Editable/EditableDateCell',
  component: EditableDateCell as any,
  tags: ['autodocs'],
};
export default meta;

interface DemoItem { key: string; createdOn: string }

const makeColumn = (overrides?: Partial<IReusableColumn<DemoItem>>): IReusableColumn<DemoItem> => ({
  key: 'createdOn',
  name: 'Created On',
  fieldName: 'createdOn',
  fieldType: 'date',
  minWidth: 150,
  ...overrides,
});

const item: DemoItem = { key: '1', createdOn: '2024-06-15' };

const EditableDateDemo = ({
  editMode,
  dirty,
  error,
  isDateTime,
  initial = '2024-06-15',
}: {
  editMode: boolean;
  dirty?: boolean;
  error?: string;
  isDateTime?: boolean;
  initial?: string | null;
}) => {
  const [val, setVal] = useState<unknown>(initial);
  return (
    <div style={{ width: isDateTime ? 320 : 200, height: 42, display: 'flex', alignItems: 'center' }}>
      <EditableDateCell
        item={item}
        column={makeColumn({ fieldType: isDateTime ? 'datetime' : 'date' })}
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

export const DateReadMode: StoryObj = {
  render: () => <EditableDateDemo editMode={false} />,
};

export const DateEditMode: StoryObj = {
  render: () => <EditableDateDemo editMode={true} />,
};

export const DateTimeReadMode: StoryObj = {
  render: () => <EditableDateDemo editMode={false} isDateTime={true} initial="2024-06-15T14:30:00Z" />,
};

export const DateTimeEditMode: StoryObj = {
  render: () => <EditableDateDemo editMode={true} isDateTime={true} initial="2024-06-15T14:30:00Z" />,
};

export const DirtyState: StoryObj = {
  render: () => <EditableDateDemo editMode={true} dirty={true} />,
};

export const ErrorState: StoryObj = {
  render: () => <EditableDateDemo editMode={true} error="Date is required" />,
};

export const NullValue: StoryObj = {
  render: () => <EditableDateDemo editMode={false} initial={null} />,
};
