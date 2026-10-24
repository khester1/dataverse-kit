import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming';

/**
 * Storybook chrome that says WHICH kit this is.
 *
 * ★ Five Storybooks in this estate render identical generic "Storybook" chrome, so an open tab
 *   gave no way to tell agent-kit from grid-kit from surface-kit short of reading the sidebar
 *   groups. `brandTitle` is the cheapest fix and needs no asset.
 *
 * ★ The brand colour is the Dynamics ramp's slot 80 (#0078d4) — the same value
 *   `@dataverse-kit/fluent-theme` pins from `design-tokens`, so the chrome and the components
 *   agree rather than drifting to a hand-picked blue.
 */
addons.setConfig({
  theme: create({
    base: 'dark',
    brandTitle: 'Agent Kit — conversational & agent surfaces',
    brandUrl: 'https://www.npmjs.com/package/@dataverse-kit/agent-kit',
    brandTarget: '_blank',
    colorPrimary: '#0078d4',
    colorSecondary: '#0078d4',
  }),
  sidebar: { showRoots: true },
});
