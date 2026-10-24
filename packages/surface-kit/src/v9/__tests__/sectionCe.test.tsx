import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { FluentProvider, Input } from '@fluentui/react-components';
import { Section } from '../containers/Section';
import { SectionHeader } from '../containers/SectionHeader';
import { FormSurface } from '../containers/FormSurface';
import { FieldRow } from '../layouts/FieldRow';
import { dynamicsCeTheme, dynamicsV9Theme } from '../theme';

// ★ jsdom does no layout: these pin structure + the inline values handed to the browser. The
//   rendered geometry is proved against the org capture in a real browser (ce-parity stories).

const ce = ({ children }: { children: React.ReactNode }) => (
  <FluentProvider theme={dynamicsCeTheme}>
    <FormSurface look="ce">{children}</FormSurface>
  </FluentProvider>
);
const plain = ({ children }: { children: React.ReactNode }) => (
  <FluentProvider theme={dynamicsV9Theme}>{children}</FluentProvider>
);
const q = (root: HTMLElement, part: string) => root.querySelector(`[data-surface-part="${part}"]`) as HTMLElement | null;

describe('v9 Section — look="ce"', () => {
  it('draws the measured card: padding 4/16/16/16, 1px transparent border, no 300px min width', () => {
    const { container } = render(<Section title="ACCOUNT INFORMATION">x</Section>, { wrapper: ce });
    const sec = q(container, 'section')!;
    expect(sec.tagName).toBe('SECTION');
    expect(sec.dataset.look).toBe('ce');
    expect(sec.style.padding).toBe('4px 16px 16px 16px');
    expect(sec.style.border).toBe('1px solid transparent');
    expect(sec.style.minWidth).toBe('');
  });

  it('renders the title as given in an h2 — never uppercased, no rule under it', () => {
    const { container } = render(<Section title="Description">x</Section>, { wrapper: ce });
    const title = q(container, 'section-title')!;
    expect(title.tagName).toBe('H2');
    expect(title.textContent).toBe('Description');
    expect(getComputedStyle(title).textTransform).not.toBe('uppercase');
    const header = q(container, 'section-header')!;
    expect(header.style.borderBottom).toBe('');
    expect(header.style.paddingTop).toBe('4px');
  });

  it('single column: the body pulls rows up 4px so the first FieldRow sits at 8px', () => {
    const { container } = render(
      <Section title="S">
        <FieldRow label="A"><Input /></FieldRow>
        <FieldRow label="B"><Input /></FieldRow>
      </Section>,
      { wrapper: ce },
    );
    const body = q(container, 'section-body')!;
    expect(body.style.marginTop).toBe('-4px');
    expect(body.style.display).toBe('');
    expect(body.querySelectorAll('[data-surface-part="field-row"]')).toHaveLength(2);
  });

  it('internalColumns=2: one child per column, equal columns, 21px gutter on all but the last', () => {
    const { container } = render(
      <Section title="Local Identity" internalColumns={2}>
        <div>left rows</div>
        <div>right rows</div>
      </Section>,
      { wrapper: ce },
    );
    const body = q(container, 'section-body')!;
    expect(body.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');
    const cols = Array.from(body.querySelectorAll('[data-surface-part="section-column"]')) as HTMLElement[];
    expect(cols).toHaveLength(2);
    expect(cols.map((c) => c.style.paddingRight)).toEqual(['21px', '0px']);
    expect(cols.every((c) => c.style.marginTop === '-4px')).toBe(true);
  });

  it('gutters are keyed to the COLUMN, not list position, when children outnumber columns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(
      <Section title="S" internalColumns={2}>
        <div>r0c0</div>
        <div>r0c1</div>
        <div>r1c0</div>
        <div>r1c1</div>
      </Section>,
      { wrapper: ce },
    );
    const cols = Array.from(container.querySelectorAll('[data-surface-part="section-column"]')) as HTMLElement[];
    expect(cols).toHaveLength(4);
    // Column 0 cells carry the gutter; column 1 cells never do.
    expect(cols.map((c) => c.style.paddingRight)).toEqual(['21px', '0px', '21px', '0px']);
    // Only the first grid row is pulled up.
    expect(cols.map((c) => c.style.marginTop)).toEqual(['-4px', '-4px', '0px', '0px']);
    warn.mockRestore();
  });

  it('warns (dev) when a multi-column ce section is not given one child per column', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <Section title="S" internalColumns={2}>
        <FieldRow label="A"><Input /></FieldRow>
        <FieldRow label="B"><Input /></FieldRow>
        <FieldRow label="C"><Input /></FieldRow>
      </Section>,
      { wrapper: ce },
    );
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toMatch(/ONE CHILD PER COLUMN/);
    warn.mockClear();
    render(
      <Section title="S" internalColumns={2}>
        <div>left</div>
        <div>right</div>
      </Section>,
      { wrapper: ce },
    );
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('flat and placeholder variants keep their existing chrome under ce', () => {
    const flat = render(<Section title="F" variant="flat">x</Section>, { wrapper: ce });
    expect(q(flat.container, 'section')).toBeNull();
    const flatCard = flat.container.querySelector('[style*="min-width: 300px"]') as HTMLElement;
    expect(flatCard.style.padding).toBe('3px 20px 20px 20px');
    expect(flatCard.style.boxShadow).toBe('');
    const ph = render(<Section variant="placeholder">x</Section>, { wrapper: ce });
    expect(q(ph.container, 'section')).toBeNull();
    // jsdom drops a `border` shorthand that holds a CSS var, so find the spacer by its min-height.
    const spacer = ph.container.querySelector('[style*="min-height: 80px"]') as HTMLElement;
    expect(spacer).toBeTruthy();
    expect(spacer.textContent).toBe('');
  });

  it('a standalone SectionHeader follows the ambient ce look', () => {
    const { container } = render(<SectionHeader title="Standalone" />, { wrapper: ce });
    expect(q(container, 'section-title')!.tagName).toBe('H2');
  });
});

describe('v9 Section — default look unchanged', () => {
  it('keeps the existing card padding, 300px min width and 12-column body', () => {
    const { container } = render(<Section title="General">x</Section>, { wrapper: plain });
    // container > FluentProvider's div > the section card.
    const card = container.firstElementChild!.firstElementChild as HTMLElement;
    expect(card.dataset.look).toBeUndefined();
    expect(card.style.padding).toBe('3px 20px 20px 20px');
    expect(card.style.minWidth).toBe('300px');
    const body = card.lastElementChild as HTMLElement;
    expect(body.style.gridTemplateColumns).toBe('repeat(12, 1fr)');
  });
});
