import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { NumberCell } from './NumberCell';
import type { IReusableColumn } from '../types';

const meta: Meta = {
  title: 'Cell Renderers/NumberCell',
  component: NumberCell as any,
  tags: ['autodocs'],
};
export default meta;

interface DemoItem { key: string; count: number }

const makeColumn = (overrides?: Partial<IReusableColumn<DemoItem>>): IReusableColumn<DemoItem> => ({
  key: 'count',
  name: 'Count',
  fieldName: 'count',
  fieldType: 'number',
  minWidth: 80,
  ...overrides,
});

const item: DemoItem = { key: '1', count: 1500 };

export const Default: StoryObj = {
  render: () => <NumberCell item={item} column={makeColumn()} value={1500} itemKey="1" />,
};

export const LargeNumber: StoryObj = {
  render: () => <NumberCell item={item} column={makeColumn()} value={9876543.21} itemKey="1" />,
};

export const Negative: StoryObj = {
  render: () => <NumberCell item={item} column={makeColumn()} value={-42} itemKey="1" />,
};

export const Zero: StoryObj = {
  render: () => <NumberCell item={item} column={makeColumn()} value={0} itemKey="1" />,
};

export const NullValue: StoryObj = {
  render: () => <NumberCell item={item} column={makeColumn()} value={null} itemKey="1" />,
};

export const GermanLocale: StoryObj = {
  render: () => (
    <NumberCell
      item={item}
      column={makeColumn({ locale: 'de-DE' })}
      value={1234567.89}
      itemKey="1"
    />
  ),
};
