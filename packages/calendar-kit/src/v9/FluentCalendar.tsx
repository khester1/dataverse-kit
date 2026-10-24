import * as React from 'react';
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { CalendarView, type CalendarViewProps } from '../view/CalendarView';
import type { CalendarTheme } from '../view/theme';

/**
 * Fluent v9 tokens → the calendar theme. Each token is a `var(--…)` reference, so the calendar
 * follows whatever FluentProvider it sits in — light, dark, high contrast, or a host's brand —
 * with no JavaScript theme read and no re-render on theme change.
 *
 * ★ Must render inside a FluentProvider (the host's). Outside one every token is an unset
 *   variable and FullCalendar falls back to its own defaults — visibly un-Fluent, never broken.
 */
export const fluentCalendarTheme: CalendarTheme = {
  primary: tokens.colorBrandBackground,
  primaryForeground: tokens.colorNeutralForegroundOnBrand,
  background: tokens.colorNeutralBackground1,
  foreground: tokens.colorNeutralForeground1,
  mutedForeground: tokens.colorNeutralForeground3,
  faint: tokens.colorNeutralBackground2,
  muted: tokens.colorNeutralBackground3,
  strong: tokens.colorNeutralBackground5,
  border: tokens.colorNeutralStroke2,
  strongBorder: tokens.colorNeutralStroke1,
  today: tokens.colorBrandBackground2,
  highlight: tokens.colorBrandBackground2Hover,
  now: tokens.colorPaletteRedBorder2,
  button: tokens.colorNeutralBackground1,
  buttonForeground: tokens.colorNeutralForeground1,
  buttonBorder: tokens.colorNeutralStroke1,
  buttonStrong: tokens.colorNeutralBackground1Selected,
  buttonStrongBorder: tokens.colorNeutralStroke1Pressed,
  fontFamily: tokens.fontFamilyBase,
  fontSize: tokens.fontSizeBase300,
  error: tokens.colorPaletteRedForeground1,
};

const useStyles = makeStyles({
  // ★ Applied through FullCalendar's `buttonClass` option, NOT a `& .fc-button` selector: v7
  //   hashes its class names and that selector matched 0 buttons (measured).
  button: {
    borderRadius: tokens.borderRadiusMedium,
    fontFamily: tokens.fontFamilyBase,
    fontWeight: tokens.fontWeightSemibold,
  },
  toolbar: {
    gap: tokens.spacingHorizontalS,
  },
});

export type FluentCalendarProps = CalendarViewProps;

/** `CalendarView` styled with the surrounding Fluent v9 theme. Same props. */
export function FluentCalendar(props: FluentCalendarProps): React.ReactElement {
  const styles = useStyles();
  const theme = React.useMemo(() => ({ ...fluentCalendarTheme, ...props.theme }), [props.theme]);
  return (
    <CalendarView
      {...props}
      theme={theme}
      classNames={{
        button: mergeClasses(styles.button, props.classNames?.button),
        toolbar: mergeClasses(styles.toolbar, props.classNames?.toolbar),
      }}
    />
  );
}
