import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// ★ THE GATE THIS PACKAGE EXISTS TO MAKE POSSIBLE.
//
// The golden-literal test next door pins the ramp's VALUES. This one pins the very
// different claim that there is exactly ONE declaration of it in the monorepo — the claim
// that was false before this package existed (surface-kit and grid-kit each declared it,
// byte-identical, each with a docstring asserting it was canonical).
//
// ★ An identity assertion cannot do this job: `expect(a.ramp).toBe(b.ramp)` is trivially
//   true once both re-export the same module, and stays true if someone later adds a THIRD
//   local declaration in a package neither import touches. Only a source scan can see that.
//
// ★ Comments are STRIPPED before scanning, and that is not incidental tidiness: the first
//   run of this gate reported TWO declarations, the second being the sabotage instruction in
//   this very docstring. The estate already recorded that trap — broker/test/invariants.test.ts
//   strips comments "so prose explaining the rule does not trip it" — and it was hit anyway.
//
// Sabotage that must turn this red: re-add a real ramp declaration to
// packages/surface-kit/src/v9/theme.ts.

const PACKAGES_DIR = fileURLToPath(new URL('../../..', import.meta.url));
const DECLARATION = /export\s+const\s+dynamicsBrandRamp\s*[:=]/;

/** Strip block and line comments so prose about the rule cannot trip the rule. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

describe('the Dynamics v9 brand ramp', () => {
  const srcFiles = readdirSync(PACKAGES_DIR)
    .map((pkg) => join(PACKAGES_DIR, pkg, 'src'))
    .filter((d) => {
      try {
        return statSync(d).isDirectory();
      } catch {
        return false;
      }
    })
    .flatMap((d) => walk(d));

  it('scans a plausible number of source files', () => {
    // Non-vacuity precheck. Without it, a broken path would scan ZERO files and the
    // single-declaration assertion below would pass by finding nothing at all —
    // verification-lessons.md §3, "an assertion over an empty result is not a passing test".
    expect(srcFiles.length).toBeGreaterThan(200);
  });

  it('is declared exactly once, in this package', () => {
    const declaring = srcFiles
      .filter((f) => DECLARATION.test(stripComments(readFileSync(f, 'utf8'))))
      .map((f) => relative(PACKAGES_DIR, f));

    expect(declaring).toEqual(['fluent-theme/src/brand.ts']);
  });
});
