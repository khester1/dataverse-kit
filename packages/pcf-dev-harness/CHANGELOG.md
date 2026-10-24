# @dataverse-kit/pcf-dev-harness

## 0.2.0

### Minor Changes

- d1c404b: Widen the `react` / `react-dom` peer range to `>=16.14.0 <19` (was `^18.2.0`).

  React-16 controls could not install this package at all.
  `create-dynamics-app --artifact pcf-field` pins `react@^16.14.0` (a `control-type="standard"`
  control that must also run in the canvas runtime, which serves 16.14.0), and `installDependencies`
  runs a bare `npm install` — so scaffolding a field control with the dev harness hit a hard
  `ERESOLVE` for end users, not just in CI.

  The shell is genuinely React-16-safe, so this is a correctness fix rather than a loosened
  constraint: `HarnessShell` / `usePersistedState` use only `useState`, `FC`, `ReactNode`,
  `Dispatch`, `SetStateAction` and `CSSProperties`, all of which exist in `@types/react@16.14`.
  Nothing in the public surface depends on a React 17+ API.

  Non-breaking for existing React 18 consumers — the range only widens downward.

## 0.1.0

### Minor Changes

- 662d3ac: Add `@dataverse-kit/pcf-dev-harness` — the shared PCF dev harness extracted from the
  gallery controls. A control-agnostic `./shell` (the sandbox-style `HarnessShell`,
  `usePersistedState`, and the `apiFetch`/`HttpError` HTTP helpers) plus a Node `./node`
  (`dataverseProxy` — a Vite dev-server proxy that streams real Dataverse data with an
  auto-refreshed, server-side Azure-CLI token). Replaces the per-control hand-copied harness shell +
  proxy.
