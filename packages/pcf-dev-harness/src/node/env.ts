import * as fs from "fs";

/**
 * Read the static `DYNAMICS_TOKEN` fallback from the given `.env` file(s), in order — the first
 * file that defines it wins. Missing / unreadable files are skipped. Returns `""` when none
 * define it. Kept pure (no closure state) so it's unit-testable independently of the proxy.
 *
 * This is only a FALLBACK: `dataverseProxy` prefers its auto-refreshed in-process token and
 * reads this fresh per request, so re-running the token script takes effect without a restart.
 */
export function readStaticToken(envFiles: string[]): string {
  for (const file of envFiles) {
    try {
      const content = fs.readFileSync(file, "utf-8");
      const m = content.match(/^DYNAMICS_TOKEN=(.+)$/m);
      if (m) return m[1].trim();
    } catch {
      /* try the next file */
    }
  }
  return "";
}
