import { defineConfig } from 'tsup';

// Multi-entry build (mirrors form-runtime, NOT grid-kit's single-entry rollup):
// the `./core` and `./responsive` subpaths must each emit a real runtime file so
// export-engine can import + inline them. `core` and `responsive` are pure-TS
// (no react/@fluentui in their import graph — enforced by .eslintrc.js and
// verified post-build by scripts/assert-no-react.mjs), so esbuild inlines them
// into export-engine's tsup bundle at zero React cost.
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    core: 'src/core/index.ts',
    responsive: 'src/responsive/index.ts',
    // The `./v9` subpath: the same surfaces re-skinned over Fluent UI v9
    // (@fluentui/react-components). It re-uses the framework-agnostic core/responsive/
    // tokens/density/hooks layers, so only its own container/overlay bodies are v9.
    // assert-no-react does NOT check v9.* (only core.*/responsive.*), so the v9 skin
    // is free to import react/@fluentui-v9 here.
    v9: 'src/v9/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  target: 'es2020',
  // Match the filenames declared in package.json exports (`.cjs` / `.mjs`).
  outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.mjs' }),
  // Peers stay external; everything imported from src is bundled. The workspace sibling
  // @dataverse-kit/design-tokens is also kept external (consumers install it as a real
  // dep) — matches the grid-kit "keep workspace siblings external" pattern. The v9 Fluent
  // packages are external too (optional peers pulled only by the ./v9 subpath).
  external: [
    'react',
    'react-dom',
    '@fluentui/react',
    '@fluentui/react-components',
    '@fluentui/react-icons',
    '@dataverse-kit/design-tokens',
    '@dataverse-kit/fluent-theme',
  ],
});
