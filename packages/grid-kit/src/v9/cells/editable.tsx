/**
 * The Fluent UI v9 EDITABLE cell components — the v9 counterparts of the canonical
 * @khester/dynamics-cell-renderers editable renderers. Each takes the SAME grid-kit
 * `GridCellProps` contract (so the v9 registry/adapter resolve them identically),
 * delegates to the matching v9 READ cell when not in edit mode, and renders a v9
 * editor (Input / Dropdown / interactive rating) with dirty/error indicators when
 * `isEditing`. Value changes bubble via `props.onValueChange(itemKey, fieldName,
 * next, original)`; `column.validate` feeds `props.onValidationError`.
 *
 * Editable LOOKUP lives in `./editableLookup` (opt-in — see `./registry`).
 */
import React, { useEffect, useState } from 'react';
import { Input, Dropdown, Option, Switch, type InputOnChangeData, type OptionOnSelectData, type SwitchOnChangeData } from '@fluentui/react-components';
import type { GridCellProps } from '../../types';
import { TextCell, NumberCell, CurrencyCell, OptionSetCell, RatingCell, LinkCell } from './cells';
import { cellColumn, clampFaceCount, selectedFaceIndex, emojiData } from './util';

export const editorInputStyle: React.CSSProperties = { width: '100%', minWidth: 0 };

/** Dirty (blue) / error (red) left-accent + an error message under the editor. */
export function EditShell({ dirty, error, children }: { dirty?: boolean; error?: string; children: React.ReactNode }): JSX.Element {
  const accent = error ? '#d13438' : dirty ? '#0078d4' : undefined;
  return (
    <span
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        ...(accent ? { borderLeft: `3px solid ${accent}`, paddingLeft: 5, marginLeft: -8 } : {}),
      }}
    >
      {children}
      {error && (
        <span
          title={error}
          style={{
            position: 'absolute',
            // above the in-grid aggregate footer (zIndex 1), which the last row's error hangs into
            zIndex: 2,
            bottom: -14,
            left: 0,
            color: '#d13438',
            fontSize: 11,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '100%',
          }}
        >
          {error}
        </span>
      )}
    </span>
  );
}

export function useValidate<T>(props: GridCellProps<T>) {
  const validate = props.column.validate;
  return (next: unknown): void => {
    if (validate && props.onValidationError) props.onValidationError(props.itemKey, props.column.fieldName, validate(next, props.itemKey));
  };
}

// ── text ─────────────────────────────────────────────────────────────────────

/** text — a v9 Input in edit mode, the read TextCell otherwise. */
export function EditableTextCell<T>(props: GridCellProps<T>): JSX.Element {
  const cur = props.editedValue !== undefined ? props.editedValue : props.value;
  const [local, setLocal] = useState(cur == null ? '' : String(cur));
  useEffect(() => setLocal(cur == null ? '' : String(cur)), [cur]);
  const runValidate = useValidate(props);

  if (!props.isEditing) return <TextCell {...props} />;

  const onChange = (_e: React.ChangeEvent<HTMLInputElement>, data: InputOnChangeData): void => {
    setLocal(data.value);
    runValidate(data.value || null);
    props.onValueChange?.(props.itemKey, props.column.fieldName, data.value || null, props.value);
  };
  return (
    <EditShell dirty={props.isDirty} error={props.errorMessage}>
      <Input appearance="filled-lighter" size="small" style={editorInputStyle} value={local} onChange={onChange} aria-label={props.column.name} />
    </EditShell>
  );
}

// ── link (editable) ────────────────────────────────────────────────────────────

/** link — the blue read LinkCell until you edit, then a v9 text Input. */
export function EditableLinkCell<T>(props: GridCellProps<T>): JSX.Element {
  if (!props.isEditing) return <LinkCell {...props} />;
  return <EditableTextCell {...props} />;
}

// ── number / currency ──────────────────────────────────────────────────────────

function parseNumericValue(v: string): number | null {
  if (!v || v.trim() === '') return null;
  const cleaned = v.replace(/[$€£¥,\s]/g, '');
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? null : n;
}

