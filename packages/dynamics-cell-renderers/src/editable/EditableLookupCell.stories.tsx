import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { EditableLookupCell } from './EditableLookupCell';
import type { IReusableColumn, IApiService } from '../types';

const meta: Meta = {
  title: 'Cell Renderers/Editable/EditableLookupCell',
  component: EditableLookupCell as any,
  tags: ['autodocs'],
};
export default meta;

interface DemoItem {
  key: string;
  primarycontactid: unknown;
  _primarycontactid_value: string;
}

const makeColumn = (overrides?: Partial<IReusableColumn<DemoItem>>): IReusableColumn<DemoItem> => ({
  key: 'primarycontactid',
  name: 'Primary Contact',
  fieldName: 'primarycontactid',
  fieldType: 'lookup',
  minWidth: 200,
  lookupTargetEntity: 'contact',
  lookupEntitySetName: 'contacts',
  lookupSearchField: 'fullname',
  lookupPrimaryIdAttribute: 'contactid',
  ...overrides,
});

const item: DemoItem = {
  key: '1',
  primarycontactid: { contactid: 'abc-123', fullname: 'John Smith' },
  _primarycontactid_value: 'abc-123',
};

// Mock API service for stories
const mockApiService: IApiService = {
  retrieveMultipleRecords: async () => ({
    value: [
      { contactid: 'abc-123', fullname: 'John Smith' },
      { contactid: 'def-456', fullname: 'Jane Doe' },
      { contactid: 'ghi-789', fullname: 'Bob Johnson' },
    ],
  }),
};

export const ReadMode: StoryObj = {
  render: () => (
    <div style={{ width: 250, height: 42, display: 'flex', alignItems: 'center' }}>
      <EditableLookupCell
        item={item}
        column={makeColumn()}
        value={{ contactid: 'abc-123', fullname: 'John Smith' }}
        itemKey="1"
        isEditMode={false}
        isDirty={false}
        onValueChange={() => {}}
      />
    </div>
  ),
};

export const ReadModeWithNavigation: StoryObj = {
  render: () => (
    <div style={{ width: 250, height: 42, display: 'flex', alignItems: 'center' }}>
      <EditableLookupCell
        item={item}
        column={makeColumn()}
        value={{ contactid: 'abc-123', fullname: 'John Smith' }}
        itemKey="1"
        isEditMode={false}
        isDirty={false}
        onValueChange={() => {}}
        dynamicsBaseUrl="https://myorg.crm.dynamics.com"
      />
    </div>
  ),
};

export const EditMode: StoryObj = {
  render: () => (
    <div style={{ width: 250, height: 42, display: 'flex', alignItems: 'center' }}>
      <EditableLookupCell
        item={item}
        column={makeColumn()}
        value={{ contactid: 'abc-123', fullname: 'John Smith' }}
        itemKey="1"
        isEditMode={true}
        isDirty={false}
        onValueChange={() => {}}
        apiService={mockApiService}
      />
    </div>
  ),
};

export const DirtyState: StoryObj = {
  render: () => (
    <div style={{ width: 250, height: 42, display: 'flex', alignItems: 'center' }}>
      <EditableLookupCell
        item={item}
        column={makeColumn()}
        value={{ contactid: 'abc-123', fullname: 'John Smith' }}
        itemKey="1"
        isEditMode={true}
        isDirty={true}
        editedValue={{ id: 'def-456', name: 'Jane Doe' }}
        onValueChange={() => {}}
        apiService={mockApiService}
      />
    </div>
  ),
};

export const ErrorState: StoryObj = {
  render: () => (
    <div style={{ width: 250, height: 42, display: 'flex', alignItems: 'center' }}>
      <EditableLookupCell
        item={item}
        column={makeColumn()}
        value={null}
        itemKey="1"
        isEditMode={true}
        isDirty={false}
        onValueChange={() => {}}
        apiService={mockApiService}
        errorMessage="Contact is required"
      />
    </div>
  ),
};

export const NullInReadMode: StoryObj = {
  render: () => (
    <div style={{ width: 250, height: 42, display: 'flex', alignItems: 'center' }}>
      <EditableLookupCell
        item={{ ...item, primarycontactid: null, _primarycontactid_value: '' }}
        column={makeColumn()}
        value={null}
        itemKey="1"
        isEditMode={false}
        isDirty={false}
        onValueChange={() => {}}
      />
    </div>
  ),
};
