import { describe, it, expect } from 'vitest';
import { webDarkTheme } from '@fluentui/react-components';
import { resolveHostTheme, agentTheme, agentDarkTheme, createAgentTheme } from '../../theme';
import { colors, typography, radius } from '@dataverse-kit/design-tokens';

describe('resolveHostTheme', () => {
  it('falls back to the DYNAMICS theme, not stock Fluent', () => {
    expect(resolveHostTheme()).toBe(agentTheme);
    expect(resolveHostTheme().colorBrandBackground).toBe(colors.brand);
  });

  it('uses the dark Dynamics theme when asked', () => {
    expect(resolveHostTheme({ isDarkTheme: true })).toBe(agentDarkTheme);
  });

  // ★★ THE ROW WHERE A CORRECT RESOLVER AND A BROKEN ONE MUST DIFFER.
  //    The host theme's brand is deliberately NOT the Dynamics blue. A resolver that
  //    silently ignored `hostTheme` would be indistinguishable from a correct one if the
  //    fixture used a host theme that happened to agree with the kit's.
  it('prefers the host theme over the kit theme', () => {
    const hostTheme = { ...webDarkTheme, colorBrandBackground: '#ff00ff' };
    const resolved = resolveHostTheme({ hostTheme });
    expect(resolved.colorBrandBackground).toBe('#ff00ff');
    expect(resolved.colorBrandBackground).not.toBe(colors.brand);
  });

  it('lets an explicit theme beat even the host theme', () => {
    const hostTheme = { ...webDarkTheme, colorBrandBackground: '#ff00ff' };
    const theme = { ...webDarkTheme, colorBrandBackground: '#00ff00' };
    expect(resolveHostTheme({ theme, hostTheme }).colorBrandBackground).toBe('#00ff00');
  });
});

describe('the agent theme', () => {
  it('applies the CE overrides on top of the shared Dynamics theme', () => {
    const t = createAgentTheme();
    expect(t.fontFamilyBase).toBe(typography.fontFamily);
    expect(t.borderRadiusMedium).toBe(radius.card);
    // and still carries the shared brand — it is an override, not a replacement
    expect(t.colorBrandBackground).toBe(colors.brand);
  });
});
