import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { FluentProvider, Input } from '@fluentui/react-components';
import { FieldRow, ceFieldRowFirstOffset } from '../layouts/FieldRow';
import { TabColumns } from '../layouts/TabColumns';
import { FormSurface } from '../containers/FormSurface';
import { dynamicsCeTheme, dynamicsV9Theme } from '../theme';

// ★ jsdom does no layout, so these tests pin STRUCTURE and the inline geometry the components
//   hand to the browser. Whether that geometry renders the measured Dynamics widths is proved in a
//   real browser against apps/ce-parity/reference (the parity gate), not here.

const ce = ({ children }: { children: React.ReactNode }) => (
  <FluentProvider theme={dynamicsCeTheme}>
    <FormSurface look="ce">{children}</FormSurface>
  </FluentProvider>
);
const plain = ({ children }: { children: React.ReactNode }) => (
  <FluentProvider theme={dynamicsV9Theme}>{children}</FluentProvider>
);

const part = (root: HTMLElement, name: string) =>
  root.querySelector(`[data-surface-part="${name}"]`) as HTMLElement | null;

describe('v9 FieldRow — ce look (via FormSurface context)', () => {
  it('uses the measured 184px label column and defaults to auto label position', () => {
    const { container } = render(
      <FieldRow label="Account Name" htmlFor="name">
        <Input id="name" appearance="filled-darker" placeholder="---" />
      </FieldRow>,
      { wrapper: ce },
    );
    const row = part(container, 'field-row')!;
    expect(row).toBeTruthy();
    expect(row.dataset.look).toBe('ce');
    expect(row.dataset.labelPosition).toBe('auto');
    const grid = row.firstElementChild as HTMLElement;
    // The label column arrives as a custom property, NOT an inline grid-template-columns (an inline
    // template would beat the @container rule and 'auto' could never flip to 'above').
    expect(grid.style.getPropertyValue('--sk-label-col')).toBe('184px');
    expect(grid.style.gridTemplateColumns).toBe('');
  });

  it('associates the label with the control and marks required', () => {
    render(
      <FieldRow label="Account Name" htmlFor="name" required>
        <Input id="name" />
      </FieldRow>,
      { wrapper: ce },
    );
    // getByLabelText proves the <label htmlFor> → control association, not just co-presence.
    expect(screen.getByLabelText(/Account Name/)).toBe(document.getElementById('name'));
    expect(document.querySelector('[data-surface-part="required"]')?.textContent).toBe('*');
  });

  it('labelPosition "above" is a single column', () => {
    const { container } = render(
      <FieldRow label="Primary Contact" labelPosition="above">
        <Input />
      </FieldRow>,
      { wrapper: ce },
    );
    const grid = part(container, 'field-row')!.firstElementChild as HTMLElement;
    expect(grid.style.getPropertyValue('--sk-label-col')).toBe('');
  });

  it('a label-less row (timeline, subgrid) renders the control full width with no label', () => {
    const { container } = render(
      <FieldRow>
        <div>timeline</div>
      </FieldRow>,
      { wrapper: ce },
    );
    expect(part(container, 'label')).toBeNull();
    expect(screen.getByText('timeline')).toBeTruthy();
    const grid = part(container, 'field-row')!.firstElementChild as HTMLElement;
    expect(grid.style.getPropertyValue('--sk-label-col')).toBe('');
  });
});

describe('v9 FieldRow — default look', () => {
  it('outside a ce FormSurface it keeps the kit default: 130px label column, beside', () => {
    const { container } = render(
      <FieldRow label="Name">
        <Input />
      </FieldRow>,
      { wrapper: plain },
    );
    const row = part(container, 'field-row')!;
    expect(row.dataset.look).toBe('default');
    expect(row.style.gridTemplateColumns).toBe('130px 1fr');
  });

  it('an explicit look prop overrides the ambient look', () => {
    const { container } = render(
      <FieldRow label="Name" look="default">
        <Input />
      </FieldRow>,
      { wrapper: ce },
    );
    expect(part(container, 'field-row')!.dataset.look).toBe('default');
  });
});

