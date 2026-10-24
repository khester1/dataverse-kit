/**
 * The v9 filter-builder panel — the counterpart of the v8 `GridFilterBuilder` (`../../hosts`), which is
 * a Fluent v8 `Panel` and must never be imported here. Same behaviour: field · operator · value
 * conditions combined with All/Any, on a working copy that resets on every open and commits on Apply
 * (incomplete rows dropped). The field list, operators and option normalising are the shared,
 * framework-agnostic `core/filterFields` — so both skins offer exactly the same choices.
 *
 * ★ Native-backed controls only (`Select`, `Input`, `Checkbox`): `Dropdown` / `Combobox` /
 *   `RadioGroup` each pull a positioning + listbox stack into every consumer bundle (the panel is
 *   opt-in by import, but a consumer who opts in should not pay for three pickers). A multi-value
 *   (`in` / `not-in`) optionset condition is a checkbox list; a date is `<input type="date">`, whose
 *   value is the `YYYY-MM-DD` day the filter compares — no locale parsing.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, Input, Select, Text, makeStyles, tokens } from '@fluentui/react-components';
import { Add20Regular, Delete20Regular } from '@fluentui/react-icons';
import {
  isConditionComplete,
  operatorIsMultiValue,
  operatorRequiresValue,
  type FilterCondition,
  type FilterMatch,
  type FilterOperator,
} from '../../core/filter';
import { filterableFields, getOperatorsForFieldType, type FilterField } from '../../core/filterFields';
import type { V9FilterBuilderPanelProps } from '../types';
import { PanelDrawer } from './panelDrawer';

/** The panel contract (`V9FilterBuilderPanelProps`) — pass this component as `filterBuilder`. */
export type GridFilterBuilderV9Props<T> = V9FilterBuilderPanelProps<T>;

