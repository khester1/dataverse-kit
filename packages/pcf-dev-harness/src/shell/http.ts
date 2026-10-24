/**
 * Browser-side HTTP helpers for a PCF dev harness's TIER-2 `dataverse.ts` fetch layer.
 *
 * All harness data calls go through the same-origin `/api/data` proxy (see the `./node`
 * `dataverseProxy` factory), which injects the bearer token server-side and auto-refreshes
 * it. `apiFetch` adds a one-shot 401/403 retry so a token that just lapsed self-heals: the
 * failed request triggers a server-side refresh and the short-delayed retry picks up the
 * fresh token — no manual token re-run. Hoisted here (out of each control's `dataverse.ts`)
 * so every control shares the same retry + error shape.
 */

/** Error carrying the HTTP status so callers can special-case 401/403 (expired token). */
export interface HttpError extends Error {
  status?: number;
}

/** Delay before the single 401/403 retry — long enough for the server to re-acquire a token. */
const RETRY_DELAY_MS = 1500;

/**
 * `fetch` through the `/api/data` proxy, retrying ONCE on a 401/403. The dev server
 * auto-refreshes the bearer token in the background (see the `./node` proxy), so a token
 * that just lapsed (e.g. after the machine slept) self-heals on the retry.
 *
 * 401 is the expired-token status; 403 is included because Dataverse can surface a lapsed
 * token that way too, and a retry after the server-side refresh is cheap insurance (a genuinely
 * forbidden call just pays one extra ~1.5s round-trip in the dev harness — not a hot path).
 *
 * Accepts an optional `init` so writes (PATCH/POST) get the same retry as reads. The retry
 * re-issues `fetch(url, init)` with the SAME `init`, so `init.body` must be re-readable — a
 * string / plain object is fine (all the harness sends); a one-shot ReadableStream body would
 * fail on the second attempt.
 */
export async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, init);
  if (res.status !== 401 && res.status !== 403) return res;
  await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  return fetch(url, init);
}

/** Build an {@link HttpError} from a non-ok response, capturing status + a truncated body. */
export async function toHttpError(res: Response): Promise<HttpError> {
  let detail = "";
  try {
    detail = (await res.text()).slice(0, 300);
  } catch {
    /* body already consumed / unavailable */
  }
  const err: HttpError = new Error(
    `${res.status} ${res.statusText}${detail ? `: ${detail}` : ""}`
  );
  err.status = res.status;
  return err;
}
