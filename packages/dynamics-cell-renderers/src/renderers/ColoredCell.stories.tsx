import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ColoredCell } from './ColoredCell';
import type { IReusableColumn } from '../types';

const meta: Meta = {
  title: 'Cell Renderers/ColoredCell',
  component: ColoredCell as any,
  tags: ['autodocs'],
};
export default meta;

interface DemoItem { key: string; priority: string }

const makeColumn = (overrides?: Partial<IReusableColumn<DemoItem>>): IReusableColumn<DemoItem> => ({
  key: 'priority',
  name: 'Priority',
  fieldName: 'priority',
  fieldType: 'coloredCell',
  minWidth: 100,
  ...overrides,
});

const item: DemoItem = { key: '1', priority: 'High' };

export const WithColorMap: StoryObj = {
  render: () => (
    <ColoredCell
      item={item}
      column={makeColumn({
        colorMap: { 'High': '#d13438', 'Medium': '#ffb900', 'Low': '#107c10' },
      })}
      value="High"
      itemKey="1"
    />
  ),
};

export const MediumPriority: StoryObj = {
  render: () => (
    <ColoredCell
      item={item}
      column={makeColumn({
        colorMap: { 'High': '#d13438', 'Medium': '#ffb900', 'Low': '#107c10' },
      })}
      value="Medium"
      itemKey="1"
    />
  ),
};

export const LowPriority: StoryObj = {
  render: () => (
    <ColoredCell
      item={item}
      column={makeColumn({
        colorMap: { 'High': '#d13438', 'Medium': '#ffb900', 'Low': '#107c10' },
      })}
      value="Low"
      itemKey="1"
    />
  ),
};

export const WithGetBackgroundColor: StoryObj = {
  render: () => (
    <ColoredCell
      item={item}
      column={makeColumn({
        getBackgroundColor: (v) => (v === 'Critical' ? '#a4262c' : '#605e5c'),
      })}
      value="Critical"
      itemKey="1"
    />
  ),
};

export const NoColorMapping: StoryObj = {
  render: () => (
    <ColoredCell
      item={item}
      column={makeColumn()}
      value="Unknown"
      itemKey="1"
    />
  ),
};

export const NullValue: StoryObj = {
  render: () => <ColoredCell item={item} column={makeColumn()} value={null} itemKey="1" />,
};
