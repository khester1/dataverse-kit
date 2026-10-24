// NOTE: .cjs, not .js — this package is `"type": "module"`, so a `.js` config using
// `module.exports` fails to parse. surface-kit carries the same extension for the same reason.
// This package is Fluent v9 ONLY. It is the single home of the Dynamics v9 theme, so a
// stray v8 import here would silently reintroduce the split it exists to remove.
module.exports = {
  root: true,
  extends: ['../../.eslintrc.js'],
  overrides: [
    {
      files: ['src/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@fluentui/react', '@fluentui/react/*'],
                message:
                  '@dataverse-kit/fluent-theme is Fluent v9 only. Use @fluentui/react-components.',
              },
            ],
          },
        ],
      },
    },
  ],
};
