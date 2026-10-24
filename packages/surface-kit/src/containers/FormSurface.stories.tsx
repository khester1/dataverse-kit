import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';
import { FormSurface } from './FormSurface';
import { SectionCard } from './SectionCard';
import { DemoFields } from '../_storybook/sample';

const meta = {
  title: 'Surface Kit/Containers/Form Shell',
  component: FormSurface,
} satisfies Meta<typeof FormSurface>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A Dynamics-style two-column form: two side-by-side section cards + a full-width one. */
export const TwoColumnForm: Story = {
  render: () => (
    <FormSurface columns={2}>
      <SectionCard title="Account" columnSpan={1} internalColumns={1}>
        <DemoFields count={3} />
      </SectionCard>
      <SectionCard title="Contact" columnSpan={1} internalColumns={1}>
        <DemoFields count={3} />
      </SectionCard>
      <SectionCard title="Notes" columnSpan={2} internalColumns={1}>
        <DemoFields count={2} />
      </SectionCard>
    </FormSurface>
  ),
};

/** Same form forced to a narrow container (PCF allocatedWidth) — sections stack to one column. */
export const NarrowContainerStacks: Story = {
  render: () => (
    <FormSurface columns={2} containerWidth={420}>
      <SectionCard title="Account" columnSpan={1} internalColumns={1}>
        <DemoFields count={3} />
      </SectionCard>
      <SectionCard title="Contact" columnStart={2} columnSpan={1} internalColumns={1}>
        <DemoFields count={3} />
      </SectionCard>
    </FormSurface>
  ),
};

/** Compact density: `density="compact"` scales the canvas gap/padding by 0.75 and
 *  cascades to the child Sections (tighter card padding + field gaps) via context.
 *  `comfortable` is the default (and byte-identical to no density). */
export const CompactDensity: Story = {
  render: () => (
    <FormSurface columns={2} density="compact">
      <SectionCard title="Account" columnSpan={1} internalColumns={1}>
        <DemoFields count={3} />
      </SectionCard>
      <SectionCard title="Contact" columnSpan={1} internalColumns={1}>
        <DemoFields count={3} />
      </SectionCard>
    </FormSurface>
  ),
};
