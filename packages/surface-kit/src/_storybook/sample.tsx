import React from 'react';
import { TextField } from '@fluentui/react';
import { FieldRow } from '../layouts/FieldRow';

const SAMPLE: Array<[string, string]> = [
  ['Account Name', 'Contoso Ltd'],
  ['Phone', '555-0100'],
  ['Email', 'info@contoso.com'],
  ['City', 'Seattle'],
  ['Owner', 'Pat Smith'],
  ['Annual Revenue', '$1,200,000'],
];

/** A few sample Dynamics-style "Label : input" rows for stories. */
export const DemoFields: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <>
    {SAMPLE.slice(0, count).map(([label, value]) => (
      <FieldRow key={label} label={label}>
        <TextField defaultValue={value} />
      </FieldRow>
    ))}
  </>
);
