/**
 * The v9 editable LOOKUP cell — the counterpart of the v8 `EditableLookupCell`
 * (`@khester/dynamics-cell-renderers`) on the CONTRACT, not its internals:
 * - Fetch-free: the consumer supplies `rendererConfig.searchLookup(term) => Promise<{id,name}[]>` (also
 *   accepts `{key,text}` items at runtime). The cell never queries.
 * - Commit: `onValueChange(itemKey, fieldName, { id, name, entitySetName }, originalValue)`; "(None)" → `null`.
 *   `originalValue` is the row's raw value (a GUID for a `_x_value` field).
 * - A column without `searchLookup` is NOT editable (`EditableLookupCell.canEdit`, read by the one
 *   editability predicate in `./registry`).
 *
 * Fluent v9 `Combobox` traps, each handled here and pinned by a test (`editableLookup.test.tsx`):
 * - Typing away from the selected name fires `onOptionSelect` with `optionValue: undefined` (Fluent clears
 *   the selection) — ignored. (Mapping it to `null`, as the choice editor does, would clear the lookup on
 *   every keystroke; that mapping is what the "typing commits nothing" test pins.)
 * - Fluent auto-activates the first option and Enter/Tab commit the active one — so `disableAutoFocus`.
 *   Fluent still activates the SELECTED option on open: on an empty cell that is "(None)", whose commit is
 *   a no-op (same value).
 * - Focus does not open a Combobox, so the list opens (and searches) on keyboard/programmatic focus — never
 *   on mount (with `editTrigger="always"` every row mounts an editor), and never on a pointer focus, which
 *   Fluent's own click handles.
 * - An open list swallows the first Escape (Fluent stops it); that Escape restores the committed name.
 * - Status rows (Searching… / No results found / Search failed) are NOT options — a disabled `<Option>` is
 *   still selectable — and are announced through an aria-live region.
 * - A later search's results must not be overwritten by an earlier, slower one (a sequence guard).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Combobox, Option, type ComboboxProps } from '@fluentui/react-components';
import type { ColumnDef, GridCellProps } from '../../types';
import { toReusableColumn } from '../../registry/columnMapping';
import { LookupCell, lookupDisplayText } from './cells';
import { EditShell, NONE, editorInputStyle, useValidate } from './editable';
import { cellColumn } from './util';

/** A search result. */
export interface LookupOption {
  id: string;
  name: string;
}
/** The committed value. */
export interface LookupValue {
  id: string;
  name: string;
  entitySetName?: string;
}
type SearchLookup = (term: string) => Promise<Array<LookupOption | { key: unknown; text: unknown }>>;

/** Debounce for typed searches (ms). */
export const LOOKUP_SEARCH_DEBOUNCE_MS = 300;

function normalize(o: unknown): LookupOption {
  const r = (o ?? {}) as Record<string, unknown>;
  return 'id' in r ? { id: String(r.id), name: String(r.name ?? '') } : { id: String(r.key ?? ''), name: String(r.text ?? '') };
}

/** The id a cell currently holds: the committed edit's, else the row's raw value (GUID or expanded object). */
function currentId<T>(props: GridCellProps<T>): string | null {
  const v = props.editedValue !== undefined ? props.editedValue : props.value;
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const idAttr = cellColumn(props).lookupPrimaryIdAttribute;
    const id = o.id ?? (idAttr ? o[idAttr] : undefined);
    return id === undefined || id === null ? null : String(id);
  }
  return String(v);
}

/** The name a cell currently shows: the committed edit's, else the shared read resolution. */
function currentName<T>(props: GridCellProps<T>): string {
  if (props.editedValue !== undefined) {
    const e = props.editedValue as LookupValue | null;
    return e ? e.name : '';
  }
  return lookupDisplayText(props);
}

type Status = 'idle' | 'searching' | 'done' | 'error';

