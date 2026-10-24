import type * as React from 'react';

/**
 * The colours a calendar can be themed with, as plain CSS values (hex, rgb(), or `var(--x)`).
 * Each maps onto one of FullCalendar v7's classic-theme custom properties, so theming is just
 * setting variables on the calendar's own container — no stylesheet override, nothing global.
 *
 * ★ Scoped to the container on purpose: FullCalendar's palette declares its defaults on `:root`,
 *   and a PCF control shares `:root` with the whole form. Two calendars on one form each set
 *   their own, and neither touches the host.
 */
export interface CalendarTheme {
  primary?: string;
  primaryForeground?: string;
  background?: string;
  foreground?: string;
  mutedForeground?: string;
  faint?: string;
  muted?: string;
  strong?: string;
  border?: string;
  strongBorder?: string;
  today?: string;
  highlight?: string;
  now?: string;
  button?: string;
  buttonForeground?: string;
  buttonBorder?: string;
  buttonStrong?: string;
  buttonStrongBorder?: string;
  fontFamily?: string;
  fontSize?: string;
  /** Rendered as a banner above the calendar when a save fails. */
  error?: string;
}

const VAR: Record<Exclude<keyof CalendarTheme, 'fontFamily' | 'fontSize' | 'error'>, string> = {
  primary: '--fc-classic-primary',
  primaryForeground: '--fc-classic-primary-foreground',
  background: '--fc-classic-background',
  foreground: '--fc-classic-foreground',
  mutedForeground: '--fc-classic-muted-foreground',
  faint: '--fc-classic-faint',
  muted: '--fc-classic-muted',
  strong: '--fc-classic-strong',
  border: '--fc-classic-border',
  strongBorder: '--fc-classic-strong-border',
  today: '--fc-classic-today',
  highlight: '--fc-classic-highlight',
  now: '--fc-classic-now',
  button: '--fc-classic-button',
  buttonForeground: '--fc-classic-button-foreground',
  buttonBorder: '--fc-classic-button-border',
  buttonStrong: '--fc-classic-button-strong',
  buttonStrongBorder: '--fc-classic-button-strong-border',
};

/** The container style that applies `theme`. Unset keys keep FullCalendar's defaults. */
export function themeStyle(theme: CalendarTheme | undefined): React.CSSProperties {
  const style: Record<string, string> = {};
  if (!theme) return style;
  for (const [key, cssVar] of Object.entries(VAR)) {
    const v = theme[key as keyof typeof VAR];
    if (v) style[cssVar] = v;
  }
  if (theme.fontFamily) style.fontFamily = theme.fontFamily;
  if (theme.fontSize) style.fontSize = theme.fontSize;
  if (theme.background) style.background = theme.background;
  if (theme.foreground) style.color = theme.foreground;
  return style as React.CSSProperties;
}
