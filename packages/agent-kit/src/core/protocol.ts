/**
 * The conversational seam.
 *
 * One interface, several providers, chosen by configuration — so WHICH model answers is a
 * config decision, not a rebuild. Generalises the cleanest streaming contract in the estate
 * (`@dataverse-kit/claude-bridge`'s `ClaudeTransport`) while keeping the four constraints
 * that an earlier `ILlmService` (a scan-verification console) established by
 * shipping into a regulated process:
 *
 * ★★ 1. THERE IS NO WRITE METHOD, AND THAT IS THE DESIGN.
 *       `send()` yields events and nothing else. There is no create, no update, no action,
 *       no tool invocation. A provider that wanted to write would have to change THIS file,
 *       which makes the guarantee reviewable in one place instead of trusted across a prompt.
 *       ★ Honest caveat: modelling `tool_call` events means the kit now renders agents that
 *         HAVE tools. It still cannot invoke one — the host runs the tool and feeds the
 *         outcome back as a `tool_result` — but the guarantee is now about the kit, not
 *         about the agent.
 *
 * ★★ 2. NO PROVIDER MAY TAKE A SECRET.
 *       A custom page, a static web app and a PCF control all run in the operator's browser,
 *       so anything handed to one is readable by the operator — an API key, a Direct Line
 *       secret, a client secret. Providers therefore take an ENDPOINT and let a server hold
 *       the credential. `AgentServiceConfig` has no field for a key, deliberately, and
 *       adding one would be the defect. A test asserts it.
 *
 * ★★ 3. NEITHER METHOD THROWS. Failures are DATA.
 *       A transport failure is a `turn_end` carrying a failure, so the UI shows a message
 *       instead of an unmounted tree.
 *
 * ★★ 4. THE HOST SUPPLIES THE GROUNDING; THE AGENT EXPLAINS IT.
 *       `AgentTurn.grounding` carries facts the host computed deterministically. The model
 *       must never be the thing that DERIVES them — a hallucinated identifier is worse than
 *       no answer. The same object feeds the grounding UI, so "what the model was told" and
 *       "what the screen showed" cannot drift.
 */

/** Who produced a message. `tool` is a tool RESULT, rendered distinctly from an assistant turn. */
export type AgentRole = 'user' | 'assistant' | 'system' | 'tool';

export interface AgentParticipant {
  id: string;
  displayName: string;
  kind: 'user' | 'agent' | 'system';
  initials?: string;
  imageUrl?: string;
}

export interface AgentAttachment {
  id: string;
  name: string;
  mediaType: string;
  sizeBytes?: number;
  url?: string;
  /** Inline content, mirroring ClaudeTransport's image shape. */
  base64?: string;
}

export interface AgentSource {
  id: string;
  title: string;
  kind: 'dataverse' | 'document' | 'web' | 'knowledge' | 'other';
  url?: string;
  snippet?: string;
  /** So a host can open the record. The kit never calls Xrm itself — it raises a callback. */
  entityLogicalName?: string;
  recordId?: string;
  /** 0..1, and ONLY when the retriever actually reported one. Absent means "not reported",
   *  which the UI must show as such rather than as zero confidence. */
  score?: number;
}

export interface AgentCitation {
  /** The marker as it appears in the text, e.g. `1` for `[1]`. */
  marker: string;
  sourceId: string;
  start?: number;
  end?: number;
}

export type ToolCallStatus = 'proposed' | 'running' | 'succeeded' | 'failed' | 'denied';

export interface AgentToolCall {
  id: string;
  name: string;
  /** RAW, exactly as the model emitted it. Never lossily pre-parsed: a half-streamed
   *  arguments blob is not valid JSON, and the approval UI must show what was actually
   *  proposed, not a reconstruction of it. */
  argumentsJson: string;
  status: ToolCallStatus;
  startedAt?: number;
  endedAt?: number;
  resultText?: string;
  failure?: AgentFailure;
  /** The kit RENDERS the request and raises onApprove/onDeny. The HOST runs the tool. */
  requiresApproval?: boolean;
}

/** Terminal outcomes. Six, not `{ok|error}`.
 *
 *  ★ `notProvisioned` is separated from `error` because with on-demand Azure an absent
 *    service is a NORMAL state; reporting it as a failure is what makes an app look broken.
 *    (`503 -> notProvisioned` — see runStatus.ts.)
 *  ★ `cancelled` is separated because the kit ships a stop button, and a user-initiated
 *    stop rendered as an error is a bug.
 *  ★ `blocked` (a content filter fired) and `refused` (the model declined) must look
 *    different on screen: they need different fixes. */
export type AgentRunStatus =
  | 'succeeded'
  | 'blocked'
  | 'refused'
  | 'error'
  | 'notProvisioned'
  | 'cancelled';

/** The single failure shape. There is deliberately no separate `AgentError`: `recoverable`
 *  (which drives retry affordances, carried from ClaudeTransport) lives here, and two
 *  overlapping error types would be two places to keep a status ladder honest. */
export interface AgentFailure {
  status: Exclude<AgentRunStatus, 'succeeded'>;
  /** Safe to display; providers sanitise. */
  message: string;
  /** e.g. 'content_filter' | 'not_provisioned' | 'rate_limited'. */
  code?: string;
  /** Drives retry affordances. Carried from ClaudeTransport's `recoverable`. */
  recoverable?: boolean;
  retryAfterMs?: number;
  correlationId?: string;
}

