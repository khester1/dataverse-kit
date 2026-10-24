import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { DateCell } from './DateCell';
import type { IReusableColumn } from '../types';

const meta: Meta = {
  title: 'Cell Renderers/DateCell',
  component: DateCell as any,
  tags: ['autodocs'],
};
export default meta;

interface DemoItem { key: string; createdOn: string }

const makeColumn = (overrides?: Partial<IReusableColumn<DemoItem>>): IReusableColumn<DemoItem> => ({
  key: 'createdOn',
  name: 'Created On',
  fieldName: 'createdOn',
  fieldType: 'date',
  minWidth: 100,
  ...overrides,
});

const item: DemoItem = { key: '1', createdOn: '2024-06-15T10:30:00Z' };

export const DateOnly: StoryObj = {
  render: () => (
    <DateCell item={item} column={makeColumn()} value="2024-06-15" itemKey="1" />
  ),
};

export const DateTime: StoryObj = {
  render: () => (
    <DateCell
      item={item}
      column={makeColumn({ fieldType: 'datetime' })}
      value="2024-06-15T10:30:00Z"
      itemKey="1"
    />
  ),
};

export const GermanLocale: StoryObj = {
  render: () => (
    <DateCell
      item={item}
      column={makeColumn({ locale: 'de-DE' })}
      value="2024-06-15"
      itemKey="1"
    />
  ),
};

export const NullValue: StoryObj = {
  render: () => <DateCell item={item} column={makeColumn()} value={null} itemKey="1" />,
};

export const WithFormatValue: StoryObj = {
  render: () => (
    <DateCell
      item={item}
      column={makeColumn({ formatValue: () => 'Custom Date Format' })}
      value="2024-06-15"
      itemKey="1"
    />
  ),
};
