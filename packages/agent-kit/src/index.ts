// @dataverse-kit/agent-kit — Fluent UI v9 conversational and agent surfaces for Dynamics 365.
//
// FIVE surface families: conversation + accessibility layer, grounding, action cards, the
// Teams-like shell, agent ops, and the docked support surfaces. Host proof is done — measured on a
// live Dynamics form, 20 mount/unmount cycles left the platform's tabster 8.2.0 untouched
// (SWA -> custom page -> PCF) and retiring one of the existing chat implementations.
//
// ★ No component in this package renders a FluentProvider. The host owns the provider chain;
//   `AgentKitHostProvider` (also on the `./host` subpath) is an opt-in wrapper for hosts that
//   do not already have one.

// The conversation surface.
export * from './conversation';

// Agent ops: availability, which agent, what it has done, what it cost.
export * from './ops';

// The docked support surfaces: edge launcher, assistant drawer, feedback capture.
// ★ All three are in-tree rather than Fluent TabList/Menu — measured, one Fluent Menu costs
//   +185 KB and 2 attrHandlers.set calls in a PCF bundle, and these ARIA patterns are small.
export * from './support';

// The Teams-like shell: rail | list | conversation | detail pane.
export * from './shell';

// Grounding: the surfaces that make an answer accountable.
export * from './grounding';

// Action / approval cards: a tool REQUEST rendered for a human. The kit never runs the tool.
export * from './actions';

// The accessibility layer. Exported because a consumer composing its own surface needs the
// same primitives — a live region fed on transitions, focus restoration, a roving tabindex.
export * from './a11y';

// Hooks: the effectful half of the conversation (the pure half is ./core).
export * from './hooks';

export { AgentKitHostProvider } from './host/AgentKitHostProvider';
export type { AgentKitHostProviderProps } from './host/AgentKitHostProvider';
export { nextAgentIdPrefix } from './host/idPrefix';

export {
  createAgentTheme,
  createAgentDarkTheme,
  agentTheme,
  agentDarkTheme,
  resolveHostTheme,
} from './theme';
export type { ResolveHostThemeInput } from './theme';

// The seam and the fake, also available React-free on ./services.
export {
  MockAgentService,
  NullAgentService,
  createAgentService,
  decide,
  mockScenarios,
  realScheduler,
  immediateScheduler,
} from './services';
export type {
  MockAgentServiceOptions,
  MockScenario,
  MockScenarioName,
  Scheduler,
} from './services';

// The protocol + pure helpers, also available React-free on ./core.
export * from './core';
