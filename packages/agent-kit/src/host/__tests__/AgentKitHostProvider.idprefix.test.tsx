import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AgentKitHostProvider } from '../AgentKitHostProvider';

/**
 * ★★★ THE ID-PREFIX GATE.
 *
 * React 18's `useId` restarts its counter per root. Put two Fluent v9 React roots on one
 * Dynamics form and both name their theme <style> tag `fui-FluentProviderr0`; the second
 * provider ADOPTS the first's tag and writes no rules into it, and whichever unmounts first
 * removes it unconditionally. The result is a <style> element with zero CSS rules —
 * invisible inside the form, because custom properties inherit, and fatal for anything
 * PORTALLED (menu listbox, tooltip, dialog, toaster) which mounts on document.body.
 *
 * ★ No dev harness can show this: a harness mounts ONE v9 root, so there is nothing to
 *   collide with. Two static renders are the cheapest instrument that can.
 *
 * ★ This gate has a subject only because `./host` SHIPS the wrapper. Against a README or a
 *   Storybook decorator, sabotaging it would sabotage the test's own fixture and prove
 *   nothing about anything in dist/.
 *
 * SABOTAGES, both watched failing:
 *   1. Delete the <IdPrefixProvider> wrapper in AgentKitHostProvider.tsx -> (2) and (3) fail.
 *   2. Replace nextAgentIdPrefix() with a CONSTANT string -> (2) fails.
 *      (A constant was a real candidate fix in the PCF gallery, and is wrong: two instances
 *      of THIS control on one form would then collide with each other.)
 */

/**
 * The THEMED provider class, e.g. `dvkak1-fui-FluentProviderR0`.
 *
 * ★ Measured, not assumed. FluentProvider emits THREE kinds of class on one element: a
 *   static marker `fui-FluentProvider`, the themed+prefixed `<prefix>fui-FluentProviderR0`,
 *   and griffel atoms. Only the middle one carries the prefix, so matching the whole
 *   attribute (or the bare marker) compares strings that are identical between instances
 *   and the gate proves nothing.
 */
const providerClass = (markup: string): string | undefined =>
  markup.match(/class="([^"]*)"/)?.[1]?.split(/\s+/).find((c) => /fui-FluentProviderR?\d+$/.test(c));

describe('AgentKitHostProvider id prefix', () => {
  it('(1) renders a FluentProvider at all', () => {
    // Non-vacuity. Without this, a markup string that never contained "fui-FluentProvider"
    // would make the difference assertion below pass by comparing undefined to undefined.
    const markup = renderToStaticMarkup(
      <AgentKitHostProvider>
        <span>x</span>
      </AgentKitHostProvider>,
    );
    expect(markup).toContain('fui-FluentProvider');
    expect(providerClass(markup)).toBeTruthy();
  });

  it('(2) gives two separate instances DIFFERENT provider classes', () => {
    const a = providerClass(
      renderToStaticMarkup(
        <AgentKitHostProvider>
          <span>a</span>
        </AgentKitHostProvider>,
      ),
    );
    const b = providerClass(
      renderToStaticMarkup(
        <AgentKitHostProvider>
          <span>b</span>
        </AgentKitHostProvider>,
      ),
    );
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    // Without IdPrefixProvider both are `fui-FluentProviderr0` and THIS is the line that fails.
    expect(a).not.toBe(b);
  });

  it('(3) namespaces the class with the kit prefix, not bare fui-', () => {
    const cls = providerClass(
      renderToStaticMarkup(
        <AgentKitHostProvider>
          <span>x</span>
        </AgentKitHostProvider>,
      ),
    );
    expect(cls).toMatch(/^dvkak\d+-fui-FluentProviderR?\d+$/);
    // Un-prefixed is exactly the collision state: every root would name its <style> tag
    // the same thing, the second adopts the first's and writes nothing into it.
    expect(cls?.startsWith('fui-')).toBe(false);
  });

  it('(4) honours an explicit prefix, so a test can pin one', () => {
    const markup = renderToStaticMarkup(
      <AgentKitHostProvider idPrefix="pinned-">
        <span>x</span>
      </AgentKitHostProvider>,
    );
    expect(providerClass(markup)).toMatch(/^pinned-fui-FluentProviderR?\d+$/);
  });
});
