#!/usr/bin/env node
// Post-build guard: the ./core and ./services subpaths MUST stay framework-agnostic, so a
// transport adapter can import them where React must not be (a Node broker, an Azure
// Function, a web worker) and so export-engine could inline them at zero React cost.
//
// tsup keeps react/@fluentui EXTERNAL, so a leak shows up as a surviving specifier in the
// built bundle. That is what makes THIS gate work where the tabster bundle-grep does not:
// we are looking for a specifier tsup preserved, not for third-party bytes tsup never
// included.
//
// ★ The regexes are DELIBERATELY wider than surface-kit's, which require a closing quote
//   immediately after the name and therefore miss `react/jsx-runtime` — the single most
//   likely real leak, since one stray .tsx file under src/services/ emits exactly that.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const targets = ['core.mjs', 'core.cjs', 'services.mjs', 'services.cjs'];
const forbidden = [
  { re: /["']react(\/[^"']*)?["']/, label: 'react (incl. react/jsx-runtime)' },
  { re: /["']react-dom(\/[^"']*)?["']/, label: 'react-dom (incl. subpaths)' },
  { re: /@fluentui\//, label: '@fluentui/*' },
];

let failed = false;
for (const file of targets) {
  const p = join(dist, file);
  if (!existsSync(p)) {
    // A typo in `targets` fails the build for the WRONG reason, so say which it is.
    console.error(`[assert-no-react] missing ${file} — run \`npm run build\` first (or fix the targets list)`);
    failed = true;
    continue;
  }
  const src = readFileSync(p, 'utf8');
  for (const { re, label } of forbidden) {
    if (re.test(src)) {
      console.error(
        `[assert-no-react] FAIL: dist/${file} references "${label}" — core/ and services/ must stay framework-agnostic.`,
      );
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log(`[assert-no-react] OK — ${targets.join(', ')} have no react/@fluentui imports.`);
