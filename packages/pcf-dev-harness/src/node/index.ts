/**
 * `@dataverse-kit/pcf-dev-harness/node` — the dev-server half of the shared PCF dev harness.
 *
 * `dataverseProxy` returns a Vite `{ plugin, proxy }` pair a control's `vite.config.ts` spreads
 * in to add a token-injecting `/api/data` proxy with automatic Azure-CLI token refresh. The
 * token utilities are exported for advanced use / testing. This entry is Node-only (imports
 * `fs`, `child_process`) — never import it from browser code; use `./shell` there.
 */
export {
  dataverseProxy,
  type DataverseProxyOptions,
  type DataverseProxy,
} from "./proxy";
export {
  createTokenManager,
  parseAzToken,
  REFRESH_SKEW_MS,
  type TokenValue,
  type TokenManager,
  type TokenManagerOptions,
  type ExecFn,
} from "./token";
