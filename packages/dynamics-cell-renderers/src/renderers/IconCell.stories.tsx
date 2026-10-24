import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { IconCell } from './IconCell';
import type { IReusableColumn } from '../types';

const meta: Meta = {
  title: 'Cell Renderers/IconCell',
  component: IconCell as any,
  tags: ['autodocs'],
};
export default meta;

interface DemoItem { key: string; name: string }

const makeColumn = (overrides?: Partial<IReusableColumn<DemoItem>>): IReusableColumn<DemoItem> => ({
  key: 'actions',
  name: 'Actions',
  fieldType: 'icon',
  minWidth: 40,
  maxWidth: 40,
  ...overrides,
});

const item: DemoItem = { key: '1', name: 'Contoso' };

export const MoreIcon: StoryObj = {
  render: () => (
    <IconCell
      item={item}
      column={makeColumn({ onIconClick: () => alert('Clicked!') })}
      value={null}
      itemKey="1"
    />
  ),
};

export const EditIcon: StoryObj = {
  render: () => (
    <IconCell
      item={item}
      column={makeColumn({
        iconName: 'Edit',
        iconTitle: 'Edit record',
        onIconClick: () => alert('Edit clicked!'),
      })}
      value={null}
      itemKey="1"
    />
  ),
};

export const DeleteIcon: StoryObj = {
  render: () => (
    <IconCell
      item={item}
      column={makeColumn({
        iconName: 'Delete',
        iconTitle: 'Delete record',
        onIconClick: () => alert('Delete clicked!'),
      })}
      value={null}
      itemKey="1"
    />
  ),
};

export const OpenInNewWindowIcon: StoryObj = {
  render: () => (
    <IconCell
      item={item}
      column={makeColumn({
        iconName: 'OpenInNewWindow',
        iconTitle: 'Open in Dynamics',
        onIconClick: () => alert('Open clicked!'),
      })}
      value={null}
      itemKey="1"
    />
  ),
};
