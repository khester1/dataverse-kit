# @dataverse-kit/agent-kit

## 0.3.3

### Patch Changes

- Updated dependencies [f7b2fad]
- Updated dependencies [392b0e2]
  - @dataverse-kit/design-tokens@0.4.0
  - @dataverse-kit/fluent-theme@0.3.2
  - @dataverse-kit/surface-kit@0.5.2

## 0.3.2

### Patch Changes

- Updated dependencies [70cb582]
  - @dataverse-kit/design-tokens@0.3.0
  - @dataverse-kit/fluent-theme@0.3.1
  - @dataverse-kit/surface-kit@0.5.1

## 0.3.1

### Patch Changes

- Updated dependencies [a205df0]
- Updated dependencies [db23448]
- Updated dependencies [3e9c843]
- Updated dependencies [a205df0]
- Updated dependencies [39d0864]
- Updated dependencies [91a17c6]
- Updated dependencies [7db4a10]
- Updated dependencies [356bcbd]
  - @dataverse-kit/design-tokens@0.2.0
  - @dataverse-kit/fluent-theme@0.3.0
  - @dataverse-kit/surface-kit@0.5.0

## 0.3.0

### Minor Changes

- 6ff410c: `AssistantPanel` becomes a real drawer, and the launcher's icon is no longer squeezed to
  nothing.

  The panel gains `open` and `onDismiss`: a transform-based slide, Escape to dismiss, focus moved in
  on open and returned to whatever opened it on close, and — when closed — `visibility: hidden` plus
  `aria-hidden` so a translated-off panel is not still tabbable. `prefers-reduced-motion` is
  honoured, because a full-height panel crossing the viewport is exactly what that setting exists
  for.

  ★ It is deliberately NOT a focus trap. A docked drawer claims no modality — no `aria-modal`, no
  inert backdrop — so trapping focus would strand a keyboard user with no way out. A test pins that
  choice, so a future "improvement" that adds a trap goes red.

  ★ `AgentLauncher` fix: `flexShrink: 0` was on the label rather than the icon, so in a collapsed
  44px pill the unshrinkable label took the whole content box and the icon rendered at ZERO width —
  the rail showed two clipped letters instead of a glyph. The label now fades instead of relying on
  the clip, which also keeps it in the accessible name. Reported on a Chromatic review.

  New `useReturnFocus` hook on the a11y layer, distinct from `useFocusRestore`: one returns focus to
  an opener, the other rescues focus that has fallen to `<body>`.

- 9246461: A fifth surface family: the docked support surfaces.

  `AgentLauncher` — the edge-docked pills that expand on hover, as the M365 admin centre presents
  "Help & support" and "Give Feedback". `AssistantPanel` — the docked drawer: a small tab strip, an
  on/off switch, a pre-arrival status line, transcript-download and mute, with `MessageList` and
  `Composer` slotted into the body. `FeedbackPanel` — star rating, detail, a host attachment slot,
  and a required contact-consent choice.

  ★ All three are in-tree rather than Fluent `TabList`/`Menu`, and that is a measured decision:
  `ConversationHeader`'s single Fluent `Menu` costs **+185 KB and 2 `attrHandlers.set` calls** in a
  PCF bundle. For a two-tab strip and a five-star rating the APG patterns are small and the kit
  already owns `useRovingTabindex`. Verified: the family imports none of the factory-reaching Fluent
  components, so a host embedding only these needs no `targetDocument` isolation.

  ★ Two a11y contracts are pinned by test rather than left to review. The launcher's label is always
  in the DOM — collapsing is `max-width`, not a hover swap — so the button is named at every width.
  And `FeedbackPanel` treats `mayContact === undefined` as "not answered", distinct from `false`:
  submit stays disabled until both a rating and a consent answer exist, because recording a refusal
  the user never gave is worse than an incomplete form.

## 0.2.1

### Patch Changes

- bd676a3: The zero state's starter prompts are centred.

  `SuggestedPrompts` gains `align?: 'start' | 'center'` (default `'start'`), and `EmptyConversation`
  passes `'center'`. Reported on a Chromatic review of `Conversation: Empty`: the heading read as
  centred while the chips sat left of it.

  The two disagreed because they are aligned by different mechanisms — the heading is `width: 100%`
  and inherits the zero state's `text-align`, while the chips are flex children taking the row's
  `justify-content`, which defaulted to `flex-start`. Both are now set together.

  Scoped deliberately: the same component renders "Suggested follow-ups" above the composer, where
  left-packed is correct, so a global centring would have satisfied the report and broken the other
  caller in silence. A test pins each direction.

- 673f859: `Composer` now looks like the Teams send box.

  One rounded container holds a borderless field, the host's affordances and the send button behind
  a divider. Three real layout defects went with it: the field did not fill its flex wrapper, the
  keyboard hint rendered _beside_ the box instead of below it, and the send button sat outside the
  field entirely, adrift at the far right. The resize grip is gone.

  The hint is now visually hidden rather than deleted — Teams does not print it, but it is the only
  statement of the Enter/Shift+Enter contract a screen-reader user gets, so it stays on
  `aria-describedby` and is clipped, never `display:none`. Fluent's own focus indicator is
  suppressed and replaced by an `outline` on the container, so forced-colors still paints a ring.

  The kit ships no emoji, GIF or formatting pickers — those are host concerns and `toolbar` is the
  slot for them. The Conversation story demonstrates the shape with three.

## 0.2.0

### Minor Changes

