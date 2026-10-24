import { describe, it, expect } from 'vitest';
import { gridTemplateForColumns, clampSpan } from '../columns';

describe('gridTemplateForColumns', () => {
  it('emits repeat(N, 1fr)', () => {
    expect(gridTemplateForColumns(1)).toBe('repeat(1, 1fr)');
    expect(gridTemplateForColumns(3)).toBe('repeat(3, 1fr)');
  });
});

describe('clampSpan', () => {
  it('clamps to [1, columns]', () => {
    expect(clampSpan(0, 4)).toBe(1);
    expect(clampSpan(2, 4)).toBe(2);
    expect(clampSpan(9, 4)).toBe(4);
  });
  it('rounds and guards non-finite', () => {
    expect(clampSpan(2.6, 4)).toBe(3);
    expect(clampSpan(Number.NaN, 4)).toBe(1);
  });
});
