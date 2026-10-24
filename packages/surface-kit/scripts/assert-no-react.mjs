#!/usr/bin/env node
// Post-build guard: the ./core and ./responsive subpaths MUST stay framework-agnostic
// so export-engine's tsup inlines them at zero React cost. tsup keeps react/@fluentui
// EXTERNAL, so a leak would appear as an `import ... from "react"` (or "@fluentui/...")
// specifier in the built core/responsive bundles. Fail the build if one shows up.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const targets = ['core.mjs', 'core.cjs', 'responsive.mjs', 'responsive.cjs'];
const forbidden = [
  { re: /["']react["']/, label: 'react' },
  { re: /["']react-dom["']/, label: 'react-dom' },
  { re: /@fluentui\//, label: '@fluentui/*' },
];

let failed = false;
for (const file of targets) {
  const p = join(dist, file);
  if (!existsSync(p)) {
    console.error(`[assert-no-react] missing ${file} — run \`npm run build\` first`);
    failed = true;
    continue;
  }
  const src = readFileSync(p, 'utf8');
  for (const { re, label } of forbidden) {
    if (re.test(src)) {
      console.error(`[assert-no-react] FAIL: dist/${file} references "${label}" — core/ and responsive/ must stay framework-agnostic.`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}
console.log('[assert-no-react] OK — dist/core.* and dist/responsive.* have no react/@fluentui imports.');
