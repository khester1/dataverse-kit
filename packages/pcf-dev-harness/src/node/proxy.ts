import type { Plugin, ProxyOptions } from "vite";
import { createTokenManager, REFRESH_SKEW_MS, type TokenManager } from "./token";
import { readStaticToken } from "./env";

/**
 * Vite dev-server glue for a PCF harness's live-org data source. Returns a `{ plugin, proxy }`
 * pair the control's `vite.config.ts` spreads into `plugins` + `server.proxy`. The proxy mounts
 * a same-origin `/api/data` path that forwards to the Dataverse org with a bearer token injected
 * SERVER-SIDE — the token never reaches the browser and is never written to disk by the harness.
 *
 * The token is acquired from the Azure CLI IN THIS PROCESS and kept fresh automatically (a
 * background loop re-acquires ~5 min before expiry), so a running session never needs a manual
 * token re-run — a valid `az login` is enough. If `az` can't acquire one, the proxy falls back
 * to a static `DYNAMICS_TOKEN` read from the configured `envFile`(s), re-read per request so a
 * fresh token takes effect without a restart.
 *
 * Token state is captured per call (closure), so multiple proxies never share or clobber it.
 */
export interface DataverseProxyOptions {
  /** The Dataverse org URL (e.g. `https://org.crm.dynamics.com`). Empty ⇒ mock-only boot. */
  dynamicsUrl: string;
  /** Optional tenant id for CDX / cross-tenant orgs (passed to `az --tenant`). */
  tenant?: string;
  /**
   * Absolute path(s) to a `.env` file the static `DYNAMICS_TOKEN` fallback is read from, in
   * order. Omit to rely solely on the in-process `az` token.
   */
  envFile?: string | string[];
  /**
   * Send the `Prefer: odata.include-annotations="*"` header (FormattedValue annotations on data
   * rows). Default `true`; set `false` for hosts that don't want annotations (e.g. custom pages).
   */
  prefer?: boolean;
  /** Vite plugin name for the background token-refresh loop. Default `"dataverse-live-token"`. */
  pluginName?: string;
  /** Same-origin path the proxy mounts at. Default `"/api/data"`. */
  path?: string;
}

/** The `{ plugin, proxy }` pair returned by {@link dataverseProxy}. */
export interface DataverseProxy {
  /** A `serve`-only Vite plugin that keeps the token warm in the background. */
  plugin: Plugin;
  /** A `server.proxy` record forwarding the mount path to the org with the token injected. */
  proxy: Record<string, ProxyOptions>;
}

/** Build the dev-server proxy + background token-refresh plugin for a live-org harness. */
export function dataverseProxy(opts: DataverseProxyOptions): DataverseProxy {
  const dynamicsUrl = (opts.dynamicsUrl || "").replace(/\/+$/, "");
  const tenant = opts.tenant || "";
  const prefer = opts.prefer !== false; // default true
  const proxyPath = opts.path || "/api/data";
  const pluginName = opts.pluginName || "dataverse-live-token";
  const envFiles =
    opts.envFile == null ? [] : Array.isArray(opts.envFile) ? opts.envFile : [opts.envFile];

  // Per-instance token cache — only when an org URL is configured (else pure-mock boot).
  const manager: TokenManager | null = dynamicsUrl
    ? createTokenManager({ resource: dynamicsUrl, tenant })
    : null;
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;

  const proxy: Record<string, ProxyOptions> = {};
  if (dynamicsUrl && manager) {
    proxy[proxyPath] = {
      target: dynamicsUrl,
      changeOrigin: true,
      secure: true,
      configure: (proxyServer) => {
        proxyServer.on("proxyReq", (proxyReq, req) => {
          // Prefer the auto-refreshed in-memory token; fall back to a static env-file token.
          const token = manager.current()?.token || readStaticToken(envFiles);
          if (token) proxyReq.setHeader("Authorization", `Bearer ${token}`);
          // Self-heal: if the cache is missing/stale, kick off a deduped background refresh so
          // the next request — or the client's one-shot retry — gets a fresh token.
          if (manager.isStale()) void manager.ensure().catch(() => undefined);
          proxyReq.setHeader("OData-MaxVersion", "4.0");
          proxyReq.setHeader("OData-Version", "4.0");
          if (prefer) proxyReq.setHeader("Prefer", 'odata.include-annotations="*"');
          // eslint-disable-next-line no-console
          console.log(`[Proxy] ${req.method} ${dynamicsUrl}${req.url}`);
        });
        proxyServer.on("error", (err, _req, res) => {
          // eslint-disable-next-line no-console
          console.error("[Proxy] Error:", err.message);
          if (res && "writeHead" in res) {
            const httpRes = res as unknown as {
              writeHead: (code: number, headers: Record<string, string>) => void;
              end: (body: string) => void;
            };
            httpRes.writeHead(502, { "Content-Type": "application/json" });
            httpRes.end(JSON.stringify({ error: { message: `Proxy error: ${err.message}` } }));
          }
        });
      },
    };
  }

  const plugin: Plugin = {
    name: pluginName,
    apply: "serve",
    configureServer(server) {
      if (!manager) return; // mock-only boot — nothing to refresh
      const loop = async (): Promise<void> => {
        let delay = 60 * 1000; // retry cadence if acquisition fails (e.g. `az login` lapsed)
        try {
          const t = await manager.ensure();
          delay = Math.max(t.expiresAt - Date.now() - REFRESH_SKEW_MS, 30 * 1000);
        } catch (e) {
          server.config.logger.warn(
            `[${pluginName}] token refresh failed: ${(e as Error).message}\n` +
              `  Run \`az login --tenant ${tenant || "<tenant>"} --allow-no-subscriptions\`. ` +
              `Falling back to a static DYNAMICS_TOKEN if present.`
          );
        }
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => void loop(), delay);
      };
      void loop();
      server.httpServer?.once("close", () => {
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = null;
      });
    },
  };

  return { plugin, proxy };
}
