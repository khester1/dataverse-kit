import { describe, it, expect, vi } from "vitest";
import {
  parseAzToken,
  createTokenManager,
  REFRESH_SKEW_MS,
  type ExecFn,
} from "./token";

/**
 * Unit tests for the dev-server token provider. The live-org Playwright smoke can exercise a
 * happy-path fetch, but NOT the expiry math or the refresh de-dup — so those are covered here
 * with an injected fake `az` and clock. This is the first place the auto-refresh path is
 * verified end-to-end (it turns ON for the field control for the first time in this extraction).
 */

/** Build stdout the way `az account get-access-token --output json` does. */
const azStdout = (fields: Record<string, unknown>): string =>
  JSON.stringify({ accessToken: "tok", ...fields });

describe("parseAzToken", () => {
  it("prefers expires_on (epoch seconds → ms)", () => {
    const t = parseAzToken(azStdout({ expires_on: 1_700_000_000 }), () => 0);
    expect(t.token).toBe("tok");
    expect(t.expiresAt).toBe(1_700_000_000 * 1000);
  });

  it("falls back to the local-time expiresOn string when expires_on is absent", () => {
    // az emits expiresOn as a LOCAL datetime in "YYYY-MM-DD HH:MM:SS.ffffff" form (space, no
    // T/Z) — NOT ISO-UTC. Feed that representative shape so a regression that force-parsed it as
    // UTC (e.g. appending 'Z') would change the result in a non-UTC tz and be caught.
    const local = "2033-05-18 03:33:20.000000";
    const t = parseAzToken(azStdout({ expiresOn: local }), () => 0);
    expect(t.expiresAt).toBe(new Date(local).getTime());
    // And it took the expiresOn branch, not the now-based fallback (now() === 0 here).
    expect(t.expiresAt).toBeGreaterThan(0);
  });

  it("falls back to now + ~55m when neither expiry field is present", () => {
    const now = 1_000_000;
    const t = parseAzToken(azStdout({}), () => now);
    expect(t.expiresAt).toBe(now + 55 * 60 * 1000);
  });
});

describe("createTokenManager", () => {
  it("acquires once, then serves the cached token while it's fresh", async () => {
    const clock = 1_000_000;
    const exec = vi.fn<Parameters<ExecFn>, ReturnType<ExecFn>>(async () => ({
      stdout: azStdout({ expires_on: (clock + 60 * 60 * 1000) / 1000 }),
    }));
    const mgr = createTokenManager({ resource: "https://org", exec, now: () => clock });

    const a = await mgr.ensure();
    const b = await mgr.ensure();
    expect(a.token).toBe("tok");
    expect(b).toEqual(a);
    expect(exec).toHaveBeenCalledTimes(1); // cache hit — no second az call
    expect(mgr.current()).toEqual(a);
  });

  it("passes --tenant only when configured", async () => {
    const exec = vi.fn<Parameters<ExecFn>, ReturnType<ExecFn>>(async () => ({
      stdout: azStdout({ expires_on: 2_000_000 }),
    }));
    const withTenant = createTokenManager({ resource: "https://org", tenant: "abc", exec });
    await withTenant.ensure();
    expect(exec.mock.calls[0][1]).toContain("--tenant");
    expect(exec.mock.calls[0][1]).toContain("abc");

    const noTenant = createTokenManager({ resource: "https://org", exec });
    await noTenant.ensure();
    expect(exec.mock.calls[1][1]).not.toContain("--tenant");
  });

  it("re-acquires once the token is within the refresh-skew window", async () => {
    let clock = 0;
    const lifetimeMs = 60 * 60 * 1000;
    const exec = vi.fn<Parameters<ExecFn>, ReturnType<ExecFn>>(async () => ({
      stdout: azStdout({ expires_on: (clock + lifetimeMs) / 1000 }),
    }));
    const mgr = createTokenManager({ resource: "https://org", exec, now: () => clock });

    await mgr.ensure();
    expect(exec).toHaveBeenCalledTimes(1);
    expect(mgr.isStale()).toBe(false);

    // Advance to JUST outside the skew window — still fresh, still cached.
    clock = lifetimeMs - REFRESH_SKEW_MS - 1;
    expect(mgr.isStale()).toBe(false);
    await mgr.ensure();
    expect(exec).toHaveBeenCalledTimes(1);

    // Cross into the skew window — now stale, so ensure() re-acquires.
    clock = lifetimeMs - REFRESH_SKEW_MS;
    expect(mgr.isStale()).toBe(true);
    await mgr.ensure();
    expect(exec).toHaveBeenCalledTimes(2);
  });

  it("de-dupes concurrent acquisitions into a single az call", async () => {
    let resolve!: (v: { stdout: string }) => void;
    const exec = vi.fn<Parameters<ExecFn>, ReturnType<ExecFn>>(
      () => new Promise<{ stdout: string }>((r) => (resolve = r))
    );
    const mgr = createTokenManager({ resource: "https://org", exec, now: () => 0 });

    const p1 = mgr.ensure();
    const p2 = mgr.ensure();
    expect(exec).toHaveBeenCalledTimes(1); // both share the in-flight promise

    resolve({ stdout: azStdout({ expires_on: 3_600 }) });
    const [a, b] = await Promise.all([p1, p2]);
    expect(a).toEqual(b);
    expect(exec).toHaveBeenCalledTimes(1);
  });

  it("retries acquisition after a failure (in-flight is cleared)", async () => {
    let attempt = 0;
    const exec = vi.fn<Parameters<ExecFn>, ReturnType<ExecFn>>(async () => {
      attempt += 1;
      if (attempt === 1) throw new Error("az login required");
      return { stdout: azStdout({ expires_on: 3_600 }) };
    });
    const mgr = createTokenManager({ resource: "https://org", exec, now: () => 0 });

    await expect(mgr.ensure()).rejects.toThrow("az login required");
    expect(mgr.current()).toBeNull();
    // Second call is not blocked by a stuck in-flight promise.
    const t = await mgr.ensure();
    expect(t.token).toBe("tok");
    expect(exec).toHaveBeenCalledTimes(2);
  });
});
