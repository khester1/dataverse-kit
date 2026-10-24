import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChoiceGroup,
  Checkbox,
  DefaultButton,
  Dialog,
  DialogFooter,
  DialogType,
  type IChoiceGroupOption,
  PrimaryButton,
  Separator,
  Text,
  TextField,
} from '@fluentui/react';
import { generateDefaultFilename } from '@khester/dynamics-utils';
import type { ColumnDef } from '../types';
import { exportGrid } from './exportGrid';

export interface GridExportDialogProps<T extends Record<string, unknown>> {
  /** Whether the dialog is visible. */
  isOpen: boolean;
  /** Close handler. */
  onClose: () => void;
  /** Rows to export (already scoped — current page / all / selection). */
  items: T[];
  /** Grid columns; the user picks a subset. `fileDrop` columns are excluded. */
  columns: ColumnDef<T>[];
  /** Base filename (a date suffix is added). Default 'grid-export'. */
  defaultFilename?: string;
  /** Formats offered. Default ['csv', 'json']. */
  formats?: Array<'csv' | 'json'>;
}

const FORMAT_OPTIONS: Record<'csv' | 'json', IChoiceGroupOption> = {
  csv: { key: 'csv', text: 'CSV', iconProps: { iconName: 'ExcelDocument' } },
  json: { key: 'json', text: 'JSON', iconProps: { iconName: 'Code' } },
};

/** Strip characters illegal in filenames. */
function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '');
}

/**
 * The export subset for a column selection: drops `fileDrop` columns (no
 * exportable value) and keeps only columns whose `key` is in `selectedKeys`.
 * Pure — the dialog's column-picker decision, extracted for testability.
 */
export function resolveExportColumns<T = Record<string, unknown>>(
  columns: ColumnDef<T>[],
  selectedKeys: ReadonlySet<string>
): ColumnDef<T>[] {
  return columns.filter((c) => c.rendererType !== 'fileDrop' && selectedKeys.has(c.key));
}

/**
 * Export dialog with format choice, a column picker (Select-all / indeterminate),
 * and a filename field. Exports the scoped `items` through `exportGrid`. The
 * turnkey `GridProps.exportConfig` split-button opens this when `dialog: true`.
 */
export function GridExportDialog<T extends Record<string, unknown>>({
  isOpen,
  onClose,
  items,
  columns,
  defaultFilename = 'grid-export',
  formats = ['csv', 'json'],
}: GridExportDialogProps<T>): JSX.Element {
  const exportable = useMemo(() => columns.filter((c) => c.rendererType !== 'fileDrop'), [columns]);
  const [format, setFormat] = useState<'csv' | 'json'>(formats[0] ?? 'csv');
  const [filename, setFilename] = useState(() => generateDefaultFilename(defaultFilename));
  const [selected, setSelected] = useState<Set<string>>(() => new Set(exportable.map((c) => c.key)));

  // Reset to defaults each time the dialog opens. Prop changes (formats /
  // defaultFilename / columns) while it stays OPEN are intentionally ignored.
  useEffect(() => {
    if (!isOpen) return;
    setFormat(formats[0] ?? 'csv');
    setFilename(generateDefaultFilename(defaultFilename));
    setSelected(new Set(exportable.map((c) => c.key)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only on the open transition
  }, [isOpen]);

  const allSelected = exportable.length > 0 && selected.size === exportable.length;
  const someSelected = selected.size > 0 && selected.size < exportable.length;
  const selectedColumns = useMemo(
    () => resolveExportColumns(columns, selected),
    [columns, selected]
  );

  const toggleAll = useCallback(
    (_?: React.FormEvent, checked?: boolean) => {
      setSelected(checked ? new Set(exportable.map((c) => c.key)) : new Set());
    },
    [exportable]
  );
  const toggleColumn = useCallback((key: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const handleExport = useCallback(() => {
    if (selectedColumns.length === 0 || items.length === 0 || !filename.trim()) return;
    exportGrid(items, selectedColumns, format, filename.trim());
    onClose();
  }, [items, selectedColumns, format, filename, onClose]);

  const formatChoices = formats.map((f) => FORMAT_OPTIONS[f]).filter(Boolean) as IChoiceGroupOption[];

  return (
    <Dialog
      hidden={!isOpen}
      onDismiss={onClose}
      dialogContentProps={{ type: DialogType.normal, title: 'Export', closeButtonAriaLabel: 'Close' }}
      modalProps={{ isBlocking: false, styles: { main: { maxWidth: 480, minWidth: 380 } } }}
    >
      <div style={{ textAlign: 'center', padding: 10, background: '#f3f2f1', borderRadius: 4 }}>
        <Text variant="mediumPlus">
          Exporting <strong>{items.length}</strong> {items.length === 1 ? 'row' : 'rows'}
        </Text>
      </div>
      <Separator />

      {formatChoices.length > 1 && (
        <div style={{ marginBottom: 12 }}>
          <Text block styles={{ root: { fontWeight: 600, marginBottom: 6 } }}>
            Format
          </Text>
          <ChoiceGroup
            selectedKey={format}
            options={formatChoices}
            onChange={(_, o) => o && setFormat(o.key as 'csv' | 'json')}
          />
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <Text block styles={{ root: { fontWeight: 600, marginBottom: 6 } }}>
          Columns
        </Text>
        <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #edebe9', borderRadius: 4, background: '#faf9f8' }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #edebe9' }}>
            <Checkbox label="Select all" checked={allSelected} indeterminate={someSelected} onChange={toggleAll} />
          </div>
          {exportable.map((c) => (
            <div key={c.key} style={{ padding: '4px 12px' }}>
              <Checkbox
                label={c.name}
                checked={selected.has(c.key)}
                onChange={(_, ck) => toggleColumn(c.key, !!ck)}
              />
            </div>
          ))}
        </div>
        <Text variant="small" styles={{ root: { color: '#605e5c', paddingTop: 4, display: 'block' } }}>
          {selected.size} of {exportable.length} columns
        </Text>
      </div>

      <TextField
        label="Filename"
        value={filename}
        onChange={(_, v) => setFilename(sanitizeFilename(v ?? ''))}
        suffix={`.${format}`}
        description="Invalid characters are removed."
      />

      <DialogFooter>
        <PrimaryButton
          text="Export"
          iconProps={{ iconName: 'Download' }}
          onClick={handleExport}
          disabled={selectedColumns.length === 0 || items.length === 0 || !filename.trim()}
        />
        <DefaultButton text="Cancel" onClick={onClose} />
      </DialogFooter>
    </Dialog>
  );
}
