// grid-kit/.eslintrc.js
// Inherits the kit's root config and adds three guards:
//   1. src/core/** stays framework-agnostic (no Fluent / no React) so the logic core
//      is v9-ready and export-engine can vendor it untouched.
//   2. The "two skins, one core" invariant: the default (v8) skin must not import
//      Fluent v9, and the ./v9 skin (src/v9/**) must not import Fluent v8. (Mirrors
//      surface-kit's guard — the drift/vendor gate does not catch a cross-skin import,
//      so this lint rule is what statically keeps the two skins from mixing.)
module.exports = {
  root: true,
  extends: ['../../.eslintrc.js'],
  overrides: [
    {
      files: ['src/core/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              { name: 'react', message: 'src/core/ must stay framework-agnostic (v9-readiness).' },
              { name: 'react-dom', message: 'src/core/ must stay framework-agnostic (v9-readiness).' },
            ],
            patterns: [
              { group: ['@fluentui/*'], message: 'src/core/ must stay framework-agnostic (v9-readiness).' },
            ],
          },
        ],
      },
    },
    {
      // The default (v8) skin — the component-bearing dirs must not reach for Fluent v9.
      files: [
        'src/hosts/**/*.{ts,tsx}',
        'src/adapters/**/*.{ts,tsx}',
        'src/registry/**/*.{ts,tsx}',
        'src/dnd/**/*.{ts,tsx}',
        'src/export/**/*.{ts,tsx}',
      ],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: [
                  '@fluentui/react-components',
                  '@fluentui/react-components/*',
                  '@fluentui/react-icons',
                  '@fluentui/react-icons/*',
                ],
                message:
                  'The default (v8) skin must use @fluentui/react (v8). Fluent v9 lives only in src/v9/ (the ./v9 subpath).',
              },
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
              {
                group: ['@fluentui/react', '@fluentui/react/*'],
                message: 'The ./v9 skin must use @fluentui/react-components (v9), not @fluentui/react (v8).',
              },
            ],
          },
        ],
      },
    },
  ],
};
