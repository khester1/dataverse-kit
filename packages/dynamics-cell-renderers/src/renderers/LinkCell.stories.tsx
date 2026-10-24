import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { LinkCell } from './LinkCell';
import type { IReusableColumn } from '../types';

const meta: Meta = {
  title: 'Cell Renderers/LinkCell',
  component: LinkCell as any,
  tags: ['autodocs'],
};
export default meta;

interface DemoItem { key: string; name: string }

const makeColumn = (overrides?: Partial<IReusableColumn<DemoItem>>): IReusableColumn<DemoItem> => ({
  key: 'name',
  name: 'Name',
  fieldName: 'name',
  fieldType: 'link',
  minWidth: 100,
  ...overrides,
});

const item: DemoItem = { key: '1', name: 'Contoso Ltd' };

export const Default: StoryObj = {
  render: () => (
    <LinkCell
      item={item}
      column={makeColumn({ onLinkClick: () => alert('Link clicked!') })}
      value="Contoso Ltd"
      itemKey="1"
    />
  ),
};

export const NullValue: StoryObj = {
  render: () => (
    <LinkCell
      item={item}
      column={makeColumn({ onLinkClick: () => {} })}
      value={null}
      itemKey="1"
    />
  ),
};

export const WithFormatValue: StoryObj = {
  render: () => (
    <LinkCell
      item={item}
      column={makeColumn({
        onLinkClick: () => {},
        formatValue: (v) => `>> ${v}`,
      })}
      value="Contoso"
      itemKey="1"
    />
  ),
};
