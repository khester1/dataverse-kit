const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('@rollup/plugin-typescript');
const peerDepsExternal = require('rollup-plugin-peer-deps-external');
const pkg = require('./package.json');

// Keep workspace siblings + both Fluent skins external — consumers install them as
// real deps / (optional) peers. Regexes cover subpaths too (e.g. react/jsx-runtime).
const external = [
  /^react($|\/)/,
  /^react-dom($|\/)/,
  '@fluentui/react',
  '@fluentui/react-components',
  '@fluentui/react-icons',
  '@khester/dynamics-utils',
  '@khester/dynamics-cell-renderers',
  '@dataverse-kit/fluent-theme',
  '@dataverse-kit/design-tokens',
];

const basePlugins = () => [
  peerDepsExternal(),
  resolve({ browser: true, preferBuiltins: false }),
  commonjs(),
];

// Default (v8) entry — `.` → dist/index.js + dist/index.esm.js + dist/index.d.ts.
// Output is UNCHANGED from the single-entry build (the `./v9` subpath is a second,
// independent bundle); src/v9 is excluded from this program so its Fluent-v9 types
// never enter the v8 declaration pass.
const v8Config = {
  input: 'src/index.ts',
  output: [
    { file: pkg.main, format: 'cjs', sourcemap: true, exports: 'named' },
    { file: pkg.module, format: 'esm', sourcemap: true },
  ],
  plugins: [
    ...basePlugins(),
    typescript({
      tsconfig: './tsconfig.json',
      exclude: ['**/*.test.*', '**/*.stories.*', '**/_storybook/**', '**/__tests__/**', 'src/v9/**'],
      declaration: true,
      declarationDir: 'dist',
    }),
  ],
  external,
};

// The `./v9` subpath — the Fluent UI v9 skin. Its own bundle
// (dist/v9.js + dist/v9.esm.js) + declarations at dist/v9/index.d.ts. composite/
// incremental are disabled for this pass so it doesn't clash with the v8 build's
// tsBuildInfo (rollup runs the two configs sequentially).
const v9Config = {
  input: 'src/v9/index.ts',
  output: [
    { file: 'dist/v9.js', format: 'cjs', sourcemap: true, exports: 'named' },
    { file: 'dist/v9.esm.js', format: 'esm', sourcemap: true },
  ],
  plugins: [
    ...basePlugins(),
    typescript({
      tsconfig: './tsconfig.json',
      exclude: ['**/*.test.*', '**/*.stories.*', '**/_storybook/**', '**/__tests__/**'],
      declaration: true,
      declarationDir: 'dist',
      compilerOptions: { composite: false, incremental: false },
    }),
  ],
  external,
};

// The `./lite` subpath — the semantic-table host, with NO Fluent DataGrid and no react-table.
// ★★★ ITS OWN BUNDLE IS THE POINT, not a packaging preference. `sideEffects` is undeclared, so a
// consumer importing from the `/v9` barrel cannot reliably tree-shake `react-table` away — measured
// at +241 KB in `card-grid` for the registry. A separate entry cannot reach it at all.
const liteConfig = {
  input: 'src/lite/index.ts',
  output: [
    { file: 'dist/lite.js', format: 'cjs', sourcemap: true, exports: 'named' },
    { file: 'dist/lite.esm.js', format: 'esm', sourcemap: true },
  ],
  plugins: [
    ...basePlugins(),
    typescript({
      tsconfig: './tsconfig.json',
      exclude: ['**/*.test.*', '**/*.stories.*', '**/_storybook/**', '**/__tests__/**'],
      declaration: true,
      declarationDir: 'dist',
      compilerOptions: { composite: false, incremental: false },
    }),
  ],
  external,
};

module.exports = [v8Config, v9Config, liteConfig];