describe('v9 FieldRow — structure the review found fragile', () => {
  it('spans every column of a grid parent (the v9 Section body is a 12-column grid)', () => {
    const { container } = render(
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)' }}>
        <FieldRow label="A"><Input /></FieldRow>
        <FieldRow label="B" look="default"><Input /></FieldRow>
      </div>,
      { wrapper: ce },
    );
    const rows = Array.from(container.querySelectorAll('[data-surface-part="field-row"]')) as HTMLElement[];
    expect(rows).toHaveLength(2);
    for (const row of rows) expect(getComputedStyle(row).gridColumn.replace(/\s+/g, '')).toBe('1/-1');
  });

  it('only an auto row is a size container (containment zeroes intrinsic width)', () => {
    const { container } = render(
      <>
        <FieldRow label="Auto"><Input /></FieldRow>
        <FieldRow label="Beside" labelPosition="beside"><Input /></FieldRow>
        <FieldRow label="Above" labelPosition="above"><Input /></FieldRow>
      </>,
      { wrapper: ce },
    );
    const rows = Array.from(container.querySelectorAll('[data-surface-part="field-row"]')) as HTMLElement[];
    // jsdom's CSS parser drops `container-type`, so the marker attribute stands in here; the real
    // containment (and that beside/above rows keep their intrinsic width) is checked in a browser.
    expect(rows.map((r) => r.dataset.container ?? '')).toEqual(['inline-size', '', '']);
  });

  it('pads every row the same (12px): the first-row 8px is the section body\'s job, not :first-child', () => {
    const { container } = render(
      <>
        <FieldRow label="First"><Input /></FieldRow>
        <FieldRow label="Second"><Input /></FieldRow>
      </>,
      { wrapper: ce },
    );
    const rows = Array.from(container.querySelectorAll('[data-surface-part="field-row"]')) as HTMLElement[];
    expect(rows.map((r) => getComputedStyle(r).paddingTop)).toEqual(['12px', '12px']);
    expect(ceFieldRowFirstOffset).toBe(4);
  });
});

describe('v9 TabColumns', () => {
  it('ce: each column is flex <share> 1 0 with the measured 340px floor and 16px gaps', () => {
    const { container } = render(
      <TabColumns widths={[33, 42, 25]}>
        <div>a</div>
        <div>b</div>
        <div>c</div>
      </TabColumns>,
      { wrapper: ce },
    );
    const row = part(container, 'tab-columns')!;
    expect(row.style.gap).toBe('16px');
    const cols = Array.from(row.querySelectorAll('[data-surface-part="tab-column"]')) as HTMLElement[];
    expect(cols).toHaveLength(3); // non-vacuous: one wrapper per child
    expect(cols.map((c) => c.style.flex)).toEqual(['33 1 0px', '42 1 0px', '25 1 0px']);
    expect(cols.every((c) => c.style.minWidth === 'min(340px, 100%)')).toBe(true);
    expect(cols.every((c) => c.style.gap === '16px')).toBe(true);
  });

  it('default look: 300px floor, 20px gap, equal shares when widths is omitted', () => {
    const { container } = render(
      <TabColumns>
        <div>a</div>
        <div>b</div>
      </TabColumns>,
      { wrapper: plain },
    );
    const cols = Array.from(container.querySelectorAll('[data-surface-part="tab-column"]')) as HTMLElement[];
    expect(cols).toHaveLength(2);
    expect(cols.map((c) => c.style.flex)).toEqual(['50 1 0px', '50 1 0px']);
    expect(cols[0].style.minWidth).toBe('min(300px, 100%)');
    expect(part(container, 'tab-columns')!.style.gap).toBe('20px');
  });
});

describe('v9 TabColumns — positional shares', () => {
  it('a hidden (conditional) column does not hand its share to its neighbour', () => {
    const show = false;
    const { container } = render(
      <TabColumns widths={[33, 42, 25]}>
        {show && <div>a</div>}
        <div>b</div>
        <div>c</div>
      </TabColumns>,
      { wrapper: ce },
    );
    const cols = Array.from(container.querySelectorAll('[data-surface-part="tab-column"]')) as HTMLElement[];
    expect(cols).toHaveLength(2);
    expect(cols.map((c) => c.dataset.columnIndex)).toEqual(['1', '2']);
    // b keeps 42 and c keeps 25 (renormalised to 100 over the visible columns: 42:25).
    const [fb, fc] = cols.map((c) => parseFloat(c.style.flex));
    expect(fb / fc).toBeCloseTo(42 / 25, 5);
  });
});
