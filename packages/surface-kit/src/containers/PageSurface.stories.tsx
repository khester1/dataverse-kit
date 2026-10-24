import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';
import { PageSurface } from './PageSurface';
import { SectionCard } from './SectionCard';
import { DemoFields } from '../_storybook/sample';

/** A page-level form canvas (FormSurface + an optional centered max-width). Hosts
 *  section cards in a column grid that reflows responsively. */
const body = (
  <>
    <SectionCard title="Account" columnSpan={1} internalColumns={1}>
      <DemoFields count={3} />
    </SectionCard>
    <SectionCard title="Contact" columnSpan={1} internalColumns={1}>
      <DemoFields count={3} />
    </SectionCard>
    <SectionCard title="Notes" columnSpan={2} internalColumns={1}>
      <DemoFields count={2} />
    </SectionCard>
  </>
);

const meta = {
  title: 'Surface Kit/Containers/PageSurface',
  component: PageSurface,
  args: { columns: 2, children: body },
} satisfies Meta<typeof PageSurface>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FullWidth: Story = {};

/** Centered with a comfortable reading max-width (record/detail page). */
export const Centered: Story = { args: { centered: true, maxWidth: 900 } };

/**
 * Responsive: forced to a narrow container (e.g. a PCF `allocatedWidth`), the two-up
 * section cards collapse to a single column. Reflow is driven off the CONTAINER width,
 * not the viewport — resize the canvas to see the same behavior fluidly.
 */
export const NarrowContainerStacks: Story = {
  args: { containerWidth: 420 },
};
