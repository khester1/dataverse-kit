import type { Preview } from '@storybook/react-vite';
import { initializeIcons } from '@fluentui/react';
import { setIconOptions } from '@fluentui/react/lib/Styling';

// Icon registration is a global side effect (not React-tree-dependent) and this
// module evaluates exactly once per preview load. REQUIRED here: the emoji rating
// variant and (some) cell types render Fluent <Icon>s. Disable duplicate-
// registration warnings before registering. Trade-off: also mutes genuinely-
// missing-icon warnings while authoring stories.
setIconOptions({ disableWarnings: true });
initializeIcons();

const preview: Preview = {
  parameters: {
    layout: 'padded',
    controls: {
      expanded: true,
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
  },
  tags: ['autodocs'],
};

export default preview;
