/**
 * Dynamics 365 theme tokens — pure constants with zero framework dependencies.
 * Use these in any context: web resources, PCF controls, grid customizers, tests.
 *
 * Note: The Fluent UI `createTheme()` call stays in web-resources since it
 * requires @fluentui/react. These are the raw design-token values only.
 */

/**
 * Common spacing values matching Dynamics forms.
 */
export const spacing = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
};

/**
 * CSS variables for easy use in styled components.
 */
export const cssVars = {
  primaryColor: 'var(--themePrimary, #0078d4)',
  backgroundColor: 'var(--neutralLighterAlt, #faf9f8)',
  cardBackground: 'var(--white, #ffffff)',
  textColor: 'var(--neutralPrimary, #323130)',
  borderColor: 'var(--neutralLight, #edebe9)',
  errorColor: 'var(--red, #d13438)',
  successColor: 'var(--green, #107c10)',
  warningColor: 'var(--yellow, #ffb900)',
};

/**
 * Dynamics CE (Customer Engagement) specific colors.
 * Used for native form look and feel.
 */
export const dynamicsCeColors = {
  /** Section header background color */
  sectionHeaderBg: 'transparent',
  /** Section border color (subtle) */
  sectionBorder: '#e1e1e1',
  /** Field underline on hover */
  fieldUnderline: '#c8c6c4',
  /** Required field asterisk color */
  requiredRed: '#a4262c',
  /** Label text color */
  labelColor: '#605e5c',
  /** Form background */
  formBackground: '#ffffff',
  /** CommandBar background */
  commandBarBg: '#f3f2f1',
  /** Record header background */
  recordHeaderBg: '#ffffff',
};

/**
 * Dynamics 365 spacing values (from DevTools inspection).
 * Use these for consistent margins and paddings.
 */
export const dynamicsSpacing = {
  /** Standard container padding */
  containerPadding: 16,
  /** Toolbar padding (vertical horizontal) */
  toolbarPadding: '12px 16px',
  /** Card/section margin */
  cardMargin: 16,
  /** Gap between elements */
  elementGap: 8,
};

/**
 * Dynamics 365 box shadows (from DevTools inspection).
 * Use these for elevated elements like callouts and panels.
 */
export const dynamicsShadows = {
  /** Elevated shadow for callouts, dropdowns, panels */
  elevated: 'rgba(0, 0, 0, 0.12) 0px 0px 2px, rgba(0, 0, 0, 0.14) 0px 2px 4px',
  /** Subtle shadow for cards */
  subtle: 'rgba(0, 0, 0, 0.08) 0px 1px 2px',
};

/**
 * Dynamics 365 border radius values (from DevTools inspection).
 * Use these for consistent rounded corners.
 */
export const dynamicsBorderRadius = {
  /** Panels, cards, callouts, grid containers */
  card: 8,
  /** Controls, search boxes, dropdowns */
  control: 4,
  /** Buttons */
  button: 4,
};
