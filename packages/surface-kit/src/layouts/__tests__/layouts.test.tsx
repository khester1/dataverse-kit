import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { FieldRow } from '../FieldRow';
import { ColumnLayout } from '../ColumnLayout';

describe('FieldRow', () => {
  it('renders the label, required asterisk, and the control', () => {
    render(
      <FieldRow label="Name" required>
        <input aria-label="name-input" />
      </FieldRow>,
    );
    expect(screen.getByText('Name')).toBeTruthy();
    expect(screen.getByText('*')).toBeTruthy();
    expect(screen.getByLabelText('name-input')).toBeTruthy();
  });

  it('renders the control even with no label', () => {
    render(
      <FieldRow>
        <span>just-control</span>
      </FieldRow>,
    );
    expect(screen.getByText('just-control')).toBeTruthy();
  });
});

describe('ColumnLayout', () => {
  it('renders all children', () => {
    render(
      <ColumnLayout columns={2}>
        <div>c1</div>
        <div>c2</div>
      </ColumnLayout>,
    );
    expect(screen.getByText('c1')).toBeTruthy();
    expect(screen.getByText('c2')).toBeTruthy();
  });
});
