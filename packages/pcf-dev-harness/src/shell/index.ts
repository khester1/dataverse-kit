/**
 * `@dataverse-kit/pcf-dev-harness/shell` — the browser half of the shared PCF dev harness.
 *
 * The control-agnostic Tier-1 chrome (`HarnessShell` + `usePersistedState`) and the Tier-2
 * HTTP helpers (`apiFetch` + `HttpError`) a control's own `dataverse.ts` builds on. Import
 * this from `dev/main.tsx` and `dev/harness/dataverse.ts`; the dev-server proxy lives in the
 * sibling `./node` entry.
 */
export {
  HarnessShell,
  WIDTH_PRESETS,
  type HarnessShellProps,
  type HarnessField,
  type ThemeChoice,
  type DataSource,
} from "./HarnessShell";
export { usePersistedState } from "./usePersistedState";
export { apiFetch, toHttpError, type HttpError } from "./http";
