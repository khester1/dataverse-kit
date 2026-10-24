#!/usr/bin/env node
// Sabotage the pull-source gates (odata, pull, code-app, portal, useCalendarSource) at the line
// each defect would live on; every one must turn a TEST red. Restores from the in-memory copy —
// commit first (a killed run leaves its edit in place). Run: node scripts/sabotage-pull-sources.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const S = [
  ['hook: stale response lands', 'src/view/useCalendarSource.ts', '      if (mine !== seq.current) return;\n      setEvents', '      setEvents', 'src/view/useCalendarSource.test.tsx'],
  ['hook: save failure swallowed', 'src/view/useCalendarSource.ts', '            await source.update!(change);', '            await source.update!(change).catch(() => {});', 'src/view/useCalendarSource.test.tsx'],
  ['hook: undefined handler key present', 'src/view/useCalendarSource.ts', "      ...(onEventChange ? { onEventChange } : {}),", '      onEventChange,', 'src/view/useCalendarSource.test.tsx'],
  ['hook: same range re-queries', 'src/view/useCalendarSource.ts', '      if (prev && prev.start === r.start && prev.end === r.end) return;\n', '', 'src/view/useCalendarSource.test.tsx'],
  ['odata: andFilters unparenthesised', 'src/dataverse/odata.ts', "present.map((p) => `(${p})`)", 'present', 'src/dataverse/odata.test.ts'],
  ['odata: DateOnly gets instants', 'src/dataverse/odata.ts', "edge === 'start' ? range.startDate : range.endDate", 'range[edge]', 'src/dataverse/odata.test.ts'],
  ['odata: TZI sends the instant', 'src/dataverse/odata.ts', 'return `${toWall(range[edge], zone)}Z`', 'return range[edge]', 'src/dataverse/odata.test.ts'],
  ['odata: no annotation read', 'src/dataverse/odata.ts', "      if (typeof f === 'string') return f;\n", '', 'src/dataverse/odata.test.ts'],
  ['pull: caller filter dropped', 'src/dataverse/pull.ts', 'andFilters(config.filter, buildODataRangeFilter', 'andFilters(undefined, buildODataRangeFilter', 'src/dataverse/pull.test.ts'],
  ['pull: guessed always empty', 'src/dataverse/pull.ts', 'dateColumns.filter((c) => behaviors[c] === undefined)', '[] as string[]', 'src/dataverse/pull.test.ts'],
  ['pull: bad row throws out the load', 'src/dataverse/pull.ts', '        } catch (error) {\n          config.onInvalid?.(id, error);', '        } catch (error) {\n          throw error;', 'src/dataverse/pull.test.ts'],
  ['code-app: error envelope ignored', 'src/adapters/code-app.ts', '        if (result?.error) throw failure(result.error);\n', '', 'src/adapters/code-app.test.ts'],
  ['code-app: unbounded by maxRows', 'src/adapters/code-app.ts', 'page < 50 && rows.length < maxRows', 'page < 50', 'src/adapters/code-app.test.ts'],
  ['code-app: token not passed back', 'src/adapters/code-app.ts', '...(skipToken ? { skipToken } : {}),', '', 'src/adapters/code-app.test.ts'],
  ['code-app: update error envelope ignored', 'src/adapters/code-app.ts', "if (r && typeof r === 'object' && 'error' in r && r.error) throw failure(r.error);", '', 'src/adapters/code-app.test.ts'],
  ['code-app: abort not checked', 'src/adapters/code-app.ts', "        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');\n", '', 'src/adapters/code-app.test.ts'],
  ['portal: nextLink not followed', 'src/adapters/portal.ts', "url = body['@odata.nextLink'];", 'url = undefined;', 'src/adapters/portal.test.ts'],
  ['portal: no credentials', 'src/adapters/portal.ts', "          credentials: 'same-origin',\n", '', 'src/adapters/portal.test.ts'],
  ['portal: no formatted values', 'src/adapters/portal.ts', 'Prefer: `${FORMATTED_VALUES_PREFER},', 'Prefer: `', 'src/adapters/portal.test.ts'],
  ['portal: 403 hint lost', 'src/adapters/portal.ts', 'res.status === 403 || res.status === 401', 'false', 'src/adapters/portal.test.ts'],
  ['portal: onPick not wired', 'src/adapters/portal.ts', '    open: config.onPick,\n', '', 'src/adapters/portal.test.ts'],
];
let blind = 0;
for (const [name, file, from, to, test] of S) {
  const orig = readFileSync(file, 'utf8');
  const n = orig.split(from).length - 1;
  if (n !== 1) { console.log(`NO-OP  ${name} (anchor x${n})`); blind++; continue; }
  const mutated = orig.replace(from, to);
  writeFileSync(file, mutated);
  if (readFileSync(file, 'utf8') === orig) { console.log(`NO-OP  ${name}`); blind++; continue; }
  const r = spawnSync('npx', ['vitest', 'run', test], { encoding: 'utf8', shell: true });
  writeFileSync(file, orig);
  const out = r.stdout + r.stderr;
  const fails = (out.match(/Tests\s+(\d+) failed/) || [])[1];
  // ★ Red with no FAILED TEST is not a catch: vitest also exits 1 on a stray unhandled error,
  //   which is how a mis-awaited `.rejects` looked while the test itself passed (measured).
  if (r.status === 0) { console.log(`GREEN  ${name} — GATE IS BLIND`); blind++; }
  else if (!fails) { console.log(`AMBIG  ${name} — exit ${r.status} but no failed test`); blind++; }
  else console.log(`red    ${name} (${fails} failed)`);
}
console.log(blind ? `\n${blind} BLIND/NO-OP/AMBIGUOUS` : '\nall sabotages caught');
process.exit(blind ? 1 : 0);
