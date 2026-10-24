import { defineConfig } from 'tsup';

// Single-entry tsup build, mirroring surface-kit's packaging (NOT grid-kit's rollup).
// One entry is all this package needs: it is the single declaration of the Dynamics v9
// brand ramp + theme builders, consumed by grid-kit/v9, surface-kit/v9 and agent-kit.
export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  target: 'es2020',
  // Match the filenames declared in package.json exports (`.cjs` / `.mjs`).
  outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.mjs' }),
  // The Fluent v9 peer and the workspace sibling stay external — consumers install both.
  external: ['@fluentui/react-components', '@dataverse-kit/design-tokens'],
});
