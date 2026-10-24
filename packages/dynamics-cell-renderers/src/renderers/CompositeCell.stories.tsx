import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CompositeCell } from './CompositeCell';
import type { CompositeSlot, IReusableColumn } from '../types';

const meta: Meta = {
  title: 'Cell Renderers/CompositeCell',
  component: CompositeCell as any,
  tags: ['autodocs'],
};
export default meta;

interface DemoItem {
  key: string;
  name: string;
  status: string;
  avatar: string;
  score: number;
}

const makeColumn = (slots: CompositeSlot[]): IReusableColumn<DemoItem> => ({
  key: 'profile',
  name: 'Profile',
  fieldName: 'name',
  fieldType: 'composite',
  minWidth: 240,
  compositeSlots: slots,
});

const item: DemoItem = {
  key: '1',
  name: 'Contoso Ltd',
  status: 'Active',
  avatar: 'https://placehold.co/40',
  score: 4,
};

export const IconTextBadge: StoryObj = {
  render: () => (
    <CompositeCell
      item={item}
      itemKey="1"
      value={item.name}
      column={makeColumn([
        { id: 's1', type: 'icon', staticValue: 'Contact' },
        { id: 's2', type: 'text', fieldBinding: 'name', defaultStyle: { fontWeight: '600' } },
        { id: 's3', type: 'spacer' },
        {
          id: 's4',
          type: 'badge',
          fieldBinding: 'status',
          defaultStyle: { backgroundColor: '#edebe9', color: '#323130' },
          conditionalStyles: [
            { field: 'status', operator: 'eq', value: 'Active', style: { backgroundColor: '#dff6dd', color: '#107c10' } },
          ],
        },
      ])}
    />
  ),
};

export const ImageNameRating: StoryObj = {
  render: () => (
    <CompositeCell
      item={item}
      itemKey="1"
      value={item.name}
      column={makeColumn([
        { id: 's1', type: 'image', fieldBinding: 'avatar' },
        { id: 's2', type: 'text', fieldBinding: 'name' },
        { id: 's3', type: 'rating', fieldBinding: 'score' },
      ])}
    />
  ),
};

export const Vertical: StoryObj = {
  render: () => (
    <CompositeCell
      item={item}
      itemKey="1"
      value={item.name}
      column={{
        ...makeColumn([
          { id: 's1', type: 'text', fieldBinding: 'name', defaultStyle: { fontWeight: '600' } },
          { id: 's2', type: 'text', fieldBinding: 'status', defaultStyle: { fontSize: '12px', color: '#605e5c' } },
        ]),
        compositeLayout: 'vertical',
        compositeGap: 2,
      }}
    />
  ),
};
