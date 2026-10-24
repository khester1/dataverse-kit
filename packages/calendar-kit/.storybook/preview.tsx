import * as React from 'react';
import type { Decorator, Preview } from '@storybook/react-vite';
import { FluentProvider, IdPrefixProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';

let n = 0;

/**
 * Every story sits in a FluentProvider — the Fluent-free `CalendarView` ignores it (proving it
 * needs none), `FluentCalendar` reads its tokens. The per-story IdPrefixProvider is the pattern a
 * PCF host must copy: a docs page renders many stories into one document, the same multi-root
 * collision that leaves a portal unthemed on a Dynamics form.
 */
const withFluent: Decorator = (Story, context) => {
  const [prefix] = React.useState(() => `calkit${++n}-`);
  const dark = context.globals.theme === 'dark';
  return (
    <IdPrefixProvider value={prefix}>
      <FluentProvider theme={dark ? webDarkTheme : webLightTheme} style={{ padding: 16 }}>
        <Story />
      </FluentProvider>
    </IdPrefixProvider>
  );
};

const preview: Preview = {
  decorators: [withFluent],
  globalTypes: {
    theme: {
      description: 'Fluent theme',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    controls: { expanded: true },
    options: { storySort: { order: ['Calendar', 'Dataverse', 'Foundation'] } },
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};
export default preview;
