import React, { useEffect, useMemo, useState } from 'react';
import {
  DatePicker,
  DefaultButton,
  Dropdown,
  IconButton,
  Panel,
  PanelType,
  PrimaryButton,
  Stack,
  Text,
  TextField,
} from '@fluentui/react';
import type { ColumnDef } from '../types';
import {
  type FilterCondition,
  type FilterMatch,
  type FilterOperator,
  type GridFilterModel,
  isConditionComplete,
  operatorIsMultiValue,
  operatorRequiresValue,
} from '../core/filter';
import { filterableFields, getOperatorsForFieldType, type FilterField } from '../core/filterFields';

// The field helpers are framework-agnostic and shared with the v9 skin — they live in
// `core/filterFields` (this Fluent v8 file must never be imported by v9). Re-exported so v8 import
// paths keep working.
export { fieldTypeForRenderer, getOperatorsForFieldType } from '../core/filterFields';
export type { FilterFieldType } from '../core/filterFields';

/** Format a Date as a local calendar day (YYYY-MM-DD) — avoids the toISOString UTC shift. */
function toDateOnly(d: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parse a YYYY-MM-DD (or ISO) value into a LOCAL Date for the picker (round-trips the day). */
function parseDateValue(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Per-condition value editor — switches on the column's field type + operator. */
function ValueEditor({
  field,
  condition,
  onChange,
}: {
  field?: FilterField;
  condition: FilterCondition;
  onChange: (patch: Partial<FilterCondition>) => void;
}): JSX.Element {
  const fieldType = field?.fieldType ?? 'text';

  if (fieldType === 'boolean') {
    return (
      <Dropdown
        ariaLabel="Value"
        selectedKey={condition.value ?? null}
        options={[
          { key: 'true', text: 'Yes' },
          { key: 'false', text: 'No' },
        ]}
        onChange={(_, o) => o && onChange({ value: String(o.key) })}
        styles={{ root: { width: 120 } }}
      />
    );
  }

  if (fieldType === 'optionset' && field?.options) {
    if (operatorIsMultiValue(condition.operator)) {
      return (
        <Dropdown
          multiSelect
          ariaLabel="Values"
          selectedKeys={condition.values ?? []}
          options={field.options}
          onChange={(_, o) => {
            if (!o) return;
            const prev = condition.values ?? [];
            const key = String(o.key);
            onChange({ values: o.selected ? [...prev, key] : prev.filter((k) => k !== key) });
          }}
          styles={{ root: { width: 190 } }}
        />
      );
    }
    return (
      <Dropdown
        ariaLabel="Value"
        selectedKey={condition.value ?? null}
        options={field.options}
        onChange={(_, o) => o && onChange({ value: String(o.key) })}
        styles={{ root: { width: 190 } }}
      />
    );
  }

  if (fieldType === 'date') {
    return (
      <DatePicker
        ariaLabel="Value"
        value={parseDateValue(condition.value)}
        onSelectDate={(d) => onChange({ value: d ? toDateOnly(d) : undefined })}
        styles={{ root: { width: 170 } }}
      />
    );
  }

  const isNumeric = fieldType === 'number' || fieldType === 'currency';
  return (
    <TextField
      ariaLabel="Value"
      type={isNumeric ? 'number' : 'text'}
      value={condition.value ?? ''}
      placeholder={fieldType === 'lookup' ? 'Text or GUID' : undefined}
      onChange={(_, v) => onChange({ value: v ?? '' })}
      styles={{ root: { width: 170 } }}
    />
  );
}

/** One filter row: column → operator → value editor → remove. */
function ConditionRow({
  condition,
  fields,
  onChange,
  onRemove,
}: {
  condition: FilterCondition;
  fields: FilterField[];
  onChange: (patch: Partial<FilterCondition>) => void;
  onRemove: () => void;
}): JSX.Element {
  const field = fields.find((f) => f.key === condition.fieldName);
  const fieldType = field?.fieldType ?? 'text';
  const operators = getOperatorsForFieldType(fieldType);

  const onFieldChange = (key: string): void => {
    const next = fields.find((f) => f.key === key);
    const firstOp = next ? getOperatorsForFieldType(next.fieldType)[0].op : 'eq';
    onChange({ fieldName: key, operator: firstOp, value: undefined, values: undefined });
  };

  return (
    <Stack horizontal verticalAlign="start" tokens={{ childrenGap: 8 }} styles={{ root: { padding: '2px 0' } }}>
      <Dropdown
        ariaLabel="Column"
        placeholder="Select a column"
        selectedKey={condition.fieldName || null}
        options={fields.map((f) => ({ key: f.key, text: f.text }))}
        onChange={(_, o) => o && onFieldChange(String(o.key))}
        styles={{ root: { width: 170 } }}
      />
      <Dropdown
        ariaLabel="Operator"
        selectedKey={condition.operator}
        disabled={!condition.fieldName}
        options={operators.map((o) => ({ key: o.op, text: o.label }))}
        onChange={(_, o) => o && onChange({ operator: o.key as FilterOperator, value: undefined, values: undefined })}
        styles={{ root: { width: 150 } }}
      />
      {condition.fieldName && operatorRequiresValue(condition.operator) && (
        <ValueEditor field={field} condition={condition} onChange={onChange} />
      )}
      <IconButton
        iconProps={{ iconName: 'Delete' }}
        ariaLabel="Remove condition"
        title="Remove condition"
        onClick={onRemove}
      />
    </Stack>
  );
}

export interface GridFilterBuilderProps<T extends Record<string, unknown>> {
  /** Whether the panel is open. */
  isOpen: boolean;
  /** Close handler. */
  onClose: () => void;
  /** All grid columns — the field picker offers those with `isFilterable !== false`. */
  columns: ColumnDef<T>[];
  /** The currently applied filter model (the panel resets a working copy to this on open). */
  model: GridFilterModel;
  /** Apply the built filter model. */
  onApply: (model: GridFilterModel) => void;
}

/** A working condition row — carries a UI-only stable `id` (kept out of the emitted model). */
interface WorkingRow {
  id: number;
  cond: FilterCondition;
}

let rowSeq = 0;
const makeRow = (cond: FilterCondition): WorkingRow => ({ id: ++rowSeq, cond });

/**
 * Filter-builder panel: build field/operator/value conditions combined by All/Any
 * (AND/OR). Edits a working copy and commits on Apply (reset on each open).
 * Incomplete rows are dropped on Apply. The actual row filtering is done by the
 * pure `applyFilters` (src/core/filter.ts); this panel only produces the model.
 */
export function GridFilterBuilder<T extends Record<string, unknown>>({
  isOpen,
  onClose,
  columns,
  model,
  onApply,
}: GridFilterBuilderProps<T>): JSX.Element {
  const fields = useMemo<FilterField[]>(() => filterableFields(columns), [columns]);

  const [match, setMatch] = useState<FilterMatch>(model.match);
  const [rows, setRows] = useState<WorkingRow[]>(() => model.conditions.map(makeRow));

  // Reset the working copy each time the panel opens (mirrors GridColumnChooser).
  useEffect(() => {
    if (isOpen) {
      setMatch(model.match);
      setRows(model.conditions.map(makeRow));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only on the open transition
  }, [isOpen]);

  const addCondition = (): void => setRows((rs) => [...rs, makeRow({ fieldName: '', operator: 'eq' })]);
  const updateCondition = (id: number, patch: Partial<FilterCondition>): void =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, cond: { ...r.cond, ...patch } } : r)));
  const removeCondition = (id: number): void => setRows((rs) => rs.filter((r) => r.id !== id));
  const clearAll = (): void => setRows([]);

  const apply = (): void => {
    onApply({ match, conditions: rows.map((r) => r.cond).filter(isConditionComplete) });
    onClose();
  };

  return (
    <Panel
      isOpen={isOpen}
      onDismiss={onClose}
      type={PanelType.medium}
      headerText="Edit filters"
      isFooterAtBottom
      onRenderFooterContent={() => (
        <Stack
          horizontal
          horizontalAlign="end"
          tokens={{ childrenGap: 8 }}
          styles={{ root: { padding: '12px 24px', borderTop: '1px solid #edebe9' } }}
        >
          <DefaultButton text="Cancel" onClick={onClose} />
          <PrimaryButton text="Apply" onClick={apply} />
        </Stack>
      )}
    >
      {rows.length > 1 && (
        <Dropdown
          label="Match"
          selectedKey={match}
          options={[
            { key: 'all', text: 'All conditions (AND)' },
            { key: 'any', text: 'Any condition (OR)' },
          ]}
          onChange={(_, o) => o && setMatch(o.key as FilterMatch)}
          styles={{ root: { width: 220, padding: '8px 0' } }}
        />
      )}

      {rows.length === 0 ? (
        <Text variant="small" styles={{ root: { color: '#a19f9d', display: 'block', padding: '8px 0' } }}>
          No filters. Add a condition to narrow the rows.
        </Text>
      ) : (
        <Stack tokens={{ childrenGap: 4 }} styles={{ root: { padding: '8px 0' } }}>
          {rows.map((r) => (
            <ConditionRow
              key={r.id}
              condition={r.cond}
              fields={fields}
              onChange={(patch) => updateCondition(r.id, patch)}
              onRemove={() => removeCondition(r.id)}
            />
          ))}
        </Stack>
      )}

      <Stack horizontal tokens={{ childrenGap: 8 }} styles={{ root: { padding: '8px 0' } }}>
        <DefaultButton
          iconProps={{ iconName: 'Add' }}
          text="Add condition"
          onClick={addCondition}
          disabled={fields.length === 0}
        />
        {rows.length > 0 && <DefaultButton text="Clear all" onClick={clearAll} />}
      </Stack>
    </Panel>
  );
}
