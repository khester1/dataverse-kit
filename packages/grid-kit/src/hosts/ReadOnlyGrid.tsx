import React from 'react';
import type { ReadOnlyGridProps } from '../types';
import { DataGrid } from './DataGrid';

/**
 * Read-only grid: `<DataGrid>` with selection off and editing off. Mirrors the
 * Grid Customizer's "Read-Only Grid" type — a presentation preset.
 *
 * The full `toolbar` config is forwarded (including `commands`) so a read-only
 * grid can still host non-selection toolbar actions — New / Refresh / Export and
 * the injected Filter / Columns. Selection-DEPENDENT commands (delete/activate)
 * are inert here because `selectionMode` is forced to `"none"` (nothing can be
 * selected); the consumer is expected to omit them. Previously this preset
 * stripped `commands` entirely (search-only); forwarding them is what lets the
 * read-only bar consolidate into a single host toolbar instead of an external one.
 */
export function ReadOnlyGrid<T extends Record<string, unknown>>(props: ReadOnlyGridProps<T>): JSX.Element {
  return <DataGrid<T> {...props} selectionMode="none" editable={false} />;
}
