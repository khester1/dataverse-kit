import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';
import { FluentProvider, Field, Input } from '@fluentui/react-components';
import { FormSurface } from './containers/FormSurface';
import { SectionCard } from './containers/SectionCard';
import { dynamicsV9Theme } from './theme';

// v9 demo fields (authentically v9: Field + Input) — the v9 counterpart of the v8
// _storybook/sample DemoFields.
const DemoFields = ({ count = 3 }: { count?: number }) => (
  <>
    {Array.from({ length: count }, (_, i) => (
      <Field key={i} label={`Field ${i + 1}`}>
        <Input placeholder={`Value ${i + 1}`} />
      </Field>
    ))}
  </>
);

const meta = {
  title: 'Surface Kit v9/Containers/Form Shell',
  component: FormSurface,
  decorators: [
    (Story) => (
      <FluentProvider theme={dynamicsV9Theme}>
        <Story />
      </FluentProvider>
    ),
  ],
} satisfies Meta<typeof FormSurface>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A Dynamics-style two-column form: two side-by-side section cards + a full-width one (Fluent v9). */
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

/** Compact density: `density="compact"` scales the canvas gap/padding by 0.75 and cascades
 *  to the child Sections via context (the SHARED density scale — same behavior as the v8 skin). */
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
