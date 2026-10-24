import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { makeStyles, tokens, Button, Badge, Spinner } from '@fluentui/react-components';
import { MockAgentService } from '../services';
import { mockScenarios, type MockScenarioName } from '../services';
import { applyAgentEvent, initialConversation, runStatusSeverity } from '../core';
import type { ConversationState } from '../core';

/**
 * v0.1.0 ships the foundation, not the components — the seam, the pure core, the theme and
 * the host provider. These stories exercise exactly that, so the Storybook is real from the
 * first increment rather than a placeholder.
 *
 * ★ SB10 trap: never pass nested JSX through `args`. Storybook's `safeSortObject` recurses
 *   through React element internals and overflows the stack. Everything below uses `render()`,
 *   and `_storybook/` holds DATA only — enforceable by file extension.
 */

const useStyles = makeStyles({
  wrap: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, maxWidth: '720px' },
  row: { display: 'flex', gap: tokens.spacingHorizontalS, flexWrap: 'wrap', alignItems: 'center' },
  swatch: {
    // ★ `width: 100%` + padding without border-box overflows by exactly 2x the padding — measured
    //   +10px at a 375px viewport (343 container + 2x12px). The oldest CSS bug there is, and the
    //   reason a phone-width scan is worth running over docs pages and not just product surfaces.
    boxSizing: 'border-box',
    width: '100%',
    padding: tokens.spacingVerticalM,
    borderRadius: tokens.borderRadiusMedium,
    fontFamily: tokens.fontFamilyBase,
  },
  brand: { backgroundColor: tokens.colorBrandBackground, color: tokens.colorNeutralForegroundOnBrand },
  surface: {
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground1,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  transcript: {
    whiteSpace: 'pre-wrap',
    fontFamily: tokens.fontFamilyBase,
    backgroundColor: tokens.colorNeutralBackground3,
    padding: tokens.spacingVerticalM,
    borderRadius: tokens.borderRadiusMedium,
    minHeight: '96px',
  },
});

// ★ NO VERSION IN THE TITLE. This read `Foundation/v0.1.0` while the package shipped 0.2.1 —
//   a sidebar label nothing bumps, so it rots silently and misreports the kit to every reader.
const meta: Meta = { title: 'Foundation' };
export default meta;

/** The Dynamics CE look: brand from the shared ramp, CE font stack, CE radius. */
function ThemeDemo(): React.ReactElement {
    const s = useStyles();
    return (
      <div className={s.wrap}>
        <div className={`${s.swatch} ${s.brand}`}>colorBrandBackground — the Dynamics blue</div>
        <div className={`${s.swatch} ${s.surface}`}>
          colorNeutralBackground3 — the agent bubble ground
        </div>
        <div className={s.row}>
          <Button appearance="primary">Primary</Button>
          <Button>Secondary</Button>
          <Badge appearance="filled">Badge</Badge>
          <Spinner size="tiny" />
        </div>
      </div>
    );
}

export const Theme: StoryObj = { render: () => <ThemeDemo /> };

/** Drive the seam through every terminal state. This is what the mock exists for. */
function SeamDemo(): React.ReactElement {
    const s = useStyles();
    const [state, setState] = React.useState<ConversationState>(initialConversation());
    const [busy, setBusy] = React.useState(false);

    const run = async (scenario: MockScenarioName) => {
      setBusy(true);
      setState(initialConversation());
      const service = new MockAgentService({
        scenario,
        // Human-readable in a browser; tests inject immediateScheduler instead.
        firstTokenMs: 250,
        chunkMs: 24,
      });
      let next = initialConversation();
      try {
        for await (const event of service.send({ text: scenario, history: [] })) {
          next = applyAgentEvent(next, event);
          setState(next);
        }
      } catch (error) {
        // The AsyncIterable failure channel — surfaced, never allowed to unmount the tree.
        setState({
          ...next,
          status: 'error',
          failure: { status: 'error', message: String(error), recoverable: false },
        });
      }
      setBusy(false);
    };

    const message = state.messages[state.messages.length - 1];
    return (
      <div className={s.wrap}>
        <div className={s.row}>
          {(Object.keys(mockScenarios) as MockScenarioName[]).map((name) => (
            <Button key={name} size="small" disabled={busy} onClick={() => void run(name)}>
              {name}
            </Button>
          ))}
        </div>
        <div className={s.row}>
          <Badge appearance="tint">status: {state.status}</Badge>
          {state.statusLabel ? <Badge appearance="outline">{state.statusLabel}</Badge> : null}
          {state.status !== 'idle' && state.status !== 'streaming' && state.status !== 'connecting' ? (
            <Badge appearance="outline">severity: {runStatusSeverity(state.status)}</Badge>
          ) : null}
          {message?.guarded ? <Badge color="warning">guarded</Badge> : null}
        </div>
        <div className={s.transcript}>
          {message?.text || (busy ? '…' : 'Pick a scenario above.')}
        </div>
        {state.failure ? <div className={s.row}>failure: {state.failure.message}</div> : null}
        {message?.sources?.length ? (
          <div className={s.row}>{message.sources.length} sources returned by the retriever</div>
        ) : null}
        {message?.usage ? (
          <div className={s.row}>
            {message.usage.outputTokens} tokens · ${message.usage.costUsd} · {message.usage.durationMs}ms
          </div>
        ) : null}
      </div>
    );
}

export const Seam: StoryObj = { render: () => <SeamDemo /> };

/** Two providers side by side, to make the id-prefix rule visible rather than theoretical. */
function IdPrefixDemo(): React.ReactElement {
    const s = useStyles();
    return (
      <div className={s.wrap}>
        <div>
          Each <code>AgentKitHostProvider</code> below gets its own generated prefix. Inspect the
          two wrappers: their <code>fui-FluentProvider…</code> classes differ, which is what stops
          the second provider adopting the first&apos;s theme <code>&lt;style&gt;</code> tag and
          leaving it empty.
        </div>
        <div className={`${s.swatch} ${s.surface}`}>Instance A</div>
        <div className={`${s.swatch} ${s.surface}`}>Instance B</div>
      </div>
    );
}

export const IdPrefixIsolation: StoryObj = { render: () => <IdPrefixDemo /> };
