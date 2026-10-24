import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { RatingCell } from './RatingCell';
import type { IReusableColumn } from '../types';

const meta: Meta = {
  title: 'Cell Renderers/RatingCell',
  component: RatingCell as any,
  tags: ['autodocs'],
};
export default meta;

interface DemoItem {
  key: string;
  rating: number;
}

const makeColumn = (overrides?: Partial<IReusableColumn<DemoItem>>): IReusableColumn<DemoItem> => ({
  key: 'rating',
  name: 'Rating',
  fieldName: 'rating',
  fieldType: 'rating',
  minWidth: 120,
  ...overrides,
});

const item: DemoItem = { key: '1', rating: 3 };

export const ThreeStars: StoryObj = {
  render: () => <RatingCell item={item} column={makeColumn()} value={3} itemKey="1" />,
};

export const HalfStar: StoryObj = {
  render: () => <RatingCell item={item} column={makeColumn()} value={3.5} itemKey="1" />,
};

export const Full: StoryObj = {
  render: () => <RatingCell item={item} column={makeColumn()} value={5} itemKey="1" />,
};

export const Empty: StoryObj = {
  render: () => <RatingCell item={item} column={makeColumn()} value={0} itemKey="1" />,
};

export const TenScale: StoryObj = {
  render: () => <RatingCell item={item} column={makeColumn({ ratingMax: 10 })} value={7} itemKey="1" />,
};

export const CustomColor: StoryObj = {
  render: () => (
    <RatingCell item={item} column={makeColumn({ ratingColor: '#0078d4' })} value={4} itemKey="1" />
  ),
};

export const NoHalf: StoryObj = {
  render: () => (
    <RatingCell item={item} column={makeColumn({ ratingAllowHalf: false })} value={3.5} itemKey="1" />
  ),
};
