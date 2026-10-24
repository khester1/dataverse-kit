// Pure-TS responsive style-object builders. Every responsive stacking decision in
// surface-kit flows through here so viewport (`mode:'media'`) and container
// (`mode:'container'`) stacking share the same 480/768 cutoffs. The numeric values
// (gaps, minHeight, alignItems) mirror the export-engine fieldGrid/fieldRow/
// tabSectionsGrid emitters so the eventual emitMode:'surface-kit' rewrite is parity.
// Returned objects are structurally compatible with Fluent's `IStyle` (the `selectors`
// shape) but typed locally so this layer stays framework-agnostic (no @fluentui import).
import { BREAKPOINTS } from './breakpoints';
import { gridTemplateForColumns, type ColumnCount } from '../core/columns';

export type StyleObject = Record<string, unknown>;
export type ResponsiveMode = 'media' | 'container';

function atRule(mode: ResponsiveMode, maxPx: number): string {
  return mode === 'container'
    ? `@container (max-width: ${maxPx}px)`
    : `@media (max-width: ${maxPx}px)`;
}

/** N-column field grid that caps at 2 columns on tablet (<=768) and stacks to 1 on phone (<=480). */
export function fieldGridStyle(columns: ColumnCount, mode: ResponsiveMode = 'media'): StyleObject {
  const capped = Math.min(columns, 2) as ColumnCount;
  return {
    display: 'grid',
    gridTemplateColumns: gridTemplateForColumns(columns),
    gap: '4px 24px',
    selectors: {
      [atRule(mode, BREAKPOINTS.md)]: { gridTemplateColumns: gridTemplateForColumns(capped) },
      [atRule(mode, BREAKPOINTS.sm)]: { gridTemplateColumns: '1fr' },
    },
  };
}

/** Multi-section tab row that collapses straight to a single column on tablet (<=768). */
export function sectionStackingStyle(gridTemplateColumns: string, mode: ResponsiveMode = 'media'): StyleObject {
  return {
    display: 'grid',
    gridTemplateColumns,
    gap: 16,
    alignItems: 'start',
    selectors: {
      [atRule(mode, BREAKPOINTS.md)]: { gridTemplateColumns: '1fr' },
    },
  };
}

/** "Label : input" row that collapses the label above the input on phone (<=480). */
export function fieldRowStyle(labelWidth = '130px', mode: ResponsiveMode = 'media'): StyleObject {
  return {
    display: 'grid',
    gridTemplateColumns: `${labelWidth} 1fr`,
    alignItems: 'center',
    gap: 8,
    minHeight: 38,
    selectors: {
      [atRule(mode, BREAKPOINTS.sm)]: { gridTemplateColumns: '1fr', alignItems: 'flex-start', minHeight: 0, gap: 4 },
    },
  };
}
