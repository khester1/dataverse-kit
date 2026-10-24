import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { FluentProvider } from '@fluentui/react-components';
import { FormSurface } from '../containers/FormSurface';
import { dynamicsCeTheme } from '../theme';

const wrap = (ui: React.ReactElement) => render(<FluentProvider theme={dynamicsCeTheme}>{ui}</FluentProvider>);

describe('v9 FormSurface — look="ce" is a plain block', () => {
  it('renders no grid, no default padding, and min-width 0, so page chrome fills the width', () => {
    const { container } = wrap(<FormSurface look="ce"><div>child</div></FormSurface>);
    const root = container.querySelector('[data-surface-part="form-surface"]') as HTMLElement;
    expect(root.dataset.look).toBe('ce');
    expect(root.style.display).toBe('flow-root');
    expect(root.style.gridTemplateColumns).toBe('');
    // React writes a numeric 0 unitless ('0'); compare the value, not the spelling.
    expect(parseFloat(root.style.padding)).toBe(0);
    expect(parseFloat(root.style.minWidth)).toBe(0);
  });

  it('ignores columns/gap under ce but honours an explicit padding', () => {
    const { container } = wrap(<FormSurface look="ce" columns={12} gap={20} padding={12}><div /></FormSurface>);
    const root = container.querySelector('[data-surface-part="form-surface"]') as HTMLElement;
    expect(root.style.gridTemplateColumns).toBe('');
    expect(root.style.gap).toBe('');
    expect(root.style.padding).toBe('12px');
  });

  it('the default look is unchanged: the 12-column grid with 20px gap + padding', () => {
    const { container } = wrap(<FormSurface><div /></FormSurface>);
    const root = container.firstElementChild!.firstElementChild as HTMLElement;
    expect(root.style.gridTemplateColumns).toBe('repeat(12, 1fr)');
    expect(root.style.gap).toBe('20px');
    expect(root.style.padding).toBe('20px');
  });
});
