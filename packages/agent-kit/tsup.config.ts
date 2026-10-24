import { defineConfig } from 'tsup';

// Multi-entry build, mirroring surface-kit (NOT grid-kit's rollup): `./core` and
// `./services` must each emit a real runtime file so a transport adapter can import them
// where React must not be — a Node broker, an Azure Function, a web worker. That is only
// structurally true if those entries cannot reach React, which .eslintrc.cjs enforces at
// the source and scripts/assert-no-react.mjs verifies on the built bundle.
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    core: 'src/core/index.ts',
    services: 'src/services/index.ts',
    // The host wrapper (IdPrefixProvider > FluentProvider > targetDocument). Separate so a
    // PCF/custom-page host can import just the provider without the component barrel.
    host: 'src/host/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  target: 'es2020',
  outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.mjs' }),
  external: [
    'react',
    'react-dom',
    '@fluentui/react-components',
    '@fluentui/react-icons',
    '@dataverse-kit/design-tokens',
    '@dataverse-kit/fluent-theme',
    '@dataverse-kit/surface-kit',
    '@dataverse-kit/surface-kit/v9',
  ],
});