/** number / currency — a numeric v9 Input in edit mode, the read cell otherwise. */
export function EditableNumberCell<T>(props: GridCellProps<T>): JSX.Element {
  const cur = props.editedValue !== undefined ? props.editedValue : props.value;
  const initial = typeof cur === 'number' ? String(cur) : '';
  const [local, setLocal] = useState(initial);
  useEffect(() => setLocal(typeof cur === 'number' ? String(cur) : ''), [cur]);
  const runValidate = useValidate(props);
  const isCurrency = props.column.rendererType === 'currency';

  if (!props.isEditing) return isCurrency ? <CurrencyCell {...props} /> : <NumberCell {...props} />;

  const onChange = (_e: React.ChangeEvent<HTMLInputElement>, data: InputOnChangeData): void => {
    setLocal(data.value);
    const parsed = parseNumericValue(data.value);
    runValidate(parsed);
    props.onValueChange?.(props.itemKey, props.column.fieldName, parsed, props.value);
  };
  return (
    <EditShell dirty={props.isDirty} error={props.errorMessage}>
      <Input
        appearance="filled-lighter"
        size="small"
        style={{ ...editorInputStyle, textAlign: 'right' }}
        inputMode="decimal"
        value={local}
        onChange={onChange}
        aria-label={props.column.name}
      />
    </EditShell>
  );
}

// ── date / datetime ─────────────────────────────────────────────────────────────

function toDateInputValue(value: unknown, withTime: boolean): string {
  if (value == null || value === '') return '';
  // ★ A DATE-ONLY string is already the input's day. Through `new Date(...)` it is UTC midnight, and
  //   `getDate()` then gives the PREVIOUS day west of UTC — so at UTC-7 opening a 2026-06-15 value showed
  //   06-14, and committing 2026-10-08 flipped the input to 10-07 (measured, `editedDate.tz.test.tsx`).
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return withTime ? `${value}T00:00` : value;
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number): string => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return withTime ? `${date}T${pad(d.getHours())}:${pad(d.getMinutes())}` : date;
}

/** date / datetime — a native-typed v9 Input in edit mode, the read TextCell otherwise. */
export function EditableDateCell<T>(props: GridCellProps<T>): JSX.Element {
  const withTime = props.column.rendererType === 'datetime';
  const cur = props.editedValue !== undefined ? props.editedValue : props.value;
  const [local, setLocal] = useState(toDateInputValue(cur, withTime));
  useEffect(() => setLocal(toDateInputValue(cur, withTime)), [cur, withTime]);
  const runValidate = useValidate(props);

  if (!props.isEditing) return <TextCell {...props} />;

  const onChange = (_e: React.ChangeEvent<HTMLInputElement>, data: InputOnChangeData): void => {
    setLocal(data.value);
    const next = data.value || null;
    runValidate(next);
    props.onValueChange?.(props.itemKey, props.column.fieldName, next, props.value);
  };
  return (
    <EditShell dirty={props.isDirty} error={props.errorMessage}>
      <Input
        appearance="filled-lighter"
        size="small"
        style={editorInputStyle}
        type={withTime ? 'datetime-local' : 'date'}
        value={local}
        onChange={onChange}
        aria-label={props.column.name}
      />
    </EditShell>
  );
}

// ── optionset ────────────────────────────────────────────────────────────────

/** The "(None)" option's value in the choice and lookup editors. */
export const NONE = '__none__';

/** optionset — a v9 Dropdown (single or multi) in edit mode, the read badges otherwise. */
export function EditableOptionSetCell<T>(props: GridCellProps<T>): JSX.Element {
  const col = cellColumn(props);
  const runValidate = useValidate(props);
  const isMulti = !!col.optionSetMultiSelect;
  const options = col.optionSetOptions ?? [];
  const cur = props.editedValue !== undefined ? props.editedValue : props.value;

  if (!props.isEditing) return <OptionSetCell {...props} />;

  // Map a v9 Option string value back to its original (number|string) option value.
  const toOriginal = (s: string): number | string | null => {
    if (s === NONE) return null;
    const o = options.find((opt) => String(opt.value) === s);
    return o ? o.value : s;
  };
  const labelFor = (v: unknown): string => options.find((o) => String(o.value) === String(v))?.label ?? '';

  const selectedValues = isMulti
    ? (Array.isArray(cur) ? (cur as unknown[]).map(String) : [])
    : cur !== null && cur !== undefined
    ? [String(cur)]
    : [NONE];
  const triggerText = isMulti
    ? (Array.isArray(cur) ? (cur as unknown[]).map(labelFor).filter(Boolean).join(', ') : '')
    : cur !== null && cur !== undefined
    ? labelFor(cur)
    : '';

  const onOptionSelect = (_e: unknown, data: OptionOnSelectData): void => {
    let next: unknown;
    if (isMulti) {
      next = data.selectedOptions.map(toOriginal).filter((v) => v !== null);
    } else {
      next = data.optionValue !== undefined ? toOriginal(data.optionValue) : null;
    }
    runValidate(next);
    props.onValueChange?.(props.itemKey, props.column.fieldName, next, props.value);
  };

  return (
    <EditShell dirty={props.isDirty} error={props.errorMessage}>
      <Dropdown
        size="small"
        style={editorInputStyle}
        multiselect={isMulti || undefined}
        selectedOptions={selectedValues}
        value={triggerText}
        onOptionSelect={onOptionSelect}
        aria-label={props.column.name}
      >
        {!isMulti && (
          <Option key={NONE} value={NONE} text="(None)">
            (None)
          </Option>
        )}
        {options.map((o) => (
          <Option key={String(o.value)} value={String(o.value)} text={o.label}>
            {o.label}
          </Option>
        ))}
      </Dropdown>
    </EditShell>
  );
}

