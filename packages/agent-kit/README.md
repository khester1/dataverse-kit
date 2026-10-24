# @dataverse-kit/agent-kit

Fluent UI **v9** conversational and agent surfaces for Dynamics 365 — styled as Dynamics CE,
hostable in a custom page, a static web app, or a PCF control.

> The kit is feature-complete for the four surface families — **grounding**, **action/approval
> cards**, the **Teams-like shell** and **agent ops** (availability, agent picker, run history,
> traces, usage) — over the base **conversation surface**. Host proof is done: measured on a live
> Dynamics form, 20 mount/unmount cycles left the platform's tabster 8.2.0 untouched
> (`spikes/agent-kit-host-proof` in the workspace repo). `apps/foundry-manager` runs on the kit and
> its two hand-rolled chat components are deleted.

```bash
npm install @dataverse-kit/agent-kit @fluentui/react-components @fluentui/react-icons
```

```tsx
import {
  AgentKitHostProvider, MessageList, Composer, SystemNotice,
  useConversation, MockAgentService,
} from '@dataverse-kit/agent-kit';

function Chat() {
  const service = React.useMemo(() => new MockAgentService({ scenario: 'grounded' }), []);
  const { state, announcement, busy, send, cancel } = useConversation({ service });
  const [draft, setDraft] = React.useState('');

  return (
    <AgentKitHostProvider>
      <MessageList
        messages={state.messages}
        announcement={announcement}
        busy={busy}
        onCopy={() => {}}
      />
      <SystemNotice failure={state.failure} />
      <Composer
        value={draft}
        onChange={setDraft}
        onSend={(text) => { setDraft(''); void send(text); }}
        onStop={cancel}
        busy={busy}
      />
    </AgentKitHostProvider>
  );
}
```

Swap `MockAgentService` for your own `IAgentService` and nothing else changes.

## Entry points

| Subpath | Contents | React? |
|---|---|---|
| `.` | everything | yes |
| `./core` | grouping, day dividers, the stream reducer, transport normalizers, citation renumbering, scroll rules, the run-status ladder | **no** |
| `./services` | `IAgentService`, `MockAgentService`, `NullAgentService`, the provider factory | **no** |
| `./host` | `AgentKitHostProvider` — `IdPrefixProvider` ▸ `FluentProvider` ▸ `targetDocument` | yes |

`./core` and `./services` are framework-agnostic *by gate*, not by convention, so a transport
adapter can share them with an Azure Function, a web worker or a Node broker.

### ★ Your tsconfig must resolve `exports` — or three of these four subpaths do not exist

Those subpaths are published **only** through the package's `exports` map. TypeScript's classic
`moduleResolution: "node"` (Node10) ignores `exports` entirely and can resolve a subpath only if it
happens to be a real directory on disk — which these are not. Under it you get:

```
TS2307: Cannot find module '@dataverse-kit/agent-kit/host' or its corresponding type declarations.
```

```jsonc
{
  "compilerOptions": {
    "moduleResolution": "bundler",  // or "node16" / "nodenext"
    "module": "esnext"              // "bundler" requires an esnext-style module setting
  }
}
```

★★ **This bites PCF controls specifically, and it is not a mistake in your code.**
`pcf-scripts/tsconfig_base.json` ships `moduleResolution: "node"`, so a control scaffolded with
`pac pcf init` fails on the import above until you override it. MEASURED on a fresh scaffold,
2026-09-25. The shipped gallery controls already carry the same pair.
★ And put any explanatory comment key at the **top level** of `tsconfig.json`, never inside
`compilerOptions` — there it is `TS5023: Unknown compiler option`, and `pcf-scripts` reports that
failure **while exiting 0**.

★★★ **`pac pcf push` cannot deploy a control that uses this kit.** It always builds **Debug** (there
is no build-mode flag) — measured **9,975,780 bytes** against **772,001** for the same control in
production — and Dataverse rejects it with *"Webresource content size is too big"*. Use the Release
solution path instead:

```bash
npm run build -- --buildMode production
cd solution && dotnet build -c Release      # ~203 KB solution.zip
pac solution import --path bin/Release/solution.zip --publish-changes
```

## The seam

The kit ships **no real transport**. It defines one interface and one fake:

```ts
interface IAgentService {
  readonly name: string;
  isAvailable(): Promise<AgentAvailability>;         // probed, never assumed; never throws
  send(turn: AgentTurn): AsyncIterable<AgentEvent>;  // ordered; exactly one turn_end
}
```

Four properties are deliberate and gated:

- **No write method.** `send()` yields events and nothing else — the kit renders a tool *request*
  and raises a callback; the host runs the tool.
