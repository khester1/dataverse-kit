import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { LookupCell } from './LookupCell';
import type { IReusableColumn } from '../types';

const meta: Meta = {
  title: 'Cell Renderers/LookupCell',
  component: LookupCell as any,
  tags: ['autodocs'],
};
export default meta;

interface DemoItem {
  key: string;
  primarycontactid: unknown;
  _primarycontactid_value: string;
  contactName: string;
}

const makeColumn = (overrides?: Partial<IReusableColumn<DemoItem>>): IReusableColumn<DemoItem> => ({
  key: 'primarycontactid',
  name: 'Primary Contact',
  fieldName: 'primarycontactid',
  fieldType: 'lookup',
  minWidth: 150,
  lookupTargetEntity: 'contact',
  lookupPrimaryIdAttribute: 'contactid',
  ...overrides,
});

const item: DemoItem = {
  key: '1',
  primarycontactid: { contactid: 'abc-123', fullname: 'John Smith' },
  _primarycontactid_value: 'abc-123',
  contactName: 'John Smith',
};

export const WithExpandedObject: StoryObj = {
  render: () => (
    <LookupCell
      item={item}
      column={makeColumn()}
      value={{ contactid: 'abc-123', fullname: 'John Smith' }}
      itemKey="1"
    />
  ),
};

export const WithLookupDisplayField: StoryObj = {
  render: () => (
    <LookupCell
      item={item}
      column={makeColumn({ lookupDisplayField: 'contactName' })}
      value={null}
      itemKey="1"
    />
  ),
};

export const WithNavigation: StoryObj = {
  render: () => (
    <LookupCell
      item={item}
      column={makeColumn()}
      value={{ contactid: 'abc-123', fullname: 'John Smith' }}
      itemKey="1"
      dynamicsBaseUrl="https://myorg.crm.dynamics.com"
    />
  ),
};

export const WithCustomClickHandler: StoryObj = {
  render: () => (
    <LookupCell
      item={item}
      column={makeColumn({ onLinkClick: () => alert('Custom handler!') })}
      value={{ fullname: 'Jane Doe' }}
      itemKey="1"
    />
  ),
};

export const NullValue: StoryObj = {
  render: () => <LookupCell item={item} column={makeColumn()} value={null} itemKey="1" />,
};

export const PlainStringValue: StoryObj = {
  render: () => (
    <LookupCell
      item={item}
      column={makeColumn()}
      value="Direct text value"
      itemKey="1"
    />
  ),
};
