// @dataverse-kit/agent-kit/host — the provider chain a host needs, and nothing else.
//
// Separate entry so a PCF or custom-page host can import the wrapper without pulling the
// component barrel.
export { AgentKitHostProvider } from './AgentKitHostProvider';
export type { AgentKitHostProviderProps } from './AgentKitHostProvider';
export { nextAgentIdPrefix } from './idPrefix';
export { resolveHostTheme, createAgentTheme, createAgentDarkTheme, agentTheme, agentDarkTheme } from '../theme';
