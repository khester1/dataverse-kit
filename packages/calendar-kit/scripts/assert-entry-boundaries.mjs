#!/usr/bin/env node
// Post-build: verify each entry's surviving external specifiers — tsup keeps react / fullcalendar
// / fluent EXTERNAL, so a boundary leak shows up as an import string in the built file. This is
// the artefact check behind the .eslintrc.cjs rules (a lint rule can be disabled in a file; the
// bundle cannot lie about what it imports).
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const spec = (name) => new RegExp(`["']${name}(/[^"']*)?["']`);
const REACT = [spec('react'), spec('react-dom')];
const FC = [/["']@fullcalendar\//];
const FLUENT = [/["']@fluentui\//];
// Fluent v8 is `@fluentui/react` (exactly, or a subpath) — distinct from v9's react-components.
const FLUENT_V8 = [/["']@fluentui\/react(\/[^"']*)?["']/];

const rules = {
  core: [...REACT, ...FC, ...FLUENT],
  dataverse: [...REACT, ...FC, ...FLUENT],
  'pcf-dataset': [...REACT, ...FC, ...FLUENT],
  'code-app': [...REACT, ...FC, ...FLUENT],
  portal: [...REACT, ...FC, ...FLUENT],
  fake: [...REACT, ...FC, ...FLUENT],
  index: FLUENT, // the Power Pages entry
  v9: FLUENT_V8, // v9 only: no Fluent v8 in the Fluent entry either
};
// Positive controls: an entry that SHOULD reference a thing must, or the regexes are blind.
const mustHave = { index: [/["']@fullcalendar\/react["']/], v9: [/["']@fluentui\/react-components["']/] };

let failed = false;
for (const [entry, bans] of Object.entries(rules)) {
  for (const ext of ['mjs', 'cjs']) {
    const p = join(dist, `${entry}.${ext}`);
    if (!existsSync(p)) {
      console.error(`[entry-boundaries] missing dist/${entry}.${ext} — build first, or fix the list`);
      failed = true;
      continue;
    }
    const src = readFileSync(p, 'utf8');
    for (const re of bans) {
      if (re.test(src)) {
        console.error(`[entry-boundaries] FAIL dist/${entry}.${ext} imports ${re}`);
        failed = true;
      }
    }
  }
}
for (const [entry, needs] of Object.entries(mustHave)) {
  const src = readFileSync(join(dist, `${entry}.mjs`), 'utf8');
  for (const re of needs) {
    if (!re.test(src)) {
      console.error(`[entry-boundaries] CONTROL FAILED dist/${entry}.mjs does not import ${re} — the checks above are blind`);
      failed = true;
    }
  }
}
if (failed) process.exit(1);
console.log('[entry-boundaries] OK — pure entries import no react/fullcalendar/fluent; root imports no fluent; controls pass.');
