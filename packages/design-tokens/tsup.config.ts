import { defineConfig } from 'tsup';

// Single-entry pure-TS build. Mirrors surface-kit's `.mjs`/`.cjs` outExtension so the
// package.json `exports` map (import -> .mjs, require -> .cjs) matches what tsup writes.
// Zero runtime deps, so nothing is external.
export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2020',
  outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.mjs' }),
});
