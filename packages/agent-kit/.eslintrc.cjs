// NOTE: .cjs, not .js — this package is `"type": "module"`, so a `.js` config using
// `module.exports` fails to parse. surface-kit and fluent-theme carry it for the same reason.
//
// ★★ THE OVERRIDES BELOW ARE MUTUALLY EXCLUSIVE BY FILE, AND THAT IS LOAD-BEARING.
//
//    ESLint does NOT merge two `overrides` entries that set the same rule: for a file matched
//    by several, the LAST one wins OUTRIGHT and the earlier configs are discarded — arrays and
//    all. An earlier version of this file had three overlapping `src/**` blocks and the
//    framework-agnostic ban on src/core silently did nothing, because the tabster quarantine
//    below matched the same files and replaced it. It was caught by sabotage (a used
//    `@fluentui/react-components` import in src/core/scroll.ts: the bundle gate went red,
//    eslint stayed green at exit 0), not by review.
//
//    So every block carries the COMPLETE rule for its file set, and `excludedFiles` keeps the
//    sets disjoint. If you add a fourth, keep it disjoint too.

/** Fluent v8 and direct tabster use are banned everywhere in this v9-only package. */
const alwaysBannedPatterns = [
  {
    group: ['@fluentui/react', '@fluentui/react/*'],
    message: 'agent-kit is Fluent v9 only. Use @fluentui/react-components.',
  },
  {
    group: ['@fluentui/react-tabster', '@fluentui/react-tabster/*'],
    message: 'Do not reach for tabster directly. See CLAUDE.md > tabster.',
  },
];

/**
 * ★ The in-tree quarantine — and note what it does NOT contain.
 *
 * agent-kit deliberately USES Fluent's TabList, Tree, Menu and Dropdown: rebuilding their
 * focus management by hand is 100+ LOC apiece against WAI-ARIA, with no test harness behind
 * it, and a PCF host closes the tabster gap in one line by passing `targetDocument`.
 *
 * Banned here is the short list we chose to own because the ARIA pattern is genuinely small:
 * a disclosure is `<button aria-expanded aria-controls>` and nothing more, and Fluent's Card
 * buys a focus Groupper we do not want. All three reach tabster's `attrHandlers.set`
 * (Accordion/Toolbar via useArrowNavigationGroup, Card via useFocusableGroup), which throws
 * against the Dynamics form tabster (8.2.0, no attrHandlers) and unmounts the React tree.
 *
 * ★ `importNames` is the only mechanism that can express this: every one of these is
 *   re-exported from the single `@fluentui/react-components` barrel, which the kit must
 *   import for makeStyles/tokens/Button. Banning a subpath would ban an import nobody writes.
 */
const quarantinedImportNames = [
  'Accordion', 'AccordionItem', 'AccordionHeader', 'AccordionPanel',
  'Toolbar', 'ToolbarButton', 'ToolbarDivider', 'ToolbarGroup', 'ToolbarRadioButton',
  'Card', 'CardHeader', 'CardFooter', 'CardPreview',
];

const quarantineMessage =
  'Built in-tree in src/internal/ instead — Accordion/Toolbar reach useArrowNavigationGroup and ' +
  'Card reaches useFocusableGroup, both ending at tabster core.attrHandlers.set, which throws on ' +
  'a Dynamics form and unmounts the tree. TabList/Tree/Menu/Dropdown are NOT banned; see CLAUDE.md.';

module.exports = {
  root: true,
  extends: ['../../.eslintrc.js'],
  overrides: [
    {
      // A. The pure layer. A transport adapter must be able to import this from Node, so the
      //    ban is the SUPERSET: no react, no react-dom, no @fluentui at all.
      files: ['src/core/**/*.{ts,tsx}', 'src/services/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              { name: 'react', message: 'src/core and src/services must stay framework-agnostic — a transport adapter runs in Node.' },
              { name: 'react-dom', message: 'src/core and src/services must stay framework-agnostic — a transport adapter runs in Node.' },
            ],
            patterns: [
              { group: ['@fluentui/*'], message: 'src/core and src/services must stay framework-agnostic — a transport adapter runs in Node.' },
            ],
          },
        ],
      },
    },
    {
      // B. The in-tree implementations. May use the quarantined names; still no v8, no tabster.
      files: ['src/internal/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': ['error', { patterns: alwaysBannedPatterns }],
      },
    },
    {
      // C. Every other component file: the quarantine applies.
      files: ['src/**/*.{ts,tsx}'],
      excludedFiles: [
        'src/core/**/*.{ts,tsx}',
        'src/services/**/*.{ts,tsx}',
        'src/internal/**/*.{ts,tsx}',
      ],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: alwaysBannedPatterns,
            paths: [
              {
                name: '@fluentui/react-components',
                importNames: quarantinedImportNames,
                message: quarantineMessage,
              },
            ],
          },
        ],
      },
    },
  ],
};
