import { describe, it, expect } from 'vitest';
import { fromFormDefinition } from '../fromFormDefinition';

describe('fromFormDefinition', () => {
  it('resolves a dialog with default sizing', () => {
    expect(fromFormDefinition({ type: 'dialog', name: 'Edit' })).toEqual({
      kind: 'dialog',
      widthPx: 1200,
      heightCss: '95vh',
      title: 'Edit',
    });
  });

  it('honors explicit dialog width/height', () => {
    expect(fromFormDefinition({ type: 'dialog', settings: { width: 720, height: 80 } })).toMatchObject({
      kind: 'dialog',
      widthPx: 720,
      heightCss: '80vh',
    });
  });

  it('resolves a wide panel as medium, a narrow one as custom + customWidth', () => {
    expect(fromFormDefinition({ type: 'panel', settings: { width: 640 } })).toMatchObject({
      kind: 'panel',
      panelType: 'medium',
      customWidthPx: undefined,
    });
    expect(fromFormDefinition({ type: 'panel', settings: { width: 360 } })).toMatchObject({
      kind: 'panel',
      panelType: 'custom',
      customWidthPx: 360,
    });
  });

  it('passes through an explicit panelType', () => {
    expect(fromFormDefinition({ type: 'panel', settings: { panelType: 'largeFixed' } })).toMatchObject({
      kind: 'panel',
      panelType: 'largeFixed',
    });
  });

  it('resolves a callout with default width', () => {
    expect(fromFormDefinition({ type: 'callout' })).toMatchObject({ kind: 'callout', widthPx: 320 });
  });

  it('falls back to main for main/unknown types', () => {
    expect(fromFormDefinition({ type: 'main' })).toEqual({ kind: 'main' });
    expect(fromFormDefinition({})).toEqual({ kind: 'main' });
  });
});
