/**
 * `Xrm.Navigation.navigateTo` wrapper — open a record form, web resource, or
 * custom page from a grid. Loose-typed (NO `@types/xrm` dependency). On localhost
 * or when Xrm is unavailable (Storybook / tests / non-model-driven host) it logs a
 * no-op and resolves, so consumers can wire navigation unconditionally.
 *
 * Lives OUTSIDE src/core/ on purpose: it touches `window`/`Xrm` (a side-effectful
 * host concern), whereas core/ is v9-portable pure logic.
 */

/**
 * Xrm navigation options — controls HOW the target opens (loose-typed; no
 * `@types/xrm` dependency). Maps 1:1 to the `navigationOptions` arg of
 * `Xrm.Navigation.navigateTo`; omit it for the platform default (inline).
 */
export interface NavigationOptions {
  /** `1` = open inline (default); `2` = open as a dialog. */
  target?: 1 | 2;
  /** Dialog width — a number (px) or `{ value, unit }`. Only honored when `target: 2`. */
  width?: number | { value: number; unit: 'px' | '%' };
  /** Dialog height — a number (px) or `{ value, unit }`. Only honored when `target: 2`. */
  height?: number | { value: number; unit: 'px' | '%' };
  /** `1` = center the dialog (default); `2` = dock it to the side. */
  position?: 1 | 2;
  /** Dialog title text. */
  title?: string;
}

/**
 * A navigation target, discriminated by `pageType` (1:1 with Xrm pageInput names
 * so the mapping is a trivial switch).
 * - `entityrecord` — open a record form (omit `entityId` to open a create form).
 * - `webresource`  — open an HTML web resource (optional `data` query string).
 * - `custom`       — open a custom page (optionally bound to a record).
 *
 * Any variant may carry `navigationOptions` to control inline-vs-dialog / size /
 * title — so a `GridProps.navigateTo` resolver can request a dialog without the
 * cell-click and "Open" paths needing a separate options channel.
 */
export type NavTarget = (
  | { pageType: 'entityrecord'; entityName: string; entityId?: string }
  | { pageType: 'webresource'; webresourceName: string; data?: string }
  | { pageType: 'custom'; name: string; entityName?: string; entityId?: string }
) & { navigationOptions?: NavigationOptions };

/** Minimal Xrm shape — avoids a hard `@types/xrm` dependency. */
interface XrmLike {
  Navigation?: {
    navigateTo?: (pageInput: unknown, navigationOptions?: unknown) => Promise<unknown>;
  };
}

function getXrm(): XrmLike | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { Xrm?: XrmLike }).Xrm;
}

/** Mirror the ServiceFactory localhost check used across the kit. */
function isLocalhost(): boolean {
  if (typeof window === 'undefined' || !window.location) return false;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1';
}

/** Map a `NavTarget` → an Xrm `pageInput` object. */
function toPageInput(target: NavTarget): Record<string, unknown> {
  switch (target.pageType) {
    case 'entityrecord':
      return { pageType: 'entityrecord', entityName: target.entityName, entityId: target.entityId };
    case 'webresource':
      return { pageType: 'webresource', webresourceName: target.webresourceName, data: target.data };
    case 'custom':
      return { pageType: 'custom', name: target.name, entityName: target.entityName, recordId: target.entityId };
    default:
      return {};
  }
}

/**
 * Navigate to `target` via `Xrm.Navigation.navigateTo`. No-ops (console.log) on
 * localhost or when Xrm is unavailable. Always resolves (never throws) so a
 * cell-click handler can call it without a try/catch.
 *
 * The options the platform receives are the explicit `navigationOptions` arg if
 * given, else `target.navigationOptions` — so callers that only have a
 * `NavTarget` (cell-click synthesis, the "Open" command) still get dialog/size
 * control by attaching options to the target.
 */
export async function navigateToTarget(target: NavTarget, navigationOptions?: NavigationOptions): Promise<void> {
  const xrm = getXrm();
  const options = navigationOptions ?? target.navigationOptions;
  if (isLocalhost() || !xrm?.Navigation?.navigateTo) {
    // eslint-disable-next-line no-console
    if (typeof console !== 'undefined') {
      console.log('[grid-kit] navigateTo (no-op — localhost or no Xrm):', target, options);
    }
    return;
  }
  try {
    await xrm.Navigation.navigateTo(toPageInput(target), options);
  } catch (err) {
    // eslint-disable-next-line no-console
    if (typeof console !== 'undefined') console.error('[grid-kit] navigateTo failed:', err);
  }
}
