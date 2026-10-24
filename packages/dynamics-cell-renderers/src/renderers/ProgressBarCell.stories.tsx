import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ProgressBarCell } from './ProgressBarCell';
import type { IReusableColumn } from '../types';

const meta: Meta = {
  title: 'Cell Renderers/ProgressBarCell',
  component: ProgressBarCell as any,
  tags: ['autodocs'],
};
export default meta;

interface DemoItem { key: string; progress: number }

const makeColumn = (overrides?: Partial<IReusableColumn<DemoItem>>): IReusableColumn<DemoItem> => ({
  key: 'progress',
  name: 'Progress',
  fieldName: 'progress',
  fieldType: 'progressBar',
  minWidth: 150,
  ...overrides,
});

const item: DemoItem = { key: '1', progress: 75 };

export const Default: StoryObj = {
  render: () => <ProgressBarCell item={item} column={makeColumn()} value={75} itemKey="1" />,
};

export const Empty: StoryObj = {
  render: () => <ProgressBarCell item={item} column={makeColumn()} value={0} itemKey="1" />,
};

export const Full: StoryObj = {
  render: () => <ProgressBarCell item={item} column={makeColumn()} value={100} itemKey="1" />,
};

export const Half: StoryObj = {
  render: () => <ProgressBarCell item={item} column={makeColumn()} value={50} itemKey="1" />,
};

export const CustomMax: StoryObj = {
  render: () => (
    <ProgressBarCell
      item={item}
      column={makeColumn({ progressMax: 200 })}
      value={150}
      itemKey="1"
    />
  ),
};

export const CustomColor: StoryObj = {
  render: () => (
    <ProgressBarCell
      item={item}
      column={makeColumn({ progressColor: '#107c10' })}
      value={85}
      itemKey="1"
    />
  ),
};

export const RedProgress: StoryObj = {
  render: () => (
    <ProgressBarCell
      item={item}
      column={makeColumn({ progressColor: '#d13438' })}
      value={25}
      itemKey="1"
    />
  ),
};

export const NoLabel: StoryObj = {
  render: () => (
    <ProgressBarCell
      item={item}
      column={makeColumn({ showProgressLabel: false })}
      value={60}
      itemKey="1"
    />
  ),
};

export const OverMax: StoryObj = {
  render: () => <ProgressBarCell item={item} column={makeColumn()} value={150} itemKey="1" />,
};
