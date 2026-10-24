// Pure-TS sizing scalars for overlay surfaces. The SINGLE SOURCE of the numbers
// that both surface-kit's runtime overlays AND the export-engine codegen use, so a
// Dialog is 1200px wide in exactly one place. Framework-agnostic (no react/@fluentui).
//
// Values mirror export-engine/src/generators/FormCodeGenerator.ts (v8 branches):
//   dialog: default width 1200; height <=100 -> `${h}vh` else '95vh'
//   panel:  kind = (width ?? 480) > 500 ? 'medium' : 'custom'; custom width = width ?? 480
//   callout (form-type): default width 320; directionalHint 'bottomLeftEdge'
// v1c wires export-engine to import these; a byte-identical emission test guards drift.

// --- Dialog --------------------------------------------------------------------

export type DialogSizePreset = 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen';

// NOTE: only the lg = 1200 default and an explicit `width` are the shared-with-codegen
// contract (export-engine does `width ?? 1200`). The sm/md/xl/fullscreen presets are
// surface-kit runtime conveniences with no codegen counterpart — v1c does NOT consume them.
export const DIALOG_SIZE_PX = {
  sm: 600,
  md: 900,
  lg: 1200,
  xl: 1600,
} as const;

/** Resolved dialog width in px. Explicit `width` wins; else the preset (default lg = 1200, the codegen default). */
export function dialogWidthPx(opts: { width?: number; size?: DialogSizePreset } = {}): number {
  if (typeof opts.width === 'number') return opts.width;
  const size = opts.size ?? 'lg';
  // fullscreen is clamped by 95vw at the CSS layer; fall back to the largest preset for the px hint.
  if (size === 'fullscreen') return DIALOG_SIZE_PX.xl;
  return DIALOG_SIZE_PX[size];
}

/** Dialog width as a CSS value — '95vw' for the fullscreen preset (no explicit width), else `${px}px`. */
export function dialogWidthCss(opts: { width?: number; size?: DialogSizePreset } = {}): string {
  if (opts.size === 'fullscreen' && opts.width == null) return '95vw';
  return `${dialogWidthPx(opts)}px`;
}

/** Dialog height as a CSS value. <=100 is treated as a vh percentage; otherwise the 95vh cap (codegen rule). */
export function dialogHeightCss(height?: number): string {
  return height != null && height <= 100 ? `${height}vh` : '95vh';
}

/** Min width for an auto-sized ModalSurface (the "min 1000, auto" wide-modal pattern). */
export const MODAL_AUTOSIZE_MIN_WIDTH = 1000;

// --- Panel ---------------------------------------------------------------------

export type PanelKind = 'medium' | 'custom';
export const PANEL_DEFAULT_WIDTH = 480;

/** Codegen-parity panel kind: wide panels use Fluent `medium`, narrow ones `custom` + customWidth. */
export function panelKindFromWidth(width?: number): PanelKind {
  return (width ?? PANEL_DEFAULT_WIDTH) > 500 ? 'medium' : 'custom';
}

/** customWidth px for a `custom` panel. */
export function panelCustomWidthPx(width?: number): number {
  return width ?? PANEL_DEFAULT_WIDTH;
}

// --- Callout -------------------------------------------------------------------

export const CALLOUT_DEFAULT_WIDTH = 320;

/** Form-type callout defaults (the export-engine form-callout path emits width + directionalHint only). */
export const calloutFormDefaults = {
  width: CALLOUT_DEFAULT_WIDTH,
  directionalHint: 'bottomLeftEdge',
} as const;

export function calloutWidthPx(width?: number): number {
  return width ?? CALLOUT_DEFAULT_WIDTH;
}
