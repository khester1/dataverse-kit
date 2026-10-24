// What a CONSUMER of `@dataverse-kit/grid-kit/v9` pays, per scenario — reproducible (increment 3 measured
// ad hoc and nothing in the repo recorded how). Usage:
//   node scripts/measure-bundle.mjs <label>=<path/to/v9.esm.js> [<label>=<path> ...]
// e.g. a published tarball's dist against this tree's build:
//   node scripts/measure-bundle.mjs 0.29.1=/tmp/pub/package/dist/v9.esm.js branch=dist/v9.esm.js
// ★ Fluent is BUNDLED (a PCF bundle is one file; an external Fluent would hide e.g. Combobox's cost);
//   react / react-dom are external (the host supplies them). Minified, ESM; gzip -9 of the result.
import { buildSync } from 'esbuild';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..'); // the monorepo (its node_modules)
const SCENARIOS = {
  'DataGrid (no lookup editing)': `import { DataGrid } from 'GK'; export { DataGrid };`,
  'CardGrid (read-only host)': `import { CardGrid } from 'GK'; export { CardGrid };`,
  'GroupedGrid (default look)': `import { GroupedGrid } from 'GK'; export { GroupedGrid };`,
  'DataGrid + EditableLookupCell': `import { DataGrid, EditableLookupCell } from 'GK'; export { DataGrid, EditableLookupCell };`,
};

const targets = process.argv.slice(2).map((a) => {
  const i = a.indexOf('=');
  if (i < 1) throw new Error(`expected <label>=<path>, got "${a}"`);
  return { label: a.slice(0, i), path: resolve(a.slice(i + 1)) };
});
if (!targets.length) {
  console.error('usage: node scripts/measure-bundle.mjs <label>=<v9.esm.js> [...]');
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), 'grid-kit-bundle-'));
const rows = [];
try {
  for (const [name, code] of Object.entries(SCENARIOS)) {
    const entry = join(dir, 'entry.mjs');
    writeFileSync(entry, code);
    const row = { scenario: name };
    for (const t of targets) {
      try {
        const out = join(dir, 'out.mjs');
        buildSync({
          entryPoints: [entry], bundle: true, minify: true, format: 'esm', outfile: out, logLevel: 'silent',
          alias: { GK: t.path }, external: ['react', 'react-dom', 'react/jsx-runtime'],
          nodePaths: [join(ROOT, 'node_modules')],
        });
        const bytes = readFileSync(out);
        row[t.label] = `${(bytes.length / 1024).toFixed(1)} KB / ${(gzipSync(bytes, { level: 9 }).length / 1024).toFixed(1)} KB gz`;
      } catch (e) {
        // Only a missing export is "n/a" — any other build failure must be visible, not mislabelled.
        const msg = String(e?.errors?.[0]?.text ?? e?.message ?? e);
        if (!/No matching export/.test(msg)) throw e;
        row[t.label] = 'n/a (export missing)';
      }
    }
    rows.push(row);
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
console.table(rows);