const useStyles = makeStyles({
  row: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalS,
    paddingBlock: tokens.spacingVerticalXS,
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke3}`,
  },
  field: { width: '170px' },
  operator: { width: '150px' },
  value: { width: '170px' },
  checks: { display: 'flex', flexDirection: 'column', minWidth: '170px' },
  match: { width: '220px' },
  actions: { display: 'flex', gap: tokens.spacingHorizontalS, paddingTop: tokens.spacingVerticalS },
  empty: { color: tokens.colorNeutralForeground3, paddingBlock: tokens.spacingVerticalS },
});

/** A working condition row — a UI-only stable `id`, kept out of the emitted model. */
interface WorkingRow {
  id: number;
  cond: FilterCondition;
}
let rowSeq = 0;
const makeRow = (cond: FilterCondition): WorkingRow => ({ id: ++rowSeq, cond });

/** An `<input type="date">` value: the leading `YYYY-MM-DD` of a stored value, else ''. */
const dateInputValue = (v: string | undefined): string => /^\d{4}-\d{2}-\d{2}/.exec(v ?? '')?.[0] ?? '';

function ValueEditor({
  field,
  condition,
  onChange,
}: {
  field: FilterField;
  condition: FilterCondition;
  onChange: (patch: Partial<FilterCondition>) => void;
}): JSX.Element {
  const styles = useStyles();
  const { fieldType } = field;

  if (fieldType === 'boolean') {
    return (
      <Select aria-label="Value" className={styles.value} value={condition.value ?? ''} onChange={(_e, d) => onChange({ value: d.value || undefined })}>
        <option value="" disabled>
          Select a value
        </option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </Select>
    );
  }

  if (fieldType === 'optionset' && field.options) {
    if (operatorIsMultiValue(condition.operator)) {
      const values = condition.values ?? [];
      return (
        <div role="group" aria-label="Values" className={styles.checks}>
          {field.options.map((o) => (
            <Checkbox
              key={o.key}
              label={o.text}
              checked={values.includes(o.key)}
              onChange={(_e, d) => onChange({ values: d.checked ? [...values, o.key] : values.filter((k) => k !== o.key) })}
            />
          ))}
        </div>
      );
    }
    return (
      <Select aria-label="Value" className={styles.value} value={condition.value ?? ''} onChange={(_e, d) => onChange({ value: d.value || undefined })}>
        <option value="" disabled>
          Select a value
        </option>
        {field.options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.text}
          </option>
        ))}
      </Select>
    );
  }

  if (fieldType === 'date') {
    return (
      <Input
        aria-label="Value"
        type="date"
        className={styles.value}
        value={dateInputValue(condition.value)}
        onChange={(_e, d) => onChange({ value: d.value || undefined })}
      />
    );
  }

  const numeric = fieldType === 'number' || fieldType === 'currency';
  return (
    <Input
      aria-label="Value"
      type={numeric ? 'number' : 'text'}
      className={styles.value}
      value={condition.value ?? ''}
      placeholder={fieldType === 'lookup' ? 'Text or GUID' : undefined}
      onChange={(_e, d) => onChange({ value: d.value })}
    />
  );
}

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
  const styles = useStyles();
  const field = fields.find((f) => f.key === condition.fieldName);
  const operators = getOperatorsForFieldType(field?.fieldType ?? 'text');

  const onFieldChange = (key: string): void => {
    const next = fields.find((f) => f.key === key);
    const firstOp = next ? getOperatorsForFieldType(next.fieldType)[0].op : 'eq';
    onChange({ fieldName: key, operator: firstOp, value: undefined, values: undefined });
  };

  return (
    <div className={styles.row} data-gridkit-filter-row="">
      <Select aria-label="Column" className={styles.field} value={condition.fieldName} onChange={(_e, d) => onFieldChange(d.value)}>
        <option value="" disabled>
          Select a column
        </option>
        {fields.map((f) => (
          <option key={f.key} value={f.key}>
            {f.text}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Operator"
        className={styles.operator}
        value={condition.operator}
        disabled={!field}
        onChange={(_e, d) => onChange({ operator: d.value as FilterOperator, value: undefined, values: undefined })}
      >
        {operators.map((o) => (
          <option key={o.op} value={o.op}>
            {o.label}
          </option>
        ))}
      </Select>
      {field && operatorRequiresValue(condition.operator) && <ValueEditor field={field} condition={condition} onChange={onChange} />}
      <Button appearance="subtle" icon={<Delete20Regular />} aria-label="Remove condition" title="Remove condition" onClick={onRemove} />
    </div>
  );
}

export function GridFilterBuilderV9<T>({ open, onClose, columns, model, onApply, title = 'Edit filters' }: GridFilterBuilderV9Props<T>): JSX.Element {
  const styles = useStyles();
  const fields = useMemo(() => filterableFields(columns), [columns]);
  const [match, setMatch] = useState<FilterMatch>(model.match);
  const [rows, setRows] = useState<WorkingRow[]>(() => model.conditions.map(makeRow));
  // Reset the working copy each time the panel opens (Cancel = discard).
  useEffect(() => {
    if (open) {
      setMatch(model.match);
      setRows(model.conditions.map(makeRow));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only on the open transition
  }, [open]);

  const add = useCallback(() => setRows((rs) => [...rs, makeRow({ fieldName: '', operator: 'eq' })]), []);
  const update = useCallback(
    (id: number, patch: Partial<FilterCondition>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, cond: { ...r.cond, ...patch } } : r))),
    [],
  );
  const remove = useCallback((id: number) => setRows((rs) => rs.filter((r) => r.id !== id)), []);
  const apply = useCallback(() => {
    onApply({ match, conditions: rows.map((r) => r.cond).filter(isConditionComplete) });
    onClose();
  }, [match, rows, onApply, onClose]);

  return (
    <PanelDrawer
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button appearance="primary" onClick={apply}>
            Apply
          </Button>
        </>
      }
    >
      {rows.length > 1 && (
        <Select aria-label="Match" className={styles.match} value={match} onChange={(_e, d) => setMatch(d.value as FilterMatch)}>
          <option value="all">All conditions (AND)</option>
          <option value="any">Any condition (OR)</option>
        </Select>
      )}
      {rows.length === 0 ? (
        <Text size={200} className={styles.empty}>
          No filters. Add a condition to narrow the rows.
        </Text>
      ) : (
        rows.map((r) => (
          <ConditionRow key={r.id} condition={r.cond} fields={fields} onChange={(p) => update(r.id, p)} onRemove={() => remove(r.id)} />
        ))
      )}
      <div className={styles.actions}>
        <Button icon={<Add20Regular />} onClick={add} disabled={fields.length === 0}>
          Add condition
        </Button>
        {rows.length > 0 && <Button onClick={() => setRows([])}>Clear all</Button>}
      </div>
    </PanelDrawer>
  );
}
