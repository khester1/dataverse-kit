import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Avatar, FluentProvider, tabClassNames } from '@fluentui/react-components';
import { FormHeader } from '../containers/FormHeader';
import { PivotSurface, FLUENT_TAB_RESERVED_SPACE_CLASS } from '../containers/PivotSurface';
import { FormSurface } from '../containers/FormSurface';
import { dynamicsCeTheme, dynamicsV9Theme } from '../theme';

// ★ jsdom does no layout. The record header's geometry was matched to the org capture in a real
//   browser (every region of the header card within 0.1px, ce-parity "Forms/Account (main)");
//   these pin structure and behaviour.

const ce = ({ children }: { children: React.ReactNode }) => (
  <FluentProvider theme={dynamicsCeTheme}>
    <FormSurface look="ce">{children}</FormSurface>
  </FluentProvider>
);
const plain = ({ children }: { children: React.ReactNode }) => (
  <FluentProvider theme={dynamicsV9Theme}>{children}</FluentProvider>
);
const parts = (root: ParentNode, name: string) =>
  Array.from(root.querySelectorAll(`[data-surface-part="${name}"]`)) as HTMLElement[];

const FORMS = [
  { id: 'account', label: 'Account' },
  { id: 'showcase', label: 'Dataverse Kit Showcase' },
];

