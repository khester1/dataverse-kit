import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CurrencyCell } from './CurrencyCell';
import type { IReusableColumn } from '../types';

const meta: Meta = {
  title: 'Cell Renderers/CurrencyCell',
  component: CurrencyCell as any,
  tags: ['autodocs'],
};
export default meta;

interface DemoItem { key: string; revenue: number }

const makeColumn = (overrides?: Partial<IReusableColumn<DemoItem>>): IReusableColumn<DemoItem> => ({
  key: 'revenue',
  name: 'Revenue',
  fieldName: 'revenue',
  fieldType: 'currency',
  minWidth: 100,
  ...overrides,
});

const item: DemoItem = { key: '1', revenue: 1234567.89 };

export const Default: StoryObj = {
  render: () => <CurrencyCell item={item} column={makeColumn()} value={1234567.89} itemKey="1" />,
};

export const Euro: StoryObj = {
  render: () => (
    <CurrencyCell
      item={item}
      column={makeColumn({ currencyCode: 'EUR', locale: 'de-DE' })}
      value={1234567.89}
      itemKey="1"
    />
  ),
};

export const BritishPound: StoryObj = {
  render: () => (
    <CurrencyCell
      item={item}
      column={makeColumn({ currencyCode: 'GBP', locale: 'en-GB' })}
      value={500000}
      itemKey="1"
    />
  ),
};

export const Negative: StoryObj = {
  render: () => <CurrencyCell item={item} column={makeColumn()} value={-500.5} itemKey="1" />,
};

export const Zero: StoryObj = {
  render: () => <CurrencyCell item={item} column={makeColumn()} value={0} itemKey="1" />,
};

export const NullValue: StoryObj = {
  render: () => <CurrencyCell item={item} column={makeColumn()} value={null} itemKey="1" />,
};

export const SmallAmount: StoryObj = {
  render: () => <CurrencyCell item={item} column={makeColumn()} value={0.99} itemKey="1" />,
};
