import { createTheme, type Theme } from '@fluentui/react';
import { colors, typography } from './tokens';

// The genuinely-missing layer: a single Fluent v8 theme built from the canonical
// tokens. No shared package exposes a `createTheme` literal today (every client
// re-inlines its own `dynamicsTheme`); surface-kit establishes the one builder they
// collapse into.
export function createDynamicsTheme(): Theme {
  return createTheme({
    palette: {
      themePrimary: colors.brand,
      themeDarkAlt: colors.brandHover,
      themeDark: colors.brandDark,
      themeDarker: colors.brandDark,
      neutralPrimary: colors.textPrimary,
      neutralSecondary: colors.textSecondary,
      neutralLight: colors.borderNeutral,
      neutralLighter: colors.surfaceAlt,
      white: colors.surface,
      redDark: colors.danger,
    },
    defaultFontStyle: {
      fontFamily: typography.fontFamily,
    },
    semanticColors: {
      errorText: colors.danger,
      inputBorder: colors.fieldBorder,
      inputBackground: colors.fieldFill,
      bodyBackground: colors.surface,
    },
  });
}
