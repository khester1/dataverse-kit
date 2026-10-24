import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming';

// Chrome that says WHICH kit this is (several Storybooks in this estate otherwise look identical).
addons.setConfig({
  theme: create({
    base: 'light',
    brandTitle: 'Calendar Kit — FullCalendar v7 for the Microsoft stack',
    brandUrl: 'https://www.npmjs.com/package/@dataverse-kit/calendar-kit',
    brandTarget: '_blank',
    colorPrimary: '#0078d4',
    colorSecondary: '#0078d4',
  }),
  sidebar: { showRoots: true },
});
