import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ICommandBarItemProps } from '@fluentui/react';
import { CommandSurface } from './CommandSurface';

/** The Dynamics-CE command bar: primary items (left), overflow ("…"), and far items (right). */
const items: ICommandBarItemProps[] = [
  { key: 'new', text: 'New', iconProps: { iconName: 'Add' } },
  { key: 'save', text: 'Save', iconProps: { iconName: 'Save' } },
  { key: 'delete', text: 'Delete', iconProps: { iconName: 'Delete' } },
  { key: 'refresh', text: 'Refresh', iconProps: { iconName: 'Refresh' } },
];

const farItems: ICommandBarItemProps[] = [
  { key: 'flow', text: 'Flow', iconProps: { iconName: 'Flow' } },
];

const meta = {
  title: 'Surface Kit/Containers/CommandSurface',
  component: CommandSurface,
  args: { items, farItems },
} satisfies Meta<typeof CommandSurface>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {};

export const WithOverflow: Story = {
  args: {
    overflowItems: [
      { key: 'assign', text: 'Assign', iconProps: { iconName: 'Contact' } },
      { key: 'share', text: 'Share', iconProps: { iconName: 'Share' } },
      { key: 'export', text: 'Export to Excel', iconProps: { iconName: 'ExcelDocument' } },
    ],
  },
};
