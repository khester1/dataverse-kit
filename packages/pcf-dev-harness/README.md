# @dataverse-kit/pcf-dev-harness

A shared dev harness for [PCF](https://learn.microsoft.com/power-apps/developer/component-framework/overview)
controls built to the "thin `index.ts` → host-agnostic React app" standard. It gives a control's
`dev/` a `pcf-scripts start`-style sandbox **plus** the ability to stream **real Dataverse data**
into the running app — with the bearer token kept entirely server-side.

Two entry points, matched to where the code runs:

| Import | Runs in | Provides |
| --- | --- | --- |
| `@dataverse-kit/pcf-dev-harness/shell` | the browser (`dev/main.tsx`, `dev/harness/*.ts`) | `HarnessShell`, `usePersistedState`, `apiFetch`, `HttpError` |
| `@dataverse-kit/pcf-dev-harness/node` | the Vite dev server (`vite.config.ts`) | `dataverseProxy`, token utilities |

Both are dev-only — nothing here ships in the control's production bundle.

## Why

Every conforming control had a byte-identical `HarnessShell.tsx` + `usePersistedState.ts` and a
near-identical live-org proxy in its `vite.config.ts`, hand-copied per control. This package is
the single source of truth for that Tier-1 chrome and the dev-server token plumbing. Each control
keeps only its **Tier-2** `dev/harness/dataverse.ts` (its own entity/attribute fetch + mapping).

## `./shell` — the browser half

```tsx
// dev/main.tsx
import {
  HarnessShell,
  usePersistedState,
  type ThemeChoice,
  type DataSource,
} from "@dataverse-kit/pcf-dev-harness/shell";
import { App } from "../MyControl/components/App";

const Harness: React.FC = () => {
  const [width, setWidth] = usePersistedState("width", 640);
  // …wire the control's props + live binding, then render <App> inside the shell.
  return <HarnessShell title="My Control — dev harness" width={width} onWidthChange={setWidth} /* … */>
    <App /* …props… */ />
  </HarnessShell>;
};
```

The control's Tier-2 fetch layer builds on the shared HTTP helpers:

```ts
// dev/harness/dataverse.ts
import { apiFetch, toHttpError, type HttpError } from "@dataverse-kit/pcf-dev-harness/shell";

export async function fetchThing(setName: string): Promise<Thing[]> {
  const res = await apiFetch(`/api/data/v9.2/${setName}?$select=…`);
  if (!res.ok) throw await toHttpError(res); // one-shot 401/403 retry is built in
  // …shape the response into the control's plain props…
}
```

`apiFetch` retries once on a 401/403 after a short delay, so a token that just lapsed self-heals
against the auto-refreshing proxy below — no manual token re-run.

## `./node` — the dev-server half

```ts
// vite.config.ts
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import * as path from "path";
import { dataverseProxy } from "@dataverse-kit/pcf-dev-harness/node";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const live = dataverseProxy({
    dynamicsUrl: env.VITE_DYNAMICS_URL || "",
    tenant: env.DYNAMICS_TENANT,
    envFile: path.resolve(__dirname, ".env.local"),
  });
  return {
    root: "dev",
    envDir: __dirname, // .env.local lives at the repo root, not the `dev` root
    envPrefix: "VITE_DYNAMICS_URL", // keep the token OUT of the client bundle
    plugins: [react(), live.plugin],
    server: { port: 8182, strictPort: true, open: true, proxy: live.proxy },
  };
});
```

`dataverseProxy` mounts a same-origin `/api/data` proxy and, in the background, keeps a Dataverse
token warm by shelling out to the Azure CLI (`az account get-access-token`) — re-acquiring ~5 min
before expiry. The token lives only in the dev-server process; it is never inlined into the client
bundle or written to disk by the harness. When `dynamicsUrl` is empty the harness still boots in
pure-mock mode (the proxy + refresh loop are skipped).

### Options

| Option | Default | Notes |
| --- | --- | --- |
| `dynamicsUrl` | — | Org URL. Empty ⇒ mock-only boot. |
| `tenant` | `""` | `az --tenant` for CDX / cross-tenant orgs. |
| `envFile` | — | Path(s) to read the static `DYNAMICS_TOKEN` fallback from. |
| `prefer` | `true` | Send `Prefer: odata.include-annotations="*"`. Set `false` to omit. |
| `pluginName` | `"dataverse-live-token"` | Vite plugin name for the refresh loop. |
| `path` | `"/api/data"` | Same-origin mount path. |

## `pcf-dev-token` (optional fallback bin)

For offline / no-`az` use, the package ships a `pcf-dev-token` bin that writes a static
`DYNAMICS_TOKEN` + `VITE_DYNAMICS_URL` into `.env.local` (in the current directory):

```jsonc
// package.json
"scripts": {
  "dev": "vite --config vite.config.ts",
  "dev:token": "pcf-dev-token && npm run dev",
  "auth:token": "pcf-dev-token"
}
```

With a live `az login`, the in-process refresh handles tokens on its own — `npm run dev` is enough.

## Auth

The proxy uses the Azure CLI's own long-lived session. Sign in once:

```bash
az login
# CDX / temp org in a different tenant:
az login --tenant <tenant-id> --allow-no-subscriptions
```

## License

MIT