describe('v9 FormHeader — look="ce"', () => {
  it('renders the title as the page heading, "- {status}", and entity · active form', () => {
    render(<FormHeader title="Adatum Division" status="Saved" entityName="Account" forms={FORMS} activeFormId="account" />, { wrapper: ce });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Adatum Division');
    expect(document.querySelector('[data-surface-part="header-status"]')!.textContent).toBe('- Saved');
    expect(screen.getByText('Account', { selector: 'span' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Form: Account' })).toBeTruthy();
  });

  it('the form switcher lists the forms, checks the active one, and reports a change', async () => {
    const onFormChange = vi.fn();
    render(<FormHeader title="T" entityName="Account" forms={FORMS} activeFormId="account" onFormChange={onFormChange} />, { wrapper: ce });
    fireEvent.click(screen.getByRole('button', { name: 'Form: Account' }));
    const items = await screen.findAllByRole('menuitemradio');
    expect(items.map((i) => i.textContent)).toEqual(['Account', 'Dataverse Kit Showcase']);
    expect(items.map((i) => i.getAttribute('aria-checked'))).toEqual(['true', 'false']);
    fireEvent.click(items[1]);
    await waitFor(() => expect(onFormChange).toHaveBeenCalledWith('showcase'));
  });

  it('with a single form the form name is plain text, not a switcher', () => {
    render(<FormHeader title="T" entityName="Account" forms={[FORMS[0]]} />, { wrapper: ce });
    expect(screen.queryByRole('button', { name: /Form:/ })).toBeNull();
  });

  it('header fields show --- when empty, with a divider between each and before the owner', () => {
    const { container } = render(
      <FormHeader
        title="T"
        headerFields={[{ label: 'Annual Revenue', value: null }, { label: 'Employees', value: 42 }]}
        owner={{ name: 'System Administrator' }}
      />,
      { wrapper: ce },
    );
    expect(parts(container, 'header-field-value').map((v) => v.textContent)).toEqual(['---', '42', 'System Administrator']);
    expect(parts(container, 'header-field-label').map((v) => v.textContent)).toEqual(['Annual Revenue', 'Employees', 'Owner']);
    expect(parts(container, 'header-divider')).toHaveLength(2);
  });

  it('defaults the record avatar to Fluent colorful from the title (Dynamics\' colour for the same name)', () => {
    const { container } = render(<FormHeader title="Adatum Division (Showcase)" />, { wrapper: ce });
    const avatar = container.querySelector('[data-surface-part="header-avatar"] .fui-Avatar')!;
    expect(avatar.textContent).toBe('AD');
    // Fluent's name hash → cranberry, the measured #eeacb2/#6e0811. Oracle: an explicitly
    // cranberry Avatar of the same size must carry exactly the same classes (and a different
    // palette colour must not), so this fails if the default stops being the hashed colour.
    const probe = render(
      <>
        <Avatar name="Adatum Division (Showcase)" color="cranberry" size={40} data-probe="cranberry" />
        <Avatar name="Adatum Division (Showcase)" color="grape" size={40} data-probe="grape" />
      </>,
      { wrapper: plain },
    );
    // Fluent puts the colour on the INITIALS slot, not the root (the roots of a cranberry and a
    // grape avatar have identical classes — which is why the grape control is here).
    const initials = (root: Element) => root.querySelector('.fui-Avatar__initials')!.className;
    const cranberry = probe.container.querySelector('[data-probe="cranberry"]')!;
    const grape = probe.container.querySelector('[data-probe="grape"]')!;
    expect(initials(cranberry)).not.toBe(initials(grape));
    expect(initials(avatar)).toBe(initials(cranberry));
  });

  it('shows the expand chevron only with onExpand, and reports clicks', () => {
    const onExpand = vi.fn();
    const { rerender } = render(<FormHeader title="T" />, { wrapper: ce });
    expect(screen.queryByRole('button', { name: /header/ })).toBeNull();
    rerender(<FormHeader title="T" onExpand={onExpand} />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand header' }));
    expect(onExpand).toHaveBeenCalledTimes(1);
  });

  it('default look is unchanged (no ce parts)', () => {
    const { container } = render(<FormHeader title="T" status="Saved" headerFields={[{ label: 'X' }]} />, { wrapper: plain });
    expect(container.querySelector('[data-look="ce"]')).toBeNull();
    expect(screen.getByText('Saved').textContent).toBe('Saved');
  });
});

describe('v9 PivotSurface — look="ce"', () => {
  const tabs = [
    { id: 'a', label: 'Summary', content: <div>summary body</div> },
    { id: 'b', label: 'Details', content: <div>details body</div> },
  ];

  it('puts header + tab strip in one card and the tab content BELOW it', () => {
    const { container } = render(<PivotSurface look="ce" tabs={tabs} header={<div>record header</div>} />, { wrapper: ce });
    const card = parts(container, 'header-card')[0];
    expect(card.textContent).toContain('record header');
    expect(card.querySelector('[role="tablist"]')).toBeTruthy();
    const body = parts(container, 'tab-body')[0];
    expect(card.contains(body)).toBe(false);
    expect(body.textContent).toBe('summary body');
    expect(body.style.paddingTop).toBe('16px');
    expect(body.style.paddingBottom).toBe('21px');
  });

  it('switching tabs swaps the body', () => {
    const { container } = render(<PivotSurface look="ce" tabs={tabs} />, { wrapper: ce });
    fireEvent.click(screen.getByRole('tab', { name: 'Details' }));
    expect(parts(container, 'tab-body')[0].textContent).toBe('details body');
  });

  it('applies the page insets (8 left / 20 right) to card and body alike', () => {
    const { container } = render(<PivotSurface look="ce" tabs={tabs} />, { wrapper: ce });
    expect(parts(container, 'pivot')[0].style.padding).toBe('0px 20px 0px 8px');
  });

  it('default look: no header card, but a passed `header` still renders (never silently dropped)', () => {
    const { container } = render(<PivotSurface tabs={tabs} header={<div>h</div>} />, { wrapper: plain });
    expect(parts(container, 'header-card')).toHaveLength(0);
    expect(screen.getByText('h')).toBeTruthy();
    expect(screen.getByText('summary body')).toBeTruthy();
  });

  it('is OPT-IN: a pivot inside a ce FormSurface stays plain unless look="ce" is passed', () => {
    const { container } = render(<PivotSurface tabs={tabs} header={<div>h</div>} />, { wrapper: ce });
    expect(parts(container, 'header-card')).toHaveLength(0);
    expect(parts(container, 'pivot')).toHaveLength(0);
  });

  it.each(['ce', 'default'] as const)('wires tabs to the panel (%s look)', (look) => {
    const { container } = render(<PivotSurface look={look} tabs={tabs} />, { wrapper: ce });
    const panel = container.querySelector('[role="tabpanel"]')!;
    const selected = screen.getByRole('tab', { name: 'Summary' });
    expect(panel.getAttribute('aria-labelledby')).toBe(selected.id);
    expect(selected.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.textContent).toBe('summary body');
  });

  it("Fluent still renders the reserved-width copy this look styles (a Fluent bump that drops it must fail here)", () => {
    const { container } = render(<PivotSurface look="ce" tabs={tabs} />, { wrapper: ce });
    expect(container.querySelector(`.${FLUENT_TAB_RESERVED_SPACE_CLASS}`)).not.toBeNull();
    expect(container.querySelector(`.${tabClassNames.content}`)).not.toBeNull();
  });
});

describe('v9 FormHeader — review fixes', () => {
  it('owner name is a focusable button with Fluent\'s focus outline class (not `all: unset`)', () => {
    const onClick = vi.fn();
    const { container } = render(<FormHeader title="T" owner={{ name: 'Sam', onClick }} />, { wrapper: ce });
    const link = container.querySelector('[data-surface-part="header-owner-link"]') as HTMLButtonElement;
    expect(link.tagName).toBe('BUTTON');
    expect(link.getAttribute('style')).toBeNull();
    expect(link.className).not.toBe('');
    link.focus();
    expect(document.activeElement).toBe(link);
    fireEvent.click(link);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows presence only when supplied', () => {
    const none = render(<FormHeader title="T" owner={{ name: 'Sam' }} />, { wrapper: ce });
    expect(none.container.querySelector('[data-surface-part="header-owner"] .fui-PresenceBadge')).toBeNull();
    const busy = render(<FormHeader title="T" owner={{ name: 'Sam', presence: 'busy' }} />, { wrapper: ce });
    expect(busy.container.querySelector('[data-surface-part="header-owner"] .fui-PresenceBadge')).not.toBeNull();
  });

  it('titleAs lets a header inside a dialog/app shell avoid a second h1', () => {
    render(<FormHeader title="Nested" titleAs="h2" />, { wrapper: ce });
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Nested');
  });

  it('the record avatar is decorative (the heading already names the record)', () => {
    const { container } = render(<FormHeader title="Adatum" />, { wrapper: ce });
    expect(container.querySelector('[data-surface-part="header-avatar"] .fui-Avatar')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('expanded=true offers "Collapse header" with aria-expanded', () => {
    render(<FormHeader title="T" onExpand={() => {}} expanded />, { wrapper: ce });
    expect(screen.getByRole('button', { name: 'Collapse header' }).getAttribute('aria-expanded')).toBe('true');
  });
});