- **No `apiKey` field anywhere.** A browser control cannot keep a secret, so providers take an
  endpoint and a server holds the credential.
- **Failures are data.** Neither method throws; a transport failure arrives as a `turn_end`.
- **Six terminal states, not two.** `succeeded | blocked | refused | error | notProvisioned |
  cancelled`. `503 → notProvisioned`, because with on-demand Azure an absent service is a normal
  state and reporting it as a failure makes the app look broken.

`MockAgentService` can reach every one of them (plus mid-stream tool calls, citations, abort and a
throwing transport), so Storybook can show each state and tests can assert it.

## Hosting

The kit renders no provider, so a host that already has one is not given a second. For hosts that
do not, `AgentKitHostProvider` supplies the chain — and in a **PCF control** it is also where the
tabster fix goes:

```tsx
<AgentKitHostProvider
  hostTheme={context.fluentDesignLanguage?.tokenTheme}
  targetDocument={createIsolatedTargetDocument(document)}
/>
```

Fluent v9's tabster is a per-window singleton; a Dynamics form's copy predates the `attrHandlers`
API, so a bundled control that reaches it throws and unmounts. Passing an isolated
`targetDocument` gives the control its own tabster core, and every child inherits it. See
`CLAUDE.md` for the measured hook-level detail.

## Agent ops

`AgentOpsPanel` composes availability, the agent picker and run history. The run ladder has six
states, each with its own words — a content filter, the model declining, an unconfigured
environment and a user-cancelled run need different reactions, and `AgentStatusBadge` never
collapses them into one label or into a colour. `UsageMeter` distinguishes "not reported" from
zero. `RunHistoryPanel` takes a `grid` slot so a host that already has `grid-kit/v9` passes it in
rather than getting a second, worse grid.

## The shell

`AgentAppShell` is the Teams-like frame — rail │ conversation list │ thread │ detail pane —
composed from `AppRail`, `ConversationList`, `ConversationHeader` and `RightPane`. It measures its
**container**, not the viewport, because a PCF control or custom page occupies a pane; pass
`containerWidth` (a PCF's `context.allocatedWidth`) to skip measurement entirely. Breakpoints come
from `@dataverse-kit/surface-kit/v9` rather than being redeclared.

The conversation list is a **listbox**: one tab stop, Up/Down/Home/End, `aria-selected`, and unread
count and presence carried in each row's accessible name rather than only in a badge and a colour.

## Grounding, and why the citation list is short

`CitationList` shows only the sources the answer actually cites — a retriever commonly returns a
dozen chunks for a two-citation answer, and listing all twelve implies provenance the answer does
not have. `SourceCard` distinguishes "relevance not reported" from a score of zero.
`ProviderAttribution` changes its visible wording when a provider **withheld** its answer, so a
substituted safe response is never attributed to the model as if it were the model's words.
`GroundingPanel` renders the same object the turn carried, so what the model was told and what the
screen shows cannot drift.

## Action cards — the kit never runs the tool

`ApprovalCard` renders a tool *request* and raises `onApprove` / `onDeny`; the host executes and
feeds the outcome back as a `tool_result` event. The card cannot double-submit, and `ConfirmInline`
— the in-tree replacement for Fluent's `Dialog` — traps focus, returns it to the trigger on close
and declares `aria-modal`, three things the gallery precedent it is modelled on does not do.

## Accessibility

The conversation surface is built to a stated contract, each rule with a test behind it:

- The transcript is **not** a live region. One polite region announces the settled answer, on a
  state transition — never per token, which would make a screen reader re-read the growing
  string and never finish. Failures go to an assertive region.
- Every message names its author in the accessible tree, **including grouped continuations**
  where the name is visually suppressed.
- Hover actions are revealed on hover **or focus**, as a `role="toolbar"` with a roving
  tabindex — one tab stop per message, not one per action.
- Focus is restored when a focused node is removed, and a streaming answer keeps a stable
  element identity so focus survives it.

`axe` runs over every component, but it is a floor: measured, it has no rule for an unlabelled
toolbar and does not report a dangling `aria-controls`. The hand-rolled ARIA is pinned by explicit
structural and keyboard tests instead. See `CLAUDE.md`.

## Theming

`createAgentTheme()` builds on the shared `@dataverse-kit/fluent-theme` ramp (the same Dynamics
blue grid-kit/v9 and surface-kit/v9 use) and adds the CE font stack and corner radius.
`resolveHostTheme()` is the precedence ladder: explicit theme → host theme → Dynamics light/dark.
The fallback is the **Dynamics** theme, not stock Fluent — a standalone SWA has no host theme, and
stock Fluent does not read as CE.
