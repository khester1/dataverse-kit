import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ToggleCell } from './ToggleCell';
import type { IReusableColumn } from '../types';

const meta: Meta = {
  title: 'Cell Renderers/ToggleCell',
  component: ToggleCell as any,
  tags: ['autodocs'],
};
export default meta;

interface DemoItem { key: string; isActive: boolean }

const makeColumn = (overrides?: Partial<IReusableColumn<DemoItem>>): IReusableColumn<DemoItem> => ({
  key: 'isActive',
  name: 'Active',
  fieldName: 'isActive',
  fieldType: 'toggle',
  minWidth: 80,
  editable: true,
  ...overrides,
});

const item: DemoItem = { key: '1', isActive: true };

export const On: StoryObj = {
  render: () => (
    <ToggleCell
      item={item}
      column={makeColumn({ onToggleChange: (k, f, v) => console.log(k, f, v) })}
      value={true}
      itemKey="1"
    />
  ),
};

export const Off: StoryObj = {
  render: () => (
    <ToggleCell
      item={item}
      column={makeColumn({ onToggleChange: (k, f, v) => console.log(k, f, v) })}
      value={false}
      itemKey="1"
    />
  ),
};

export const CustomLabels: StoryObj = {
  render: () => (
    <ToggleCell
      item={item}
      column={makeColumn({
        toggleOnText: 'Enabled',
        toggleOffText: 'Disabled',
        onToggleChange: () => {},
      })}
      value={true}
      itemKey="1"
    />
  ),
};

export const Disabled: StoryObj = {
  render: () => (
    <ToggleCell
      item={item}
      column={makeColumn({ editable: false })}
      value={true}
      itemKey="1"
    />
  ),
};
