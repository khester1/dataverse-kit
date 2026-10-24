// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { CellRendererType, ColumnDef, GridCellProps } from '../../types';

// Explicit cleanup between tests (no global `globals: true` under the per-file env).
afterEach(cleanup);
import {
  TextCell,
  NumberCell,
  CurrencyCell,
  LinkCell,
  LookupCell,
  OptionSetCell,
  ColoredCell,
  ToggleCell,
  IconCell,
  ProgressBarCell,
  RatingCell,
  CompositeCell,
} from '../cells/cells';
import { wrapper } from './testUtils';

/** Build a GridCellProps for one (renderer, value) — mirrors what the adapter's
 *  buildCellProps produces (formattedValue defaults to the raw value's string). */
function cp<T extends Record<string, unknown>>(
  rendererType: CellRendererType,
  value: unknown,
  opts: { formattedValue?: string; rendererConfig?: Record<string, unknown>; column?: Partial<ColumnDef<T>>; item?: T } = {},
): GridCellProps<T> {
  const column: ColumnDef<T> = {
    key: 'c',
    fieldName: 'f',
    name: 'Field',
    rendererType,
    rendererConfig: opts.rendererConfig,
    ...opts.column,
  };
  return {
    value,
    formattedValue: opts.formattedValue ?? (value == null ? '' : String(value)),
    item: (opts.item ?? ({} as T)),
    itemKey: 'row-1',
    column,
  };
}

describe('v9 read cells', () => {
  it('TextCell renders the formatted value', () => {
    render(<TextCell {...cp('text', 'raw', { formattedValue: 'Hello World' })} />, { wrapper });
    expect(screen.getByText('Hello World')).toBeTruthy();
  });

  it('TextCell renders "-" for empty', () => {
    render(<TextCell {...cp('text', null, { formattedValue: '' })} />, { wrapper });
    expect(screen.getByText('-')).toBeTruthy();
  });

  it('NumberCell renders the formatted number', () => {
    render(<NumberCell {...cp('number', 1234, { formattedValue: '1,234' })} />, { wrapper });
    expect(screen.getByText('1,234')).toBeTruthy();
  });

  it('CurrencyCell renders the formatted currency', () => {
    render(<CurrencyCell {...cp('currency', 1000, { formattedValue: '$1,000.00' })} />, { wrapper });
    expect(screen.getByText('$1,000.00')).toBeTruthy();
  });

  it('LinkCell renders a clickable link that calls onLinkClick', () => {
    const onLinkClick = vi.fn();
    render(<LinkCell {...cp('link', 'Contoso', { formattedValue: 'Contoso', column: { onLinkClick } })} />, { wrapper });
    fireEvent.click(screen.getByText('Contoso'));
    expect(onLinkClick).toHaveBeenCalledTimes(1);
  });

  it('LinkCell renders plain text when there is no click handler', () => {
    render(<LinkCell {...cp('link', 'Plain', { formattedValue: 'Plain' })} />, { wrapper });
    expect(screen.getByText('Plain')).toBeTruthy();
  });

  it('LookupCell renders the related record label', () => {
    render(<LookupCell {...cp('lookup', 'guid', { formattedValue: 'Acme Ltd', column: {} })} />, { wrapper });
    expect(screen.getByText('Acme Ltd')).toBeTruthy();
  });

  it('OptionSetCell renders a colored badge from the option label', () => {
    render(
      <OptionSetCell
        {...cp('optionset', 1, { rendererConfig: { options: [{ value: 1, label: 'Active', color: '#107c10' }] } })}
      />,
      { wrapper },
    );
    expect(screen.getByText('Active')).toBeTruthy();
  });

  it('OptionSetCell renders one badge per value for a multi-select array', () => {
    render(
      <OptionSetCell
        {...cp('optionset', [1, 2], {
          rendererConfig: {
            options: [
              { value: 1, label: 'A' },
              { value: 2, label: 'B' },
            ],
          },
        })}
      />,
      { wrapper },
    );
    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.getByText('B')).toBeTruthy();
  });

  it('ColoredCell renders the value on a colored background', () => {
    render(
      <ColoredCell {...cp('coloredCell', 'High', { formattedValue: 'High', rendererConfig: { colorMap: { High: '#d13438' } } })} />,
      { wrapper },
    );
    expect(screen.getByText('High')).toBeTruthy();
  });

  it('ToggleCell renders a checked read-only switch for a true value', () => {
    render(<ToggleCell {...cp('boolean', true)} />, { wrapper });
    const sw = screen.getByRole('switch') as HTMLInputElement;
    expect(sw.checked).toBe(true);
    expect(sw.disabled).toBe(true);
  });

  it('IconCell renders an icon button that calls onIconClick', () => {
    const onIconClick = vi.fn();
    render(<IconCell {...cp('icon', undefined, { rendererConfig: { iconName: 'Edit', iconTitle: 'Edit row', onIconClick } })} />, {
      wrapper,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Edit row' }));
    expect(onIconClick).toHaveBeenCalledTimes(1);
  });

  it('ProgressBarCell renders a bar + percentage label', () => {
    render(<ProgressBarCell {...cp('progress', 50, { rendererConfig: { max: 100 } })} />, { wrapper });
    expect(screen.getByText('50%')).toBeTruthy();
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('50');
  });

  it('RatingCell (stars) announces the value out of max', () => {
    render(<RatingCell {...cp('rating', 3, { rendererConfig: { max: 5 } })} />, { wrapper });
    expect(screen.getByRole('img', { name: '3 out of 5' })).toBeTruthy();
  });

  it('RatingCell (emoji) renders the selected sentiment face', () => {
    render(<RatingCell {...cp('rating', 3, { rendererConfig: { style: 'emoji', faceCount: 3 } })} />, { wrapper });
    expect(screen.getByRole('img', { name: /Happy \(3 out of 3\)/ })).toBeTruthy();
  });

  it('CompositeCell renders its text slot', () => {
    render(<CompositeCell {...cp('composite', undefined, { rendererConfig: { slots: [{ id: 's1', type: 'text', staticValue: 'Slot!' }] } })} />, {
      wrapper,
    });
    expect(screen.getByText('Slot!')).toBeTruthy();
  });
});
