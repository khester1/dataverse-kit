import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { MockAgentService } from '../MockAgentService';
import { NullAgentService } from '../NullAgentService';
import { createAgentService } from '../createAgentService';

/**
 * The structural guarantees, as fixtures rather than docstrings.
 *
 * Copied in shape from an earlier broker invariants test,
 * including the two details that make it work:
 *   - comments are STRIPPED before scanning, so prose explaining a rule does not trip it;
 *   - the secret patterns are a LIST, because that file records a near-miss where /apiKey/i
 *     alone missed `FOUNDRY_API_KEY` — the underscore breaks the word.
 */

// ★ process.cwd(), NOT fileURLToPath(import.meta.url). Under vitest's jsdom environment
//   `import.meta.url` is not a file: URL and fileURLToPath throws ERR_INVALID_URL_SCHEME —
//   the identical pattern works in fluent-theme only because that package runs in `node`.
//   vitest sets cwd to the package root.
const SRC = join(process.cwd(), 'src');

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '__tests__' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

const seamFiles = [...walk(join(SRC, 'services')), join(SRC, 'core', 'protocol.ts')];

describe('the seam carries no secret', () => {
  it('scans the files it means to', () => {
    // Non-vacuity: a broken path would scan nothing and every assertion below would pass.
    expect(seamFiles.length).toBeGreaterThanOrEqual(5);
  });

  // ★ A browser control cannot keep a secret: a custom page, a SWA and a PCF all run in the
  //   operator's browser, so anything handed to one is readable by the operator. Providers
  //   take an ENDPOINT and let a server hold the credential. Adding a key field is the defect.
  it.each([
    [/apiKey/i, 'apiKey'],
    [/API_KEY/i, 'API_KEY'],
    [/\bsecret\b/i, 'secret'],
    [/\bpassword\b/i, 'password'],
    [/\bbearer\b/i, 'bearer'],
  ])('declares no %s field', (pattern) => {
    const offenders = seamFiles.filter((f) => pattern.test(stripComments(readFileSync(f, 'utf8'))));
    expect(offenders.map((f) => f.replace(SRC, ''))).toEqual([]);
  });
});

describe('the seam has no write capability', () => {
  // ★ `send()` yields events and nothing else. A provider that wanted to write would have to
  //   change the interface, which keeps the guarantee reviewable in one file rather than
  //   trusted across a prompt.
  const FORBIDDEN = /^(create|update|delete|write|execute|invoke|run|submit|post|patch)/i;

  it.each([
    ['MockAgentService', new MockAgentService()],
    ['NullAgentService', new NullAgentService()],
  ])('%s exposes no mutating method', (_name, instance) => {
    const surface = [
      ...Object.getOwnPropertyNames(instance),
      ...Object.getOwnPropertyNames(Object.getPrototypeOf(instance)),
    ].filter((k) => k !== 'constructor');

    expect(surface.length).toBeGreaterThan(1); // non-vacuity: we really did read a surface
    expect(surface.filter((k) => FORBIDDEN.test(k))).toEqual([]);
    expect(surface).toContain('send');
    expect(surface).toContain('isAvailable');
  });
});

describe('provider selection fails safe', () => {
  // ★ An unrecognised name must fall back to `none`, never to a working provider: a typo
  //   should produce silence, not an unintended call to a model.
  it('falls back to none for an unknown provider', () => {
    const service = createAgentService({ provider: 'nonsense' as 'none' });
    expect(service.name).toBe('none');
  });

  it('defaults to none with no config at all', () => {
    expect(createAgentService().name).toBe('none');
  });

  it('returns none — not mock — when provider:custom supplies no factory', () => {
    expect(createAgentService({ provider: 'custom' }).name).toBe('none');
  });

  it('never throws from isAvailable', async () => {
    await expect(new NullAgentService().isAvailable()).resolves.toMatchObject({ available: false });
  });
});
