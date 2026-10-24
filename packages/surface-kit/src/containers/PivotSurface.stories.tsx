import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';
import { PivotSurface } from './PivotSurface';
import type { SurfaceTab } from '../types';
import { DemoFields } from '../_storybook/sample';

/**
 * The Dynamics-CE form tab strip. Wraps Fluent `Pivot`; each tab carries its own
 * rendered content, an optional `iconName`, a `tooltip` (shown on hover of the tab —
 * useful for "information" tabs flagged with an Info icon), and `disabled`.
 *
 * **`linkFormat`** picks the visual style of the strip:
 * - `'links'` (default) — underlined text links (the classic Dynamics form-tab look).
 * - `'tabs'` — boxed / segmented tabs (the selected one filled).
 *
 * Compare the **Links Format** and **Tabs Format** stories to see the difference; hover
 * **Details** (the Info-icon tab) to see its tooltip.
 */
const tabs: SurfaceTab[] = [
  { id: 'general', label: 'General', content: <DemoFields count={3} /> },
  {
    id: 'details',
    label: 'Details',
    iconName: 'Info',
    tooltip: 'Detailed fields — phone, email, and address',
    content: <DemoFields count={4} />,
  },
  { id: 'related', label: 'Related', content: <DemoFields count={2} /> },
  { id: 'admin', label: 'Administration', disabled: true, content: <div /> },
];

const meta = {
  title: 'Surface Kit/Containers/PivotSurface',
  component: PivotSurface,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 720 }}>
        <Story />
      </div>
    ),
  ],
  args: { tabs, defaultSelectedId: 'general' },
} satisfies Meta<typeof PivotSurface>;

export default meta;
type Story = StoryObj<typeof meta>;

/** `linkFormat: 'links'` (default) — underlined text links, the classic Dynamics form-tab
 *  strip. The **Details** tab carries an Info icon + a hover tooltip. */
export const LinksFormat: Story = { args: { linkFormat: 'links' } };

/** `linkFormat: 'tabs'` — boxed / segmented tabs (the selected tab is filled). Same tabs,
 *  different chrome from **Links Format**. */
export const TabsFormat: Story = { args: { linkFormat: 'tabs' } };

/** Information tabs: any tab can flag itself with an `iconName: 'Info'` + a `tooltip` —
 *  hover a tab to see the explanatory tooltip Dynamics shows on info tabs. */
export const InfoTabTooltip: Story = {
  args: {
    linkFormat: 'links',
    tabs: [
      { id: 'general', label: 'General', tooltip: 'Core account fields', content: <DemoFields count={3} /> },
      {
        id: 'details',
        label: 'Details',
        iconName: 'Info',
        tooltip: 'Detailed fields — phone, email, and address',
        content: <DemoFields count={4} />,
      },
      {
        id: 'related',
        label: 'Related',
        iconName: 'Info',
        tooltip: 'Related records and activities',
        content: <DemoFields count={2} />,
      },
    ],
  },
};
