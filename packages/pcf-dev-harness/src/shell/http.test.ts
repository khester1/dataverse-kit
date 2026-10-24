import { describe, it, expect, vi, afterEach } from "vitest";
import { apiFetch, toHttpError, type HttpError } from "./http";

/**
 * Unit tests for the shared HTTP helpers. `apiFetch`'s one-shot 401/403 retry + `init`
 * forwarding is novel behavior (it replaced each control's raw `fetch`), so it's covered here
 * rather than left to a live smoke — the retry path fires only when a token lapses mid-session.
 * A fake global `fetch` is used with vitest fake timers so the 1.5s retry delay is instant.
 */

const okRes = (): Response => ({ ok: true, status: 200 }) as unknown as Response;
const errRes = (status: number): Response =>
  ({ ok: false, status, statusText: "x", text: async () => "" }) as unknown as Response;

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/** Drive `apiFetch` to completion, flushing the fake-timer retry delay if one is pending. */
async function run(p: Promise<Response>): Promise<Response> {
  await vi.runAllTimersAsync();
  return p;
}

describe("apiFetch", () => {
  it("returns a 2xx without retrying", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(async () => okRes());
    vi.stubGlobal("fetch", fetchMock);

    const res = await run(apiFetch("/api/data/v9.2/things"));
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries ONCE on 401 and returns the retry's response", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn<[string, RequestInit?], Promise<Response>>()
      .mockResolvedValueOnce(errRes(401))
      .mockResolvedValueOnce(okRes());
    vi.stubGlobal("fetch", fetchMock);

    const res = await run(apiFetch("/api/data/v9.2/things"));
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries on 403 too", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn<[string, RequestInit?], Promise<Response>>()
      .mockResolvedValueOnce(errRes(403))
      .mockResolvedValueOnce(okRes());
    vi.stubGlobal("fetch", fetchMock);

    await run(apiFetch("/api/data/v9.2/things"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry non-401/403 errors (e.g. 404, 500)", async () => {
    vi.useFakeTimers();
    for (const status of [400, 404, 500]) {
      const fetchMock = vi.fn(async () => errRes(status));
      vi.stubGlobal("fetch", fetchMock);
      const res = await run(apiFetch("/api/data/v9.2/things"));
      expect(res.status).toBe(status);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  });

  it("forwards the SAME init (method/headers/body) on both attempts", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn<[string, RequestInit?], Promise<Response>>()
      .mockResolvedValueOnce(errRes(401))
      .mockResolvedValueOnce(okRes());
    vi.stubGlobal("fetch", fetchMock);

    const init: RequestInit = {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "If-Match": "*" },
      body: JSON.stringify({ new_channels: "1,3" }),
    };
    await run(apiFetch("/api/data/v9.2/accounts(1)", init));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    // The retry re-sends the identical url + init — the write self-heals after a token refresh.
    expect(fetchMock.mock.calls[0]).toEqual(["/api/data/v9.2/accounts(1)", init]);
    expect(fetchMock.mock.calls[1]).toEqual(["/api/data/v9.2/accounts(1)", init]);
  });
});

describe("toHttpError", () => {
  it("carries the status and a truncated body detail", async () => {
    const res = {
      status: 401,
      statusText: "Unauthorized",
      text: async () => "x".repeat(500),
    } as unknown as Response;
    const err = (await toHttpError(res)) as HttpError;
    expect(err.status).toBe(401);
    expect(err.message).toContain("401 Unauthorized");
    // body detail is sliced to 300 chars
    expect(err.message.length).toBeLessThan(500);
    expect(err.message).toContain("x".repeat(300));
    expect(err.message).not.toContain("x".repeat(301));
  });

  it("tolerates an unreadable body", async () => {
    const res = {
      status: 500,
      statusText: "Server Error",
      text: async () => {
        throw new Error("consumed");
      },
    } as unknown as Response;
    const err = (await toHttpError(res)) as HttpError;
    expect(err.status).toBe(500);
    expect(err.message).toBe("500 Server Error");
  });
});
