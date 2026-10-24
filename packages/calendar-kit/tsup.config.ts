import { defineConfig } from 'tsup';

// Multi-entry build (the agent-kit / surface-kit shape). Each subpath is a real runtime file,
// so a code app or a Node script can import `./core` / `./dataverse` / `./adapters/pcf-dataset`
// without pulling React or FullCalendar — verified on the output by
// scripts/assert-entry-boundaries.mjs (postbuild).
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    core: 'src/core/index.ts',
    dataverse: 'src/dataverse/index.ts',
    'pcf-dataset': 'src/adapters/pcf-dataset.ts',
    'code-app': 'src/adapters/code-app.ts',
    portal: 'src/adapters/portal.ts',
    v9: 'src/v9/index.ts',
    fake: 'src/fake/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  target: 'es2020',
  outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.mjs' }),
  // ★ FullCalendar and its CSS stay EXTERNAL: the consumer's bundler resolves them once, which
  //   is what lets the optional Premium package (which peers on the exact same
  //   @fullcalendar/react) share an instance. The CSS imports survive as bare side-effect
  //   imports, which pcf-scripts (style-loader) and Vite both handle — MEASURED for pcf-scripts
  //   in the Phase 0 spike.
  // ★★ PATTERNS, not names. An import that is not external is BUNDLED — and then no specifier
  //    survives for scripts/assert-entry-boundaries.mjs to see. MEASURED by sabotage: a Fluent v8
  //    import in src/v9 was inlined (it is not a dependency, so tsup did not auto-externalise it)
  //    and the boundary check stayed green. Anything under these scopes stays an import.
  external: [/^react($|\/)/, /^react-dom($|\/)/, /^@fluentui\//, /^@fullcalendar\//, /^temporal-polyfill($|\/)/],
});