- fb385e7: The conversation surface and the accessibility layer.

  Adds `MessageList`, `MessageBubble`, `MessageActions`, `Composer`, `StreamingText`,
  `TypingIndicator`, `SuggestedPrompts`, `EmptyConversation`, `SystemNotice` and `DayDivider`, plus
  `useConversation` / `useStickyScroll` and an `a11y` layer (`LiveAnnouncer`, `useFocusRestore`,
  `useRovingTabindex`).

  Two measured defects are carried forward as gates rather than comments. Autoscroll keys on message
  count, not content length — the original ChatPane defect queued a scroll per token, and the gate
  catches it at 201 calls instead of 1 — and adds the missing half: a reader who has scrolled up is
  not yanked back. The live region announces on a state transition, never per delta.

  The package also gains the first automated accessibility gate in either repo. It is a floor, not a
  ceiling: axe has no rule for an unlabelled `role="toolbar"` and does not report a dangling
  `aria-controls`, both verified by sabotage, so the hand-rolled ARIA is pinned by explicit
  structural and keyboard tests.

- fb385e7: Agent ops, and the component-catalog rows.

  `AgentStatusBadge`, `AvailabilityBanner`, `UsageMeter`, `ThrottleNotice`, `ModelBadge`,
  `AgentPicker`, `RunTimeline`, `RunHistoryPanel` and `AgentOpsPanel`. This completes the four
  surface families; what remains is host proof and retiring one of the existing chat
  implementations.

  The run ladder's six states each get their own words — a gate enumerates the union and requires
  the labels to be non-empty AND distinct, since six labels all reading "Error" would pass a
  non-empty check. `UsageMeter` renders "not reported" rather than 0, because a provider that
  reports no cost and one that cost nothing are different facts. `RunHistoryPanel` takes a `grid`
  slot instead of shipping a second grid: grid-kit/v9's DataGrid reaches tabster, so the host
  decides.

  The catalog rows also land here, which required making `fluentVersion` a declared column rather
  than deriving it from `subpath === './v9'`. agent-kit is Fluent v9 with no v9 subpath, so the
  derivation would have labelled all 42 entries v8 — invisible to the MCP server's v9 filter. The
  existing rows were backfilled with the value the old expression produced, leaving
  `component-index.json` byte-identical.

- fb385e7: New package `@dataverse-kit/agent-kit` — Fluent v9 conversational and agent surfaces for
  Dynamics 365. This release ships the foundation: the `IAgentService` seam plus `MockAgentService`,
  a framework-agnostic `./core` (message grouping, day dividers, the stream reducer, transport
  normalizers, citation renumbering, scroll rules, a six-state run ladder), the Dynamics CE v9 theme
  over the shared `@dataverse-kit/fluent-theme` ramp, and `AgentKitHostProvider` on `./host`.

  The kit ships no real transport: Foundry, Copilot Studio and broker adapters belong in the
  consuming app, because that is where credentials live. The seam has no write method and no
  `apiKey` field, and both are enforced by tests rather than by docstrings.

  Component families (conversation, grounding, action cards, Teams-like shell, agent ops) ship in
  this same release; the entries alongside this one describe them.

- fb385e7: Grounding and action/approval cards.

  Grounding: `CitationChip`, `CitationList`, `SourceCard`, `AnswerWithCitations`, `GroundingPanel`
  and `ProviderAttribution`. The citation list shows only the sources the answer actually cites — a
  retriever returns a dozen chunks for a two-citation answer, and listing all of them implies
  provenance the answer does not have. `ProviderAttribution` changes its visible wording when a
  provider withheld its answer, so a substituted safe response is never attributed to the model.

  Actions: `ActionCard`, `ApprovalCard`, `ToolCallCard`, `ParameterReview`, `ActionResult` and
  `ConfirmInline`. The kit renders a tool REQUEST and raises a callback; the host runs the tool.
  `ApprovalCard` cannot double-submit, gated with a two-field signature rather than a callback
  count.

  Both families are built on an in-tree `CardSurface`, because Fluent's `Card` calls
  `useFocusableGroup()` unconditionally and reaches `attrHandlers.set` — the canonical grep in the
  PCF standard misses it. `ConfirmInline` replaces Fluent's `Dialog` and fixes three defects in the
  gallery precedent it copies: it returns focus to the trigger on close, traps focus, and declares
  `aria-modal`. All gated and watched failing.

- fb385e7: The Teams-like shell.

  `AgentAppShell` (rail | list | thread | detail pane), `AppRail`, `ConversationList`,
  `ConversationListItem`, `ConversationHeader`, `RightPane`, `GlobalSearchBar` and `AgentAvatar`.

  The shell measures its CONTAINER rather than the viewport — a PCF control or custom page occupies
  a pane, not a window — and takes breakpoints from `@dataverse-kit/surface-kit/v9` rather than
  redeclaring them. A `containerWidth` prop mirrors `FormSurface.containerWidth` so a host can pass
  `context.allocatedWidth` directly.

  The conversation list is a listbox with `aria-activedescendant`: one tab stop rather than N, with
  unread count and presence in each row's accessible name rather than only in a badge and a colour.
  It is deliberately flat — a chat list, not a teams/channels tree — and that decision is recorded.

  `AppRail`'s overflow and `ConversationHeader`'s tab strip use Fluent's real `Menu` and `TabList`.
  A new declared-set manifest test asserts exactly which components reach tabster and from which
  files, in both directions, so neither drift nor a stale entry can pass unnoticed.

### Patch Changes

- Updated dependencies [fb385e7]
  - @dataverse-kit/fluent-theme@0.2.0
  - @dataverse-kit/surface-kit@0.4.1
