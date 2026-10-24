import { createIdPrefixCounter } from '../core/ids';

/**
 * ★★★ ONE counter per bundle. This module-level singleton is the whole mechanism.
 *
 * React 18's `useId` restarts its counter per root. Put two Fluent v9 React roots on one
 * Dynamics form and both name their theme `<style>` tag `fui-FluentProviderr0`; the second
 * provider ADOPTS the first's tag and writes no rules into it, and whichever unmounts first
 * `.remove()`s it unconditionally. The result is a `<style>` with zero CSS rules — invisible
 * inside the form, because custom properties inherit, and fatal for anything PORTALLED
 * (menu listbox, tooltip, dialog, toaster), which mounts on `document.body` and renders
 * untheméd.
 *
 * ★ A CONSTANT prefix does not fix it: two instances of THIS control on one form would
 *   collide with each other. Measured in the gallery, where a constant prefix was a real
 *   candidate fix and was wrong.
 * ★ No dev harness can show this — a harness mounts one v9 root, so there is nothing to
 *   collide with. The gate is a unit test: two renders, assert the provider classes differ.
 */
export const nextAgentIdPrefix = createIdPrefixCounter('dvkak');
