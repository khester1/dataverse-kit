import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { EditableTextCell } from './EditableTextCell';
import type { IReusableColumn } from '../types';

const meta: Meta = {
  title: 'Cell Renderers/Editable/EditableTextCell',
  component: EditableTextCell as any,
  tags: ['autodocs'],
};
export default meta;

interface DemoItem { key: string; name: string }

const makeColumn = (overrides?: Partial<IReusableColumn<DemoItem>>): IReusableColumn<DemoItem> => ({
  key: 'name',
  name: 'Name',
  fieldName: 'name',
  fieldType: 'text',
  minWidth: 150,
  ...overrides,
});

const item: DemoItem = { key: '1', name: 'Contoso Ltd' };

const EditableTextDemo = ({ editMode, dirty, error }: { editMode: boolean; dirty?: boolean; error?: string }) => {
  const [val, setVal] = useState<unknown>('Contoso Ltd');
  return (
    <div style={{ width: 200, height: 42, display: 'flex', alignItems: 'center' }}>
      <EditableTextCell
        item={item}
        column={makeColumn()}
        value="Contoso Ltd"
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

export const ReadMode: StoryObj = {
  render: () => <EditableTextDemo editMode={false} />,
};

export const EditMode: StoryObj = {
  render: () => <EditableTextDemo editMode={true} />,
};

export const DirtyState: StoryObj = {
  render: () => <EditableTextDemo editMode={true} dirty={true} />,
};

export const ErrorState: StoryObj = {
  render: () => <EditableTextDemo editMode={true} error="Name is required" />,
};

export const NullInReadMode: StoryObj = {
  render: () => (
    <div style={{ width: 200, height: 42, display: 'flex', alignItems: 'center' }}>
      <EditableTextCell
        item={item}
        column={makeColumn()}
        value={null}
        itemKey="1"
        isEditMode={false}
        isDirty={false}
        onValueChange={() => {}}
      />
    </div>
  ),
};