// ── toggle / boolean ─────────────────────────────────────────────────────────

/**
 * toggle / boolean — an interactive v9 Switch. A toggle is a single-click control,
 * so (unlike the other editors) it stays live regardless of `isEditing` and commits
 * on click; the read `ToggleCell` is a disabled switch.
 */
export function EditableToggleCell<T>(props: GridCellProps<T>): JSX.Element {
  const col = cellColumn(props);
  const cur = props.editedValue !== undefined ? props.editedValue : props.value;
  const checked = Boolean(cur);
  const label = checked ? col.toggleOnText || 'Yes' : col.toggleOffText || 'No';
  const onChange = (_e: React.ChangeEvent<HTMLInputElement>, data: SwitchOnChangeData): void => {
    props.onValueChange?.(props.itemKey, props.column.fieldName, data.checked, props.value);
  };
  return (
    <span onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center' }}>
      <Switch checked={checked} onChange={onChange} aria-label={label} />
    </span>
  );
}

// ── rating (click-to-set) ───────────────────────────────────────────────────────

/** rating — clickable stars / sentiment faces in edit mode, the read RatingCell otherwise. */
export function EditableRatingCell<T>(props: GridCellProps<T>): JSX.Element {
  const col = cellColumn(props);
  const runValidate = useValidate(props);
  const isEmoji = col.ratingStyle === 'emoji';
  const count = isEmoji ? clampFaceCount(col.ratingFaceCount, col.ratingMax) : col.ratingMax && col.ratingMax > 0 ? Math.floor(col.ratingMax) : 5;
  const cur = props.editedValue !== undefined ? props.editedValue : props.value;
  const selected = selectedFaceIndex(cur, count); // 0 = none

  if (!props.isEditing) return <RatingCell {...props} />;

  const commit = (n: number): void => {
    const next = n <= 0 ? null : n;
    runValidate(next);
    props.onValueChange?.(props.itemKey, props.column.fieldName, next, props.value);
  };
  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      commit(Math.min(count, selected + 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      commit(Math.max(0, selected - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      commit(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      commit(count);
    }
  };

  const btnBase: React.CSSProperties = { background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer', lineHeight: 1 };
  const buttons: JSX.Element[] = [];
  for (let i = 1; i <= count; i++) {
    const onClick = (): void => commit(i === selected ? 0 : i);
    if (isEmoji) {
      const isSel = i === selected;
      const useColor = col.ratingUseSentimentColor !== false;
      const color = isSel ? (useColor ? emojiData.EMOJI_COLORS[count][i - 1] : col.ratingColor || '#0078d4') : '#c8c6c4';
      buttons.push(
        <button key={i} type="button" onClick={onClick} title={emojiData.EMOJI_LABELS[count][i - 1]} aria-hidden tabIndex={-1} style={{ ...btnBase, fontSize: 18, color, filter: isSel ? undefined : 'grayscale(1) opacity(0.6)' }}>
          {emojiData.EMOJI_FACES[count][i - 1]}
        </button>,
      );
    } else {
      const filledColor = col.ratingColor || '#ffb900';
      buttons.push(
        <button key={i} type="button" onClick={onClick} aria-hidden tabIndex={-1} style={{ ...btnBase, fontSize: 16, color: i <= selected ? filledColor : '#c8c6c4' }}>
          ★
        </button>,
      );
    }
  }

  return (
    <EditShell dirty={props.isDirty} error={props.errorMessage}>
      <div
        role="slider"
        aria-valuemin={0}
        aria-valuemax={count}
        aria-valuenow={selected}
        aria-label={props.column.name}
        tabIndex={0}
        onKeyDown={onKeyDown}
        style={{ display: 'flex', gap: 2, alignItems: 'center' }}
      >
        {buttons}
      </div>
    </EditShell>
  );
}
