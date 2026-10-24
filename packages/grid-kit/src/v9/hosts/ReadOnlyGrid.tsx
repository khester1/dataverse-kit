import React from 'react';
import type { V9ReadOnlyGridProps } from '../types';
import { DataGrid } from './DataGrid';

/**
 * v9 read-only grid: the flat `<DataGrid>` with selection forced off — a
 * presentation preset that mirrors the Grid Customizer "Read-Only Grid" type.
 * The `toolbar` is still forwarded so a read-only grid can host non-selection
 * actions (Refresh / Open). (Editing is not part of this v9 increment.)
 */
export function ReadOnlyGrid<T extends Record<string, unknown>>(props: V9ReadOnlyGridProps<T>): JSX.Element {
  return <DataGrid<T> {...props} selectionMode="none" onSelectionChanged={undefined} />;
}
