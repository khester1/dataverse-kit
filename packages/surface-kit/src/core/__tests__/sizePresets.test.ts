import { describe, it, expect } from 'vitest';
import {
  dialogWidthPx,
  dialogWidthCss,
  dialogHeightCss,
  panelKindFromWidth,
  panelCustomWidthPx,
  calloutWidthPx,
  calloutFormDefaults,
  DIALOG_SIZE_PX,
} from '../sizePresets';

describe('dialogWidthPx', () => {
  it('defaults to lg = 1200 (the codegen default)', () => {
    expect(dialogWidthPx()).toBe(1200);
    expect(dialogWidthPx({})).toBe(1200);
  });
  it('resolves presets', () => {
    expect(dialogWidthPx({ size: 'sm' })).toBe(600);
    expect(dialogWidthPx({ size: 'md' })).toBe(900);
    expect(dialogWidthPx({ size: 'lg' })).toBe(1200);
    expect(dialogWidthPx({ size: 'xl' })).toBe(1600);
  });
  it('explicit width wins over preset', () => {
    expect(dialogWidthPx({ width: 720, size: 'lg' })).toBe(720);
  });
  it('fullscreen falls back to the largest preset for the px hint', () => {
    expect(dialogWidthPx({ size: 'fullscreen' })).toBe(DIALOG_SIZE_PX.xl);
  });
});

describe('dialogWidthCss', () => {
  it('returns 95vw for fullscreen with no explicit width', () => {
    expect(dialogWidthCss({ size: 'fullscreen' })).toBe('95vw');
  });
  it('lets an explicit width win even for fullscreen', () => {
    expect(dialogWidthCss({ width: 800, size: 'fullscreen' })).toBe('800px');
  });
  it('emits px for presets and the default', () => {
    expect(dialogWidthCss({ size: 'md' })).toBe('900px');
    expect(dialogWidthCss()).toBe('1200px');
  });
});

describe('dialogHeightCss', () => {
  it('treats <=100 as vh', () => {
    expect(dialogHeightCss(50)).toBe('50vh');
    expect(dialogHeightCss(100)).toBe('100vh');
  });
  it('caps anything else at 95vh', () => {
    expect(dialogHeightCss(120)).toBe('95vh');
    expect(dialogHeightCss(undefined)).toBe('95vh');
  });
});

describe('panel', () => {
  it('kind is custom at/below 500, medium above', () => {
    expect(panelKindFromWidth(undefined)).toBe('custom'); // 480 default
    expect(panelKindFromWidth(480)).toBe('custom');
    expect(panelKindFromWidth(500)).toBe('custom');
    expect(panelKindFromWidth(501)).toBe('medium');
    expect(panelKindFromWidth(900)).toBe('medium');
  });
  it('custom width falls back to 480', () => {
    expect(panelCustomWidthPx(undefined)).toBe(480);
    expect(panelCustomWidthPx(360)).toBe(360);
  });
});

describe('callout', () => {
  it('defaults to width 320 + bottomLeftEdge', () => {
    expect(calloutWidthPx(undefined)).toBe(320);
    expect(calloutFormDefaults.width).toBe(320);
    expect(calloutFormDefaults.directionalHint).toBe('bottomLeftEdge');
  });
});
