// .cjs because this package is `"type": "module"` (same as agent-kit / surface-kit).
//
// ★★ The overrides are MUTUALLY EXCLUSIVE BY FILE, deliberately. ESLint does not merge two
//    overrides that set the same rule — the last match wins outright — so overlapping blocks
//    silently cancel each other (agent-kit found this by sabotage). `excludedFiles` keeps the
//    sets disjoint; keep them that way if you add one.

/** Everywhere: no Fluent v8, no direct tabster. */
const alwaysBanned = [
  { group: ['@fluentui/react', '@fluentui/react/*'], message: 'calendar-kit uses Fluent v9 only, and only in src/v9.' },
  { group: ['@fluentui/react-tabster', '@fluentui/react-tabster/*'], message: 'No tabster: it throws against the Dynamics form tabster (8.2.0).' },
];

/**
 * ★ Fluent components that reach tabster's `attrHandlers.set` (via useArrowNavigationGroup /
 *   useFocusableGroup / useRestoreFocus / useModalAttributes / …), which throws on a Dynamics form
 *   and unmounts the React tree — see the gallery's pcf-control-standard.md. Plus anything that
 *   PORTALS, which renders unthemed without a per-instance IdPrefixProvider. The calendar needs
 *   none of them.
 */
const quarantined = [
  'Toolbar', 'ToolbarButton', 'ToolbarGroup', 'ToolbarRadioButton', 'ToolbarToggleButton',
  'Card', 'CardHeader', 'CardFooter', 'CardPreview',
  'Dialog', 'DialogSurface', 'Popover', 'PopoverSurface', 'Menu', 'MenuList', 'Toaster', 'Toast',
  'TagGroup', 'TagPickerGroup', 'Accordion', 'TabList', 'Tree', 'Drawer', 'OverlayDrawer',
  // Portalling / active-descendant / arrow-navigation families (review of PR #383):
  'Tooltip', 'Dropdown', 'Combobox', 'Listbox', 'MenuButton', 'SplitButton', 'DataGrid', 'SwatchPicker',
];

const pureBan = {
  paths: [
    { name: 'react', message: 'core/, dataverse/ and adapters/ are framework-agnostic.' },
    { name: 'react-dom', message: 'core/, dataverse/ and adapters/ are framework-agnostic.' },
  ],
  patterns: [
    { group: ['@fluentui/*'], message: 'core/, dataverse/ and adapters/ are framework-agnostic.' },
    { group: ['@fullcalendar/*'], message: 'core/, dataverse/ and adapters/ must not load FullCalendar.' },
    { group: ['react/*', 'react-dom/*'], message: 'core/, dataverse/ and adapters/ are framework-agnostic.' },
  ],
};

module.exports = {
  root: true,
  extends: ['../../.eslintrc.js'],
  overrides: [
    {
      files: ['src/core/**/*.ts', 'src/dataverse/**/*.ts', 'src/adapters/**/*.ts', 'src/fake/**/*.ts'],
      rules: { 'no-restricted-imports': ['error', pureBan] },
    },
    {
      // The Fluent-free view: the root entry a Power Pages site imports.
      files: ['src/view/**/*.{ts,tsx}', 'src/index.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          { patterns: [...alwaysBanned, { group: ['@fluentui/*'], message: 'The root entry is Fluent-free (Power Pages). Fluent belongs in src/v9.' }] },
        ],
      },
    },
    {
      files: ['src/v9/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: alwaysBanned,
            paths: [
              {
                name: '@fluentui/react-components',
                importNames: quarantined,
                message: 'Reaches tabster attrHandlers or portals — both break on a Dynamics form. Build it in-tree.',
              },
            ],
          },
        ],
      },
    },
  ],
};
