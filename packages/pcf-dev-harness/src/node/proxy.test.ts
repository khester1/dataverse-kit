import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { readStaticToken } from "./env";
import { dataverseProxy } from "./proxy";

/**
 * Unit tests for the dev-server proxy's pure / factory parts — the static-token fallback, the
 * mock-only boot contract, and option defaulting. These need no running Vite server (and never
 * spawn `az`: the factory only creates the token manager; acquisition fires inside the request /
 * refresh path, which these tests don't drive).
 */

describe("readStaticToken", () => {
  let dir: string;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "pcf-harness-env-"));
    fs.writeFileSync(path.join(dir, "with.env"), "FOO=bar\nDYNAMICS_TOKEN=  tok-123  \nBAZ=q\n");
    fs.writeFileSync(path.join(dir, "other.env"), "DYNAMICS_TOKEN=tok-other\n");
    fs.writeFileSync(path.join(dir, "none.env"), "FOO=bar\n");
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  it("reads + trims DYNAMICS_TOKEN from a file", () => {
    expect(readStaticToken([path.join(dir, "with.env")])).toBe("tok-123");
  });

  it("returns the first file that defines the token (precedence)", () => {
    expect(readStaticToken([path.join(dir, "with.env"), path.join(dir, "other.env")])).toBe(
      "tok-123"
    );
    expect(readStaticToken([path.join(dir, "none.env"), path.join(dir, "other.env")])).toBe(
      "tok-other"
    );
  });

  it("skips missing / unreadable files and returns '' when none define it", () => {
    expect(readStaticToken([path.join(dir, "does-not-exist.env")])).toBe("");
    expect(readStaticToken([path.join(dir, "none.env")])).toBe("");
    expect(readStaticToken([])).toBe("");
  });
});

describe("dataverseProxy", () => {
  it("mock-only boot when no org URL: empty proxy + no-op serve plugin", () => {
    const live = dataverseProxy({ dynamicsUrl: "" });
    expect(live.proxy).toEqual({});
    expect(live.plugin.apply).toBe("serve");
    expect(live.plugin.name).toBe("dataverse-live-token"); // default name
    // configureServer must be a no-op (no manager) — safe to call with a bare stub, returns nothing.
    const configureServer = live.plugin.configureServer as (server: unknown) => unknown;
    expect(configureServer({})).toBeUndefined();
  });

  it("wires the default /api/data proxy and strips the org URL's trailing slash", () => {
    const live = dataverseProxy({ dynamicsUrl: "https://org.crm.dynamics.com/" });
    expect(Object.keys(live.proxy)).toEqual(["/api/data"]);
    const opts = live.proxy["/api/data"];
    expect(opts.target).toBe("https://org.crm.dynamics.com"); // trailing slash stripped
    expect(opts.changeOrigin).toBe(true);
    expect(opts.secure).toBe(true);
    expect(typeof opts.configure).toBe("function");
  });

  it("honors custom path + pluginName options", () => {
    const live = dataverseProxy({
      dynamicsUrl: "https://org.crm.dynamics.com",
      path: "/proxy",
      pluginName: "my-live-token",
    });
    expect(Object.keys(live.proxy)).toEqual(["/proxy"]);
    expect(live.plugin.name).toBe("my-live-token");
  });
});
