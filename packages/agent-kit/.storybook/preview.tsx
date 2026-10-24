import * as React from 'react';
import type { Decorator, Preview } from '@storybook/react-vite';
import { webDarkTheme } from '@fluentui/react-components';
import { AgentKitHostProvider } from '../src/host/AgentKitHostProvider';

/**
 * ★ The FIRST Fluent v9 Storybook preview in this repo. grid-kit has no decorator at all and
 *   surface-kit's wraps in a Fluent **v8** ThemeProvider, so there was nothing to copy.
 *
 * ★ It wraps in `AgentKitHostProvider` rather than a bare `FluentProvider`, on purpose: the
 *   decorator is the pattern a host will copy, so it should BE the pattern. It also needs
 *   the IdPrefixProvider for its own sake — a docs page renders many stories into one
 *   document, which is the same multi-root collision the provider exists to prevent.
 */
const withAgentKit: Decorator = (Story, context) => {
  const theme = context.globals.theme as 'light' | 'dark' | 'host-mismatch';
  return (
    <AgentKitHostProvider
      isDarkTheme={theme === 'dark'}
      // A deliberately non-Dynamics brand, so a reviewer can SEE whether host-theme
      // threading works rather than inferring it from a theme that happens to match.
      hostTheme={
        theme === 'host-mismatch' ? { ...webDarkTheme, colorBrandBackground: '#b146c2' } : undefined
      }
      style={{ background: 'transparent' }}
    >
      <Story />
    </AgentKitHostProvider>
  );
};

const preview: Preview = {
  decorators: [withAgentKit],
  globalTypes: {
    theme: {
      description: 'Theme',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          { value: 'light', title: 'Dynamics light' },
          { value: 'dark', title: 'Dynamics dark' },
          { value: 'host-mismatch', title: 'Host theme (non-Dynamics brand)' },
        ],
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    controls: { expanded: true },
    // ★ Welcome first, Foundation last. Without an explicit order Storybook sorts alphabetically
    //   and opens on "Actions", which tells a first-time visitor nothing about which kit this is.
    options: {
      storySort: {
        order: ['Welcome', 'Conversation', 'Grounding', 'Actions', 'Shell', 'Agent ops', 'Support', 'Foundation'],
      },
    },
    viewport: {
      viewports: {
        mobile: { name: 'Mobile', styles: { width: '375px', height: '812px' } },
        tablet: { name: 'Tablet', styles: { width: '768px', height: '1024px' } },
        desktop: { name: 'Desktop', styles: { width: '1280px', height: '900px' } },
        large: { name: 'Large', styles: { width: '1600px', height: '1000px' } },
      },
    },
  },
  tags: ['autodocs'],
};
export default preview;
