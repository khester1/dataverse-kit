import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { fillStackStyles, FillRegion } from '../hosts/fill';

describe('fillStackStyles (v1b fill/height)', () => {
  it('returns undefined when not filling (default-off, non-breaking)', () => {
    expect(fillStackStyles(false)).toBeUndefined();
    expect(fillStackStyles(undefined)).toBeUndefined();
    expect(fillStackStyles(undefined, 500)).toBeUndefined();
  });

  it('fills as a flex column at 100% by default', () => {
    expect(fillStackStyles(true)).toEqual({
      root: { height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 },
    });
  });

  it('honors an explicit numeric or CSS height', () => {
    expect(fillStackStyles(true, 460)).toEqual({
      root: { height: 460, display: 'flex', flexDirection: 'column', minHeight: 0 },
    });
    expect(fillStackStyles(true, '80vh')).toMatchObject({ root: { height: '80vh' } });
  });
});

describe('FillRegion (non-breaking guarantee)', () => {
  const child = React.createElement('span', null, 'x');

  it('adds NO wrapper element when fill is off (off = a true no-op)', () => {
    expect(renderToStaticMarkup(React.createElement(FillRegion, { fill: false }, child))).toBe('<span>x</span>');
    expect(renderToStaticMarkup(React.createElement(FillRegion, { fill: undefined }, child))).toBe('<span>x</span>');
  });

  it('wraps children in a scrollable div when fill is on', () => {
    const html = renderToStaticMarkup(React.createElement(FillRegion, { fill: true }, child));
    expect(html).toContain('<div');
    expect(html).toContain('overflow:auto');
    expect(html).toContain('<span>x</span>');
  });
});
