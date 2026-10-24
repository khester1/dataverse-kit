import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { EditableNumberCell } from './EditableNumberCell';
import type { IReusableColumn } from '../types';

const meta: Meta = {
  title: 'Cell Renderers/Editable/EditableNumberCell',
  component: EditableNumberCell as any,
  tags: ['autodocs'],
};
export default meta;

interface DemoItem { key: string; revenue: number }

const makeColumn = (overrides?: Partial<IReusableColumn<DemoItem>>): IReusableColumn<DemoItem> => ({
  key: 'revenue',
  name: 'Revenue',
  fieldName: 'revenue',
  fieldType: 'number',
  minWidth: 120,
  ...overrides,
});

const item: DemoItem = { key: '1', revenue: 5000 };

const EditableNumberDemo = ({
  editMode,
  dirty,
  error,
  isCurrency,
  initial = 5000,
}: {
  editMode: boolean;
  dirty?: boolean;
  error?: string;
  isCurrency?: boolean;
  initial?: number | null;
}) => {
  const [val, setVal] = useState<unknown>(initial);
  return (
    <div style={{ width: 200, height: 42, display: 'flex', alignItems: 'center' }}>
      <EditableNumberCell
        item={item}
        column={makeColumn({ fieldType: isCurrency ? 'currency' : 'number' })}
        value={initial}
        itemKey="1"
        isEditMode={editMode}
        isDirty={dirty || false}
        editedValue={val}
        onValueChange={(_, __, v) => setVal(v)}
        errorMessage={error}
        isCurrency={isCurrency}
      />
    </div>
  );
};

export const ReadMode: StoryObj = {
  render: () => <EditableNumberDemo editMode={false} />,
};

export const EditMode: StoryObj = {
  render: () => <EditableNumberDemo editMode={true} />,
};

export const CurrencyReadMode: StoryObj = {
  render: () => <EditableNumberDemo editMode={false} isCurrency={true} initial={1234567.89} />,
};

export const CurrencyEditMode: StoryObj = {
  render: () => <EditableNumberDemo editMode={true} isCurrency={true} initial={1234567.89} />,
};

export const DirtyState: StoryObj = {
  render: () => <EditableNumberDemo editMode={true} dirty={true} />,
};

export const ErrorState: StoryObj = {
  render: () => <EditableNumberDemo editMode={true} error="Must be positive" />,
};

export const NullValue: StoryObj = {
  render: () => <EditableNumberDemo editMode={false} initial={null} />,
};
