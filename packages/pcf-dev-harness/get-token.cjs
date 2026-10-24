#!/usr/bin/env node

/**
 * Acquire a Dataverse bearer token via the Azure CLI and write it to `.env.local`
 * (VITE_DYNAMICS_URL + DYNAMICS_TOKEN — the names the Vite dev-harness proxy reads).
 * The token stays SERVER-SIDE: the proxy reads it via `fs`, and `envPrefix` keeps it out of
 * the client bundle. Tokens are short-lived (~1h) — re-run, or use `npm run dev:token`.
 *
 * This is the OPTIONAL static-token fallback. The `dataverseProxy` (../node) now acquires and
 * auto-refreshes the token in-process from `az`, so a plain `npm run dev` (with a live `az
 * login`) needs no token step — this writes a static `DYNAMICS_TOKEN` for offline/no-`az` use.
 * Packaged as the `pcf-dev-token` bin; writes `.env.local` in the current working directory.
 *
 * Usage:
 *   pcf-dev-token [--url https://org.crm.dynamics.com] [--tenant <id>]
 *   url    falls back to VITE_DYNAMICS_URL (env or .env.local)
 *   tenant falls back to DYNAMICS_TENANT   (env or .env.local) — needed for CDX / temp orgs
 *          whose tenant differs from your default `az` context.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function arg(name) {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function readEnv(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function writeEnv(file, env) {
  const body = Object.entries(env)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  fs.writeFileSync(file, body + '\n', 'utf8');
}

const envPath = path.join(process.cwd(), '.env.local');
const env = readEnv(envPath);
const url = (arg('--url') || process.env.VITE_DYNAMICS_URL || env.VITE_DYNAMICS_URL || '').replace(/\/+$/, '');
const tenant = arg('--tenant') || process.env.DYNAMICS_TENANT || env.DYNAMICS_TENANT;

if (!url) {
  console.error(
    '✗ No Dataverse URL. Pass --url https://org.crm.dynamics.com or set VITE_DYNAMICS_URL in .env.local (copy .env.local.example).'
  );
  process.exit(1);
}

console.log(`→ Acquiring token for ${url} via Azure CLI${tenant ? ` (tenant ${tenant})` : ''}...`);
const azArgs = ['account', 'get-access-token', '--resource', url, '--query', 'accessToken', '-o', 'tsv'];
if (tenant) azArgs.push('--tenant', tenant);
const res = spawnSync('az', azArgs, { encoding: 'utf8' });

if (res.status !== 0) {
  console.error(
    '✗ az account get-access-token failed. Run `az login` first (for a CDX / temp org: ' +
      '`az login --tenant <tenant-id> --allow-no-subscriptions`).'
  );
  if (res.stderr) console.error(res.stderr.trim());
  process.exit(1);
}

const token = (res.stdout || '').trim();
if (!token) {
  console.error('✗ Azure CLI returned an empty token.');
  process.exit(1);
}

// Merge keys — never clobber other .env.local entries. The token is DYNAMICS_TOKEN (no VITE_
// prefix) so Vite can never inline it into the client bundle; only the URL is client-exposed.
env.VITE_DYNAMICS_URL = url;
env.DYNAMICS_TOKEN = token;
writeEnv(envPath, env);
console.log('✓ Wrote VITE_DYNAMICS_URL + DYNAMICS_TOKEN to .env.local (token stays server-side).');
