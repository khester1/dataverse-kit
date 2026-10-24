#!/usr/bin/env node
// Run the suite under three process time zones. The date code must not read the process zone;
// a single-zone run cannot see a leak, because the author's zone is the one it was written in.
// ★ Chosen to bracket UTC on both sides AND straddle the date line: a DateOnly value read
//   through `new Date()` is off by one in Los Angeles and correct in Auckland, so the pair
//   catches the whole family.
import { spawnSync } from 'node:child_process';

const zones = ['UTC', 'America/Los_Angeles', 'Pacific/Auckland'];
const extra = process.argv.slice(2);
for (const tz of zones) {
  console.log(`\n── vitest under TZ=${tz} ──`);
  const r = spawnSync('npx', ['vitest', 'run', ...extra], { stdio: 'inherit', shell: true, env: { ...process.env, TZ: tz } });
  if (r.status !== 0) {
    console.error(`\n[test-in-zones] FAILED under TZ=${tz}`);
    process.exit(r.status ?? 1);
  }
}
console.log(`\n[test-in-zones] green under ${zones.join(', ')}`);
