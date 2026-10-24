// Runs the timezone-sensitive filter tests under two far-from-UTC zones (UTC+14 and UTC-7).
// The suites skip themselves under any other TZ, so plain `vitest run` cannot exercise them.
//
// ★ A run where TZ did not take effect is all-skipped and exits 0 — so this script also
// requires that each zone's tests actually PASSED, not merely that nothing failed.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Each zone exercises a different branch of the date rule: UTC+14 the datetime → local-day rule, UTC-7
// the date-only rule (a UTC-midnight parse lands a day early there, and only there).
const FILES = ['src/__tests__/filter.tz.test.ts', 'src/v9/__tests__/editedDate.tz.test.tsx'];
const ZONES = [
  { tz: 'Pacific/Kiritimati', suites: { 'date filters at UTC+14': 3, 'edited date at UTC+14': 1 } },
  { tz: 'America/Los_Angeles', suites: { 'date filters at UTC-7': 3, 'edited date at UTC-7': 3 } },
];
const dir = mkdtempSync(join(tmpdir(), 'grid-kit-tz-'));

try {
  for (const { tz, suites } of ZONES) {
    const report = join(dir, `${tz.replace('/', '_')}.json`);
    const result = spawnSync(
      'npx',
      ['vitest', 'run', ...FILES, '--reporter=default', '--reporter=json', `--outputFile.json=${report}`],
      { stdio: 'inherit', env: { ...process.env, TZ: tz }, shell: process.platform === 'win32' },
    );
    if (result.error) {
      console.error('[test-tz] failed to start vitest:', result.error);
      process.exit(1);
    }
    if (result.status !== 0) process.exit(result.status ?? 1);

    // ★ Count per-test statuses: vitest 1.6's top-level `numPassedTests` counts SKIPPED tests too
    // (measured: 4 "passed" under TZ=UTC, where the three UTC+14 tests were all skipped).
    const { testResults } = JSON.parse(readFileSync(report, 'utf8'));
    const results = testResults.flatMap((file) => file.assertionResults);
    for (const [suite, min] of Object.entries(suites)) {
      const passed = results.filter((a) => a.ancestorTitles.includes(suite) && a.status === 'passed').length;
      if (passed < min) {
        console.error(`[test-tz] only ${passed} test(s) of "${suite}" passed under TZ=${tz} (expected >= ${min}) — the timezone did not take effect, so this run proved nothing.`);
        process.exit(1);
      }
      console.log(`[test-tz] ${passed} "${suite}" tests passed under TZ=${tz}.`);
    }
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
