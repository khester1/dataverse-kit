// surface-kit/.eslintrc.js
// Inherits the kit's root config and adds two guards:
//   1. src/core/** + src/responsive/** stay pure-TS (no Fluent / no React imports)
//      so export-engine can import + inline them at zero React cost.
//   2. The "two skins, one core" invariant: the default (v8) skin must not import
//      Fluent v9, and the ./v9 skin must not import Fluent v8. assert-no-react only
//      inspects the core/responsive bundles, so this lint rule is what statically
//      keeps the two skins from mixing.
module.exports = {
  root: true,
  extends: ['../../.eslintrc.js'],
  overrides: [
    {
      files: ['src/core/**/*.{ts,tsx}', 'src/responsive/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              { name: 'react', message: 'src/core and src/responsive must stay framework-agnostic (export-engine inlines them; v9-readiness).' },
              { name: 'react-dom', message: 'src/core and src/responsive must stay framework-agnostic (export-engine inlines them; v9-readiness).' },
            ],
            patterns: [
              { group: ['@fluentui/*'], message: 'src/core and src/responsive must stay framework-agnostic (export-engine inlines them; v9-readiness).' },
            ],
          },
        ],
      },
    },
    {
      // The v8 skin (default `.` entry) must not reach for Fluent v9.
      files: ['src/containers/**/*.{ts,tsx}', 'src/overlays/**/*.{ts,tsx}', 'src/layouts/**/*.{ts,tsx}', 'src/composites/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              { group: ['@fluentui/react-components', '@fluentui/react-components/*', '@fluentui/react-icons', '@fluentui/react-icons/*'], message: 'The default (v8) skin must use @fluentui/react (v8). Fluent v9 lives only in src/v9/ (the ./v9 subpath).' },
            ],
          },
        ],
      },
    },
    {
      // The ./v9 skin must not reach back for Fluent v8.
      files: ['src/v9/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              { group: ['@fluentui/react', '@fluentui/react/*'], message: 'The ./v9 skin must use @fluentui/react-components (v9), not @fluentui/react (v8).' },
            ],
          },
        ],
      },
    },
  ],
};
