/**
 * Framework-agnostic toolbar-command helpers, shared by the v8 and v9 `GridToolbar`.
 *
 * Deliberately STRUCTURAL: the helpers take any command carrying the fields they
 * read, and import neither `../types` (v8) nor `../v9/types`. The export-engine
 * vendors `src/core/**` into generated projects but NOT `src/v9/**`, so a v9 type
 * import here would ship a vendored file pointing at a path that does not exist.
 * Keep this file free of React, Fluent and any skin's types (and TS 4.9-safe — it
 * compiles inside CRA web-resource projects).
 */

/** Toolbar layout. `default` is the historical grid-kit bar; `dynamics` mimics the
 *  model-driven subgrid command bar (title left, commands right, `⋮` overflow). */
export type GridToolbarLayout = 'default' | 'dynamics';

/** Where a command sits: inline (collapsing into `⋮` when space runs out), or always in `⋮`. */
export type GridCommandPosition = 'primary' | 'overflow';

/** What happens to a command whose selection bounds are not met. */
export type SelectionGatingMode = 'hide' | 'disable';

/** The fields the gating helper reads — both `GridCommand` and `V9GridCommand` satisfy it. */
export interface GateableCommand {
  minSelectionCount?: number;
  maxSelectionCount?: number;
  disabled?: boolean;
}

/** The field the partition helper reads. */
export interface PositionedCommand {
  position?: GridCommandPosition;
}

/**
 * Apply `minSelectionCount` / `maxSelectionCount` against the current selection.
 *
 * `count === undefined` means the consumer is not tracking selection, and gating is
 * a strict no-op — the SAME array comes back. Never default a missing count to 0 at
 * a call site: that would silently hide every gated command.
 *
 * `hide` drops out-of-bounds commands (what Dynamics does, and what the export-engine
 * emitter does); `disable` keeps them, OR-ing with the command's own `disabled`.
 */
export function gateCommands<C extends GateableCommand>(
  commands: C[],
  count: number | undefined,
  mode: SelectionGatingMode = 'hide',
): C[] {
  if (count === undefined) return commands;
  const inBounds = (c: C): boolean =>
    (c.minSelectionCount === undefined || count >= c.minSelectionCount) &&
    (c.maxSelectionCount === undefined || count <= c.maxSelectionCount);
  if (mode === 'hide') return commands.filter(inBounds);
  return commands.map((c) => (inBounds(c) ? c : { ...c, disabled: true }));
}

/** Split commands into the inline set (auto-collapsing) and the always-in-`⋮` set, order kept. */
export function partitionCommands<C extends PositionedCommand>(
  commands: C[],
): { inline: C[]; pinnedOverflow: C[] } {
  const inline: C[] = [];
  const pinnedOverflow: C[] = [];
  for (const c of commands) (c.position === 'overflow' ? pinnedOverflow : inline).push(c);
  return { inline, pinnedOverflow };
}

/**
 * Merge a host's injected commands (export / open / columns / filters) with the
 * consumer's. The default layout keeps its historical order — injected first. The
 * dynamics layout puts the consumer's commands first: the bar is right-aligned and
 * collapses from the END, so the injected utilities are the first to fold into `⋮`
 * (Dynamics likewise keeps record commands leftmost and utilities last).
 */
export function mergeToolbarCommands<C>(
  consumer: C[],
  injected: C[],
  layout: GridToolbarLayout = 'default',
): C[] {
  return layout === 'dynamics' ? [...consumer, ...injected] : [...injected, ...consumer];
}

/** The subset of a toolbar config the misuse check reads (both skins satisfy it). */
export interface DynamicsOnlyConfig {
  layout?: GridToolbarLayout;
  title?: string;
  iconOnly?: boolean;
  commands?: Array<{ iconOnly?: boolean; position?: GridCommandPosition; menuItems?: unknown }>;
}

/**
 * Names of dynamics-only fields set on a config that is NOT `layout: 'dynamics'`.
 * Those fields are ignored in the default layout (which must render exactly as it
 * always has); the skins warn once when this is non-empty so the mistake is visible.
 */
export function dynamicsOnlyFieldsUsed(config: DynamicsOnlyConfig): string[] {
  if (config.layout === 'dynamics') return [];
  const used: string[] = [];
  if (config.title !== undefined) used.push('title');
  if (config.iconOnly !== undefined) used.push('iconOnly');
  const cmds = config.commands ?? [];
  if (cmds.some((c) => c.iconOnly !== undefined)) used.push('commands[].iconOnly');
  if (cmds.some((c) => c.position !== undefined)) used.push('commands[].position');
  if (cmds.some((c) => c.menuItems !== undefined)) used.push('commands[].menuItems');
  return used;
}
