import React from 'react';
import type { Preview } from '@storybook/react-vite';
import { ThemeProvider, initializeIcons } from '@fluentui/react';
import { setIconOptions } from '@fluentui/react/lib/Styling';
import { createDynamicsTheme } from '../src/tokens';

// Icon registration is a global side effect; evaluate once per preview load.
setIconOptions({ disableWarnings: true });
initializeIcons();

const dynamicsTheme = createDynamicsTheme();

const preview: Preview = {
  parameters: {
    layout: 'padded',
    controls: {
      expanded: true,
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
    // Viewport is built into Storybook 10 core (no addon-viewport). Presets here
    // exercise the container-query / breakpoint responsiveness at 375/768/1280/1600.
    viewport: {
      viewports: {
        mobile: { name: 'Mobile (375)', styles: { width: '375px', height: '720px' } },
        tablet: { name: 'Tablet (768)', styles: { width: '768px', height: '900px' } },
        desktop: { name: 'Desktop (1280)', styles: { width: '1280px', height: '900px' } },
        large: { name: 'Large (1600)', styles: { width: '1600px', height: '1000px' } },
      },
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider theme={dynamicsTheme} style={{ background: 'transparent' }}>
        <Story />
      </ThemeProvider>
    ),
  ],
  tags: ['autodocs'],
};

export default preview;
