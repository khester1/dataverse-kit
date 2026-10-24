// Maps a form-runtime FormDefinition to resolved surface-kit overlay props.
//
// IMPORTANT: do NOT import @dataverse-kit/form-runtime here — it's a cross-tree sibling.
// We duck-type the subset of its FormDefinition we read. Keep `FormDefinitionLike` in
// sync with the form-runtime form types (not published) —
// the __compat__/formDefinition.test-d.ts type test (run under typecheck:stories)
// fails to compile if the real schema drifts away from this shape.
import {
  dialogWidthPx,
  dialogHeightCss,
  panelKindFromWidth,
  panelCustomWidthPx,
  calloutWidthPx,
} from '../core/sizePresets';

/** The overlay FormTypes surface-kit knows how to resolve (form-runtime also has the tab-only 'related'/'audit'). */
export type SurfaceFormType = 'main' | 'dialog' | 'panel' | 'callout';

// Only the settings fields the adapter actually reads — keeping the duck-type minimal
// reduces the drift surface against form-runtime's (much larger) FormSettings.
export interface FormSettingsLike {
  width?: number;
  height?: number;
  panelType?: string;
}

export interface FormDefinitionLike {
  type?: SurfaceFormType;
  name?: string;
  settings?: FormSettingsLike;
}

export type ResolvedSurface =
  | { kind: 'main' }
  | { kind: 'dialog'; widthPx: number; heightCss: string; title?: string }
  | { kind: 'panel'; panelType: string; customWidthPx?: number; title?: string }
  | { kind: 'callout'; widthPx: number; title?: string };

/** Resolve a (duck-typed) form-runtime FormDefinition to the right surface + sizing props. */
export function fromFormDefinition(def: FormDefinitionLike): ResolvedSurface {
  const s = def.settings ?? {};
  switch (def.type) {
    case 'dialog':
      return {
        kind: 'dialog',
        widthPx: dialogWidthPx({ width: s.width }),
        heightCss: dialogHeightCss(s.height),
        title: def.name,
      };
    case 'panel': {
      const panelType = s.panelType ?? panelKindFromWidth(s.width);
      return {
        kind: 'panel',
        panelType,
        customWidthPx: panelType === 'custom' ? panelCustomWidthPx(s.width) : undefined,
        title: def.name,
      };
    }
    case 'callout':
      return { kind: 'callout', widthPx: calloutWidthPx(s.width), title: def.name };
    case 'main':
    default:
      return { kind: 'main' };
  }
}
