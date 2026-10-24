import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { OptionSetCell } from './OptionSetCell';
import type { IReusableColumn } from '../types';

const meta: Meta = {
  title: 'Cell Renderers/OptionSetCell',
  component: OptionSetCell as any,
  tags: ['autodocs'],
};
export default meta;

interface DemoItem { key: string; status: number }

const makeColumn = (overrides?: Partial<IReusableColumn<DemoItem>>): IReusableColumn<DemoItem> => ({
  key: 'status',
  name: 'Status',
  fieldName: 'status',
  fieldType: 'optionset',
  minWidth: 100,
  ...overrides,
});

const item: DemoItem = { key: '1', status: 0 };

export const Active: StoryObj = {
  render: () => (
    <OptionSetCell
      item={item}
      column={makeColumn({ formatValue: () => 'Active' })}
      value={0}
      itemKey="1"
    />
  ),
};

export const Inactive: StoryObj = {
  render: () => (
    <OptionSetCell
      item={item}
      column={makeColumn({ formatValue: () => 'Inactive' })}
      value={1}
      itemKey="1"
    />
  ),
};

export const Open: StoryObj = {
  render: () => (
    <OptionSetCell
      item={item}
      column={makeColumn({ formatValue: () => 'Open' })}
      value={2}
      itemKey="1"
    />
  ),
};

export const Pending: StoryObj = {
  render: () => (
    <OptionSetCell
      item={item}
      column={makeColumn({ formatValue: () => 'Pending' })}
      value={3}
      itemKey="1"
    />
  ),
};

export const CustomColorMap: StoryObj = {
  render: () => (
    <OptionSetCell
      item={item}
      column={makeColumn({
        colorMap: { 'High': '#d13438', 'Medium': '#ffb900', 'Low': '#107c10' },
        formatValue: () => 'High',
      })}
      value="High"
      itemKey="1"
    />
  ),
};

export const NullValue: StoryObj = {
  render: () => <OptionSetCell item={item} column={makeColumn()} value={null} itemKey="1" />,
};

export const WithGetBackgroundColor: StoryObj = {
  render: () => (
    <OptionSetCell
      item={item}
      column={makeColumn({
        getBackgroundColor: (v) => (v as number) > 50 ? '#107c10' : '#d13438',
        formatValue: (v) => `Score: ${v}`,
      })}
      value={75}
      itemKey="1"
    />
  ),
};