function LookupEditor<T>({ props, search }: { props: GridCellProps<T>; search: SearchLookup }): JSX.Element {
  const col = cellColumn(props);
  const runValidate = useValidate(props);
  const committedName = currentName(props);
  const committedId = currentId(props);

  const [text, setText] = useState(committedName);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<LookupOption[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const alive = useRef(true);
  useEffect(
    () => () => {
      alive.current = false;
      clearTimeout(timer.current);
    },
    [],
  );

  const runSearch = useCallback(
    (term: string) => {
      const mine = ++seq.current;
      setStatus('searching');
      search(term).then(
        (raw) => {
          // ★ Only the LATEST search may land. `alive`: React 16/17 (in the peer range) warn on a state
          //   update after unmount; React 18 drops it silently, so this half is not observable in our
          //   tests (React 18) — kept for older hosts, unverified here.
          if (!alive.current || mine !== seq.current) return;
          setResults((raw ?? []).map(normalize));
          setStatus('done');
        },
        () => {
          if (!alive.current || mine !== seq.current) return;
          setResults([]);
          setStatus('error');
        },
      );
    },
    [search],
  );

  // ★ A mouse press focuses the input BEFORE Fluent's click toggles the list — opening on that focus
  //   meant the click closed it again (editTrigger="always", review of #454). Pointer focus waits for
  //   Fluent's click (→ onOpenChange); keyboard / programmatic focus (click-to-edit's wrapper) opens here.
  const pointerDown = useRef(false);

  /** Open the list and search: the typed text if any, else everything ('' = "show me the list"). */
  const openList = (searchNow = true): void => {
    if (open) return;
    setOpen(true);
    if (searchNow) runSearch(text === committedName ? '' : text);
  };

  const commit = (next: LookupValue | null): void => {
    setOpen(false);
    setText(next ? next.name : '');
    // Re-choosing what the cell already holds is not an edit (no false "dirty").
    if ((next?.id ?? null) === committedId) return;
    runValidate(next);
    props.onValueChange?.(props.itemKey, props.column.fieldName, next, props.value);
  };

  const onOptionSelect: ComboboxProps['onOptionSelect'] = (_e, data) => {
    // ★ undefined = Fluent cleared the selection because the typed text stopped matching it. Not a commit.
    if (data.optionValue === undefined) return;
    if (data.optionValue === NONE) return commit(null);
    const hit = results.find((r) => r.id === data.optionValue);
    if (hit) commit({ id: hit.id, name: hit.name, entitySetName: col.lookupEntitySetName });
  };

  const onOpenChange: ComboboxProps['onOpenChange'] = (e, data) => {
    // Opened by TYPING a character: `onType` schedules that term's search — an immediate one here would
    // fetch the stale term first and show its results under the new text (review of #454).
    const typed = (e as React.KeyboardEvent).key?.length === 1;
    if (data.open) return openList(!typed);
    setOpen(false);
    // Escape closes the list — and abandons the typing: show the committed name again.
    if ((e as React.KeyboardEvent).key === 'Escape') setText(committedName);
  };

  const onType = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const term = e.target.value;
    setText(term);
    setOpen(true);
    // Hide the previous term's results now: Fluent prefix-matches the RENDERED options as you type, and a
    // Tab would commit a match from a search that no longer applies.
    setStatus('searching');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => runSearch(term), LOOKUP_SEARCH_DEBOUNCE_MS);
  };

  const statusText =
    status === 'searching' ? 'Searching…' : status === 'error' ? 'Search failed' : status === 'done' && results.length === 0 ? 'No results found' : '';

  return (
    <EditShell dirty={props.isDirty} error={props.errorMessage}>
      <Combobox
        freeform
        disableAutoFocus
        size="small"
        appearance="filled-lighter"
        style={editorInputStyle}
        aria-label={props.column.name}
        placeholder="Search…"
        value={text}
        open={open}
        selectedOptions={committedId ? [committedId] : [NONE]}
        onOpenChange={onOpenChange}
        onOptionSelect={onOptionSelect}
        onChange={onType}
        onMouseDown={() => {
          pointerDown.current = true;
        }}
        onFocus={() => {
          if (!pointerDown.current) openList();
        }}
        onClick={() => {
          pointerDown.current = false;
        }}
        positioning={{ autoSize: true }}
        listbox={{ style: { minWidth: 220 } }}
      >
        <Option key={NONE} value={NONE} text="(None)">
          (None)
        </Option>
        {status === 'done' &&
          results.map((r) => (
            <Option key={r.id} value={r.id} text={r.name}>
              {r.name}
            </Option>
          ))}
        {statusText && (
          <div role="presentation" data-gridkit-lookup-status={status} style={{ padding: '6px 12px', color: '#605e5c', fontSize: 12 }}>
            {statusText}
          </div>
        )}
      </Combobox>
      <span aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        {statusText}
      </span>
    </EditShell>
  );
}

function EditableLookupCellImpl<T>(props: GridCellProps<T>): JSX.Element {
  const search = cellColumn(props).lookupSearch as SearchLookup | undefined;
  if (!props.isEditing || !search) return <LookupCell {...props} />;
  return <LookupEditor props={props} search={search} />;
}

/** The lookup editor needs the consumer's `searchLookup` — without one the column is read-only. */
function canEditLookup(column: ColumnDef): true | string {
  return toReusableColumn(column).lookupSearch
    ? true
    : `lookup column "${column.key}" has editorType "${column.editorType}" but no rendererConfig.searchLookup — it is shown read-only.`;
}

/**
 * lookup — the read `LookupCell` until you edit, then a searchable Combobox fed by `searchLookup`.
 * ★ `canEdit` is attached with a PURE expression, not `EditableLookupCell.canEdit = …`: an assignment is a
 *   module side effect, so every v9 bundle kept this module — and Fluent's Combobox — even when nothing
 *   imported it (MEASURED: +21 KB min / +3.4 KB gzip on a plain DataGrid, and on a read-only CardGrid).
 */
export const EditableLookupCell = /*#__PURE__*/ Object.assign(EditableLookupCellImpl, { canEdit: canEditLookup });
