import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { TextCell } from './TextCell';
import type { IReusableColumn } from '../types';

const meta: Meta = {
  title: 'Cell Renderers/TextCell',
  component: TextCell as any,
  tags: ['autodocs'],
};
export default meta;

interface DemoItem { key: string; name: string; description: string }

const makeColumn = (overrides?: Partial<IReusableColumn<DemoItem>>): IReusableColumn<DemoItem> => ({
  key: 'name',
  name: 'Name',
  fieldName: 'name',
  fieldType: 'text',
  minWidth: 100,
  ...overrides,
});

const item: DemoItem = { key: '1', name: 'Contoso Ltd', description: 'A sample account' };

export const Default: StoryObj = {
  render: () => <TextCell item={item} column={makeColumn()} value="Contoso Ltd" itemKey="1" />,
};

export const LongText: StoryObj = {
  render: () => (
    <div style={{ width: 150 }}>
      <TextCell
        item={item}
        column={makeColumn()}
        value="This is a very long text value that should be truncated with an ellipsis"
        itemKey="1"
      />
    </div>
  ),
};

export const NullValue: StoryObj = {
  render: () => <TextCell item={item} column={makeColumn()} value={null} itemKey="1" />,
};

export const UndefinedValue: StoryObj = {
  render: () => <TextCell item={item} column={makeColumn()} value={undefined} itemKey="1" />,
};

export const WithFormatValue: StoryObj = {
  render: () => (
    <TextCell
      item={item}
      column={makeColumn({ formatValue: (v) => String(v).toUpperCase() })}
      value="contoso"
      itemKey="1"
    />
  ),
};

export const NumericAsText: StoryObj = {
  render: () => <TextCell item={item} column={makeColumn()} value={42} itemKey="1" />,
};