export interface AgentUsage {
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;
  costUsd?: number;
  durationMs?: number;
  model?: string;
}

export interface AgentMessage {
  id: string;
  role: AgentRole;
  authorId: string;
  text: string;
  createdAt: number;
  streaming?: boolean;
  /** Kept SEPARATE from `text` so it can be collapsed, withheld, or never announced. */
  thinking?: string;
  attachments?: AgentAttachment[];
  citations?: AgentCitation[];
  sources?: AgentSource[];
  toolCalls?: AgentToolCall[];
  failure?: AgentFailure;
  /** The provider WITHHELD a generated answer and substituted safe text. Reported so the UI
   *  can say so rather than passing the substitute off as the model's words. */
  guarded?: boolean;
  /** Attribute the answer; never imply authority. */
  provider?: string;
  usage?: AgentUsage;
  /** Host-defined. The kit never reads it. */
  meta?: Record<string, unknown>;
}

export interface AgentTurnResult {
  status: AgentRunStatus;
  /** The FULL assembled answer. This single property is what lets a non-streaming provider
   *  implement the seam with exactly two events (`turn_start`, `turn_end`) and still produce
   *  a complete message through the same reducer — no faked deltas. */
  text: string;
  guarded?: boolean;
  provider: string;
  model?: string;
  usage?: AgentUsage;
  failure?: AgentFailure;
  correlationId?: string;
}

/**
 * The stream protocol. Ordered, and terminated by EXACTLY ONE `turn_end`.
 *
 * ★ One terminal event, not Claude's `done | error` pair. Folding them into `turn_end` +
 *   `status` is what makes the reducer's switch total (the repo sets
 *   `noFallthroughCasesInSwitch`, so a new kind without a case is a free compile error) and
 *   what makes blocked / refused / notProvisioned / cancelled first-class outcomes rather
 *   than error-shaped ones.
 * ★ Every event carries `messageId`: two agents can share one stream (a chat turn and a
 *   background ops run), and the ops surfaces need to tell them apart.
 */
export type AgentEvent =
  | {
      type: 'turn_start';
      turnId: string;
      messageId: string;
      model?: string;
      provider?: string;
      sessionId?: string;
      correlationId?: string;
    }
  | { type: 'text_delta'; messageId: string; text: string }
  | { type: 'thinking_delta'; messageId: string; text: string }
  | { type: 'tool_call'; messageId: string; call: AgentToolCall }
  | {
      type: 'tool_result';
      messageId: string;
      callId: string;
      status: ToolCallStatus;
      resultText?: string;
      failure?: AgentFailure;
    }
  | { type: 'sources'; messageId: string; sources: AgentSource[] }
  | { type: 'citation'; messageId: string; citation: AgentCitation }
  | { type: 'suggestions'; messageId: string; prompts: string[] }
  /** Ephemeral chrome ("Searching Dataverse…"), never message content. */
  | { type: 'status'; messageId: string; label: string }
  | { type: 'turn_end'; turnId: string; messageId: string; result: AgentTurnResult };

export interface AgentTurn {
  text: string;
  history: readonly AgentMessage[];
  /** See constraint 4 at the top of this file. */
  grounding?: Record<string, unknown>;
  attachments?: AgentAttachment[];
  conversationId?: string;
  /** Implementations MUST honour this and terminate with `status: 'cancelled'`. */
  cancelSignal?: AbortSignal;
}

/** What a provider can do. Drives which affordances render AT ALL — a stop button over a
 *  provider that cannot cancel is a lie. */
export interface AgentCapabilities {
  streaming: boolean;
  tools: boolean;
  citations: boolean;
  attachments: boolean;
  cancel: boolean;
}

export interface AgentAvailability {
  available: boolean;
  /** Human-readable and shown in diagnostics. "Not licensed" and "not on this host" need
   *  different fixes, so they must not collapse to one boolean. */
  reason?: string;
  status?: AgentRunStatus;
  capabilities?: AgentCapabilities;
}

export interface IAgentService {
  /** Stable id, matching the configured provider name. */
  readonly name: string;
  /** Can this provider actually answer here? PROBED, never assumed. Never throws. */
  isAvailable(): Promise<AgentAvailability>;
  /** Ask. Yields in order, emits exactly one `turn_end`. Never throws. */
  send(turn: AgentTurn): AsyncIterable<AgentEvent>;
}

/** ★ `none` is the DEFAULT and must stay so: a kit dropped into an unwired host must not
 *  silently start talking to something. */
export type AgentProviderName = 'none' | 'mock' | 'custom';

export interface AgentServiceConfig {
  provider: AgentProviderName;
  /** Absolute https URL of a server that holds the credential and speaks to the real model.
   *  ★ There is no `apiKey` here on purpose — see constraint 2 at the top of this file. */
  endpoint?: string;
  /** Names WHICH agent answers. Not a credential, and safe in a control property. */
  agentId?: string;
  conversationId?: string;
  /** Escape hatch for a host-supplied implementation (`provider: 'custom'`). */
  factory?: () => IAgentService;
}
