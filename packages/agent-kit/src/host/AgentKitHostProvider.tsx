import * as React from 'react';
import { FluentProvider, IdPrefixProvider, type Theme } from '@fluentui/react-components';
import { resolveHostTheme } from '../theme';
import { nextAgentIdPrefix } from './idPrefix';

export interface AgentKitHostProviderProps {
  children?: React.ReactNode;
  /** An explicit theme wins over everything. */
  theme?: Theme;
  /** The Dynamics host's theme — `context.fluentDesignLanguage?.tokenTheme` in a PCF. */
  hostTheme?: Theme;
  isDarkTheme?: boolean;
  /**
   * The document Fluent should treat as its own.
   *
   * ★★ THIS IS THE PCF ESCAPE HATCH, and it is why it is a prop rather than something the
   *    kit decides. Fluent v9's tabster is a per-WINDOW singleton: `createTabster` returns
   *    `win.__tabsterInstance` if one exists. A Dynamics form installs tabster 8.2.0, whose
   *    core has no `attrHandlers`, while a bundled control ships 8.8.x — so the moment a
   *    component reaches a `get*` factory (`TabList` -> `useArrowNavigationGroup` -> `getMover`),
   *    `core.attrHandlers.set` throws and React unmounts the whole tree.
   *
   *    `useTabster` reads `targetDocument` from Fluent's context and hands
   *    `targetDocument.defaultView` to `createTabster`. So a host that passes a proxied
   *    document with a private `__tabsterInstance` slot gets its own core, and everything
   *    below inherits it — with no change to any agent-kit component.
   *
   *    The proxy itself is NOT shipped here; it lives with the PCF gallery
   *    (`controls/_shared/tabsterIsolation.ts`). A host writes one line:
   *      `targetDocument={createIsolatedTargetDocument(document)}`
   *
   *    ★ It isolates tabster and portal mount nodes, NOT Griffel: `FluentProvider` consumes
   *      the ambient Griffel renderer rather than building one from this prop. That is
   *      harmless for the proxy case (styles land in the real <head> either way) but means
   *      this prop alone does NOT make the kit work in a separate document or shadow root —
   *      that additionally needs `<RendererProvider renderer={createDOMRenderer(doc)}>`.
   */
  targetDocument?: Document;
  /** Override the generated prefix. Only for tests that need a stable value. */
  idPrefix?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * The host wrapper: `IdPrefixProvider` ▸ `FluentProvider` ▸ children.
 *
 * ★ No agent-kit COMPONENT renders a provider — that is surface-kit's convention and this
 *   kit keeps it, so a host that already has a `FluentProvider` is not given a second one.
 *   This is an opt-in export for hosts that do not, and it exists for a second reason: a
 *   rule that lives only in a README is a rule nothing can test. Shipping the wrapper gives
 *   the IdPrefix gate a subject inside `src/`, so its sabotage lands on real code instead of
 *   on the test's own fixture.
 *
 * ★ Ordering is load-bearing: `IdPrefixProvider` must be OUTSIDE `FluentProvider`, because
 *   the provider reads the prefix while generating the id for its own theme <style> tag.
 */
export function AgentKitHostProvider(props: AgentKitHostProviderProps): React.ReactElement {
  const { children, theme, hostTheme, isDarkTheme, targetDocument, className, style } = props;

  // Generated ONCE per mounted instance — not per render, and not shared across instances.
  const [generated] = React.useState(nextAgentIdPrefix);
  const idPrefix = props.idPrefix ?? generated;

  const resolved = React.useMemo(
    () => resolveHostTheme({ theme, hostTheme, isDarkTheme }),
    [theme, hostTheme, isDarkTheme],
  );

  return (
    <IdPrefixProvider value={idPrefix}>
      <FluentProvider
        theme={resolved}
        targetDocument={targetDocument}
        className={className}
        style={style}
      >
        {children}
      </FluentProvider>
    </IdPrefixProvider>
  );
}
