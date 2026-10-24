/**
 * Turnkey CSV/JSON export for the v9 `<DataGrid>` (`V9GridProps.exportConfig`) — the v9
 * counterpart of v8 `DataGrid`'s export command (`../../hosts/DataGrid.tsx`), sharing its
 * `GridExportConfig` type, its scope rule, its command key and the Fluent-free `exportGrid`.
 *
 * ★ Imports `../../export/exportGrid` (the FILE), never `../../export` — that index also
 *   exports the Fluent v8 `GridExportDialog`, which would pull Fluent v8 into the v9 bundle.
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import type { TableRowId } from '@fluentui/react-components';
import { ArrowDownload20Regular, Code20Regular, DocumentTable20Regular } from '@fluentui/react-icons';
import { exportGrid } from '../../export/exportGrid';
import type { ColumnDef, GridExportConfig } from '../../types';
import type { GridToolbarLayout } from '../../core/toolbarCommands';
import type { V9GridCommand } from '../types';

/** The v8 command key, so a consumer's collision handling ports between skins. */
export const EXPORT_COMMAND_KEY = '__gridkit_export__';

const FORMAT_LABEL: Record<'csv' | 'json', string> = { csv: 'CSV', json: 'JSON' };
const FORMAT_ICON: Record<'csv' | 'json', React.ReactElement> = {
  csv: <DocumentTable20Regular />,
  json: <Code20Regular />,
};

function devWarn(message: string): void {
  if (typeof console !== 'undefined') console.warn(`[grid-kit/v9] ${message}`);
}

/**
 * Host-injected display columns are not data: grid-kit names them `__…` (`__nested`, the
 * "Related" trigger column NestedGrid appends). Exporting one would emit an empty column.
 */
export function exportableColumns<T>(columns: ColumnDef<T>[]): ColumnDef<T>[] {
  return columns.filter((c) => !c.key.startsWith('__'));
}

export interface V9ExportArgs<T> {
  exportConfig: GridExportConfig | undefined;
  items: T[];
  columns: ColumnDef<T>[];
  getRowId: (item: T) => TableRowId;
  /** Whether the grid renders a selection column at all. */
  selectable: boolean;
  /** The controlled selection (an extension owns it), read at click time. */
  controlledSelected?: ReadonlySet<TableRowId>;
  /** Initial selection Fluent re-applies on every mount of its grid. */
  initialSelectedKeys?: string[];
  /** Fluent's grid is unmounted while loading — its selection restarts from `initialSelectedKeys`. */
  isLoading?: boolean;
  layout: GridToolbarLayout;
}

/**
 * Returns the export command(s) to merge into the toolbar, plus the callback the host
 * must call from Fluent's `onSelectionChange` (uncontrolled selection only).
 *
 * Selection is held as KEYS and resolved against the CURRENT `items` at click time, so a
 * refreshed or shortened `items` can never export a stale row object or a removed row.
 */
export function useV9Export<T extends Record<string, unknown>>(args: V9ExportArgs<T>): {
  commands: V9GridCommand[];
  onUncontrolledSelection: (keys: ReadonlySet<TableRowId>) => void;
} {
  const { exportConfig, items, columns, getRowId, selectable, controlledSelected, initialSelectedKeys, isLoading, layout } = args;
  const selectedKeys = useRef<ReadonlySet<TableRowId>>(new Set(initialSelectedKeys ?? []));

  // ★ Fluent's grid unmounts while loading and, on remount, re-applies `defaultSelectedItems`
  //   WITHOUT firing onSelectionChange — so on THAT transition (loading → loaded) the keys must
  //   be re-seeded to what the user now SEES, or export sends the pre-load selection. Nothing
  //   else re-seeds: a `selectionMode` change does NOT remount Fluent (its selection state
  //   survives), and `initialSelectedKeys` is "applied once" — re-seeding on either exported
  //   rows the grid no longer showed as selected.
  const wasLoading = useRef(!!isLoading);
  useEffect(() => {
    if (wasLoading.current && !isLoading) selectedKeys.current = new Set(initialSelectedKeys ?? []);
    wasLoading.current = !!isLoading;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the loading transition re-seeds
  }, [isLoading]);

  const onUncontrolledSelection = useCallback((keys: ReadonlySet<TableRowId>) => {
    selectedKeys.current = new Set(keys);
  }, []);

  const enabled = !!exportConfig?.enabled;
  const scope = exportConfig?.scope;
  const dialog = !!exportConfig?.dialog;
  useEffect(() => {
    if (!enabled) return;
    if (dialog) devWarn('exportConfig.dialog is not supported on v9 yet — exporting directly instead.');
    if (scope === 'selected' && !selectable) {
      devWarn("exportConfig.scope 'selected' on a grid with no selection column never exports anything.");
    }
  }, [enabled, dialog, scope, selectable]);

  const doExport = useCallback(
    (format: 'csv' | 'json') => {
      // Controlled: the extension's set (its group checkbox never reaches Fluent's callback).
      // No public v9 host forwards exportConfig into a controlled grid today (GroupedGrid
      // ce's props carry none); this keeps the read right by construction if one does.
      const keys = controlledSelected ?? selectedKeys.current;
      const selected = selectable ? items.filter((it) => keys.has(getRowId(it))) : [];
      // The v8 scope rule, verbatim (`../../hosts/DataGrid.tsx`).
      const rows = scope === 'all' ? items : scope === 'selected' ? selected : selected.length > 0 ? selected : items;
      if (rows.length === 0) return;
      exportGrid(rows, exportableColumns(columns), format, exportConfig?.filename);
    },
    [controlledSelected, selectable, items, getRowId, scope, columns, exportConfig?.filename],
  );

  const formatsKey = (exportConfig?.formats ?? []).join(',');
  const commands = useMemo<V9GridCommand[]>(() => {
    if (!enabled) return [];
    const formats: Array<'csv' | 'json'> = formatsKey ? (formatsKey.split(',') as Array<'csv' | 'json'>) : ['csv', 'json'];
    // ★ `menuItems` is dynamics-layout only — the default toolbar renders a bare
    //   ToolbarButton and IGNORES it, so a menu there is a button that does nothing. The
    //   default layout gets one plain button per format instead.
    if (formats.length === 1) {
      return [{ key: EXPORT_COMMAND_KEY, text: 'Export', icon: <ArrowDownload20Regular />, onClick: () => doExport(formats[0]) }];
    }
    if (layout === 'dynamics') {
      return [
        {
          key: EXPORT_COMMAND_KEY,
          text: 'Export',
          icon: <ArrowDownload20Regular />,
          menuItems: formats.map((f) => ({ key: `${EXPORT_COMMAND_KEY}${f}`, text: FORMAT_LABEL[f], icon: FORMAT_ICON[f], onClick: () => doExport(f) })),
        },
      ];
    }
    return formats.map((f) => ({
      key: `${EXPORT_COMMAND_KEY}${f}`,
      text: `Export ${FORMAT_LABEL[f]}`,
      icon: FORMAT_ICON[f],
      onClick: () => doExport(f),
    }));
  }, [enabled, formatsKey, layout, doExport]);
  return { commands, onUncontrolledSelection };
}
