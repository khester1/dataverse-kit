import { describe, it, expect } from 'vitest';
import { webLightTheme } from '@fluentui/react-components';
import { createDynamicsCeTheme, dynamicsCeTheme, dynamicsV9Theme } from '../theme';

// ★ GOLDEN LITERALS measured on a live Dynamics org (apps/ce-parity/reference/captures/,
//   2026-09-29). They are written out here rather than read from webLightTheme, because an
//   oracle taken from the implementation (`expect(ce).toEqual(webLightTheme)`) can never fail for
//   the right reason. If Fluent moves one of these, this test is what notices that the CE theme no
//   longer matches the MEASUREMENT.
const MEASURED = {
  colorNeutralBackground2: '#fafafa', // page background
  colorNeutralBackground1: '#ffffff', // cards
  colorNeutralForeground1: '#242424', // text
  colorNeutralForeground2: '#424242', // entity name, choice text
  colorNeutralForeground3: '#616161', // "- Saved"
  colorNeutralForeground4: '#707070', // choice / lookup placeholder
  colorNeutralBackground3: '#f5f5f5', // field fill
  colorNeutralBackground6: '#e6e6e6', // phone/email action button
  colorNeutralStroke2: '#e0e0e0', // header-field divider
  colorSubtleBackgroundPressed: '#e0e0e0', // form switcher while open
  colorNeutralStroke1: '#d1d1d1', // Share button border
  colorCompoundBrandStroke: '#0f6cbd', // selected-tab underline
  colorBrandForegroundLink: '#115ea3', // lookup link, owner name
  colorPaletteRedForeground1: '#bc2f32', // required asterisk
  shadow4: '0 0 2px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.14)', // command bar, header, section cards
  shadow16: '0 0 2px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.14)', // form switcher menu
  borderRadiusXLarge: '8px', // cards
  borderRadiusMedium: '4px', // inputs, buttons, menu
} as const;

const norm = (v: string) => v.toLowerCase().replace(/\s+/g, '');

describe('createDynamicsCeTheme', () => {
  it('matches every measured new-look value', () => {
    // Non-vacuity: the table is the size we think it is.
    expect(Object.keys(MEASURED)).toHaveLength(18);
    for (const [token, value] of Object.entries(MEASURED)) {
      expect(norm(String(dynamicsCeTheme[token as keyof typeof dynamicsCeTheme])), token).toBe(norm(value));
    }
  });

  it('uses the Fluent web brand, NOT the classic Dynamics #0078d4', () => {
    expect(dynamicsCeTheme.colorCompoundBrandStroke).toBe('#0f6cbd');
    expect(dynamicsV9Theme.colorCompoundBrandStroke).toBe('#0078d4');
  });

  it('returns a copy, so overriding a token cannot mutate Fluent\'s singleton', () => {
    const t = createDynamicsCeTheme();
    expect(t).not.toBe(webLightTheme);
    (t as Record<string, unknown>).colorNeutralBackground2 = '#000000';
    expect(webLightTheme.colorNeutralBackground2).toBe('#fafafa');
  });
});
