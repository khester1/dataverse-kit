import * as childProcess from "child_process";
import * as util from "util";

/**
 * Azure-CLI token acquisition for the dev-server proxy — kept separate from `proxy.ts` and
 * dependency-injectable so the expiry-parse + refresh-dedup logic is unit-testable without a
 * real `az`. The token lives ONLY in the dev-server process (never on disk, never in the
 * browser). See `dataverseProxy` in `proxy.ts` for how it's wired into Vite.
 */

/** A resolved access token plus its absolute expiry (epoch ms). */
export interface TokenValue {
  token: string;
  /** Epoch milliseconds at which the token expires. */
  expiresAt: number;
}

/** Re-acquire this long before a token actually expires, so requests never race expiry. */
export const REFRESH_SKEW_MS = 5 * 60 * 1000;

/** Fallback lifetime when `az` returns neither `expires_on` nor `expiresOn` (~1h, minus skew). */
const FALLBACK_LIFETIME_MS = 55 * 60 * 1000;

/**
 * Runs a command and resolves its stdout. Injectable so tests can supply a fake `az` — the
 * default shells out to the real Azure CLI.
 */
export type ExecFn = (command: string, args: string[]) => Promise<{ stdout: string }>;

const execFileAsync = util.promisify(childProcess.execFile);
const defaultExec: ExecFn = (command, args) =>
  execFileAsync(command, args, { maxBuffer: 8 * 1024 * 1024 });

/**
 * Parse `az account get-access-token --output json` stdout into a {@link TokenValue}. Prefers
 * `expires_on` (epoch seconds — unambiguous UTC), falls back to the older local-time
 * `expiresOn` string, then to a fixed lifetime from `now`. Exported for unit testing.
 */
export function parseAzToken(stdout: string, now: () => number = Date.now): TokenValue {
  const parsed = JSON.parse(stdout) as {
    accessToken: string;
    expires_on?: number; // epoch seconds (preferred; unambiguous UTC)
    expiresOn?: string; // local-time string (older az)
  };
  const expiresAt =
    typeof parsed.expires_on === "number"
      ? parsed.expires_on * 1000
      : parsed.expiresOn
        ? new Date(parsed.expiresOn).getTime()
        : now() + FALLBACK_LIFETIME_MS;
  return { token: parsed.accessToken, expiresAt };
}

/** Options for {@link createTokenManager}. */
export interface TokenManagerOptions {
  /** The Dataverse resource URL to acquire a token for (`--resource`). */
  resource: string;
  /** Optional tenant id (`--tenant`) — needed for CDX / cross-tenant orgs. */
  tenant?: string;
  /** Injectable command runner (defaults to the real `az` via `execFile`). */
  exec?: ExecFn;
  /** Injectable clock (defaults to `Date.now`) — for testing the skew boundary. */
  now?: () => number;
  /** Override the refresh skew (defaults to {@link REFRESH_SKEW_MS}). */
  skewMs?: number;
}

/**
 * A per-instance token cache with de-duplicated background refresh. State (the cached token +
 * any in-flight acquisition) is closed over — NOT module-global — so multiple proxies (or tests)
 * never share or clobber each other's token.
 */
export interface TokenManager {
  /** Return a valid token, (re)acquiring — deduped — when missing or within the skew window. */
  ensure(): Promise<TokenValue>;
  /** The currently-cached token, or null if none has been acquired yet. Never triggers a fetch. */
  current(): TokenValue | null;
  /** True when the cache is empty or within the refresh-skew window of expiry. */
  isStale(): boolean;
}

/**
 * Create a {@link TokenManager}. Acquisition shells out to `az account get-access-token`
 * (or the injected `exec`); concurrent `ensure()` calls share a single in-flight promise so a
 * burst of proxied requests never spawns a burst of `az` invocations.
 */
export function createTokenManager(opts: TokenManagerOptions): TokenManager {
  const exec = opts.exec ?? defaultExec;
  const now = opts.now ?? Date.now;
  const skewMs = opts.skewMs ?? REFRESH_SKEW_MS;

  let state: TokenValue | null = null;
  let inflight: Promise<TokenValue> | null = null;

  async function acquire(): Promise<TokenValue> {
    const args = [
      "account",
      "get-access-token",
      "--resource",
      opts.resource,
      "--output",
      "json",
    ];
    if (opts.tenant) args.push("--tenant", opts.tenant);
    const { stdout } = await exec("az", args);
    return parseAzToken(stdout, now);
  }

  function isStale(): boolean {
    return !state || state.expiresAt - now() <= skewMs;
  }

  function ensure(): Promise<TokenValue> {
    if (state && !isStale()) return Promise.resolve(state);
    if (!inflight) {
      inflight = acquire()
        .then((t) => {
          state = t;
          return t;
        })
        .finally(() => {
          inflight = null;
        });
    }
    return inflight;
  }

  return { ensure, current: () => state, isStale };
}
