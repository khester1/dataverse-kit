import { describe, it, expect } from 'vitest';
import { fieldGridStyle, sectionStackingStyle, fieldRowStyle } from '../builders';

describe('fieldGridStyle', () => {
  it('caps at 2 cols @768 and stacks to 1 @480 (media mode)', () => {
    const s = fieldGridStyle(3, 'media') as Record<string, unknown>;
    expect(s.gridTemplateColumns).toBe('repeat(3, 1fr)');
    expect(s.gap).toBe('4px 24px');
    const selectors = s.selectors as Record<string, unknown>;
    expect(selectors['@media (max-width: 768px)']).toEqual({ gridTemplateColumns: 'repeat(2, 1fr)' });
    expect(selectors['@media (max-width: 480px)']).toEqual({ gridTemplateColumns: '1fr' });
  });
  it('emits @container rules in container mode', () => {
    const s = fieldGridStyle(2, 'container') as Record<string, unknown>;
    const selectors = s.selectors as Record<string, unknown>;
    expect(Object.keys(selectors)).toContain('@container (max-width: 768px)');
    expect(Object.keys(selectors)).toContain('@container (max-width: 480px)');
  });
});

describe('sectionStackingStyle', () => {
  it('collapses to a single column @768', () => {
    const s = sectionStackingStyle('1fr 1fr', 'media') as Record<string, unknown>;
    expect(s.gridTemplateColumns).toBe('1fr 1fr');
    expect(s.alignItems).toBe('start');
    const selectors = s.selectors as Record<string, unknown>;
    expect(selectors['@media (max-width: 768px)']).toEqual({ gridTemplateColumns: '1fr' });
  });
});

describe('fieldRowStyle', () => {
  it('uses a 130px label column by default and stacks @480', () => {
    const s = fieldRowStyle(undefined, 'media') as Record<string, unknown>;
    expect(s.gridTemplateColumns).toBe('130px 1fr');
    expect(s.minHeight).toBe(38);
    const selectors = s.selectors as Record<string, unknown>;
    expect((selectors['@media (max-width: 480px)'] as Record<string, unknown>).gridTemplateColumns).toBe('1fr');
  });
});
