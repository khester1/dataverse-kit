/**
 * The v9 cell-renderer registry — the v9 counterpart of `createCellRegistry()`.
 * Maps each `CellRendererType` to a v9 read cell component. It returns the SAME
 * `GridRegistry` interface the v8 skin uses, so the v9 adapter's `buildCellProps` +
 * `registry.resolve()` path is identical. Built-ins carry their v9 editors (text, number, date,
 * choice, rating, toggle, link); the lookup editor is opt-in (see `buildDefaults`). Add or override
 * with `registry.register(type, { read, edit })` or `createV9CellRegistry({ type: … })`.
 */
import type { CellRegistration, ColumnDef, GridRegistry } from '../../types';
import {
  TextCell,
  NumberCell,
  CurrencyCell,
  LinkCell,
  LookupCell,
  OptionSetCell,
  ColoredCell,
  ToggleCell,
  IconCell,
  ProgressBarCell,
  RatingCell,
  CompositeCell,
} from './cells';
import {
  EditableTextCell,
  EditableNumberCell,
  EditableDateCell,
  EditableOptionSetCell,
  EditableRatingCell,
  EditableToggleCell,
  EditableLinkCell,
} from './editable';

function buildDefaults(): Map<string, CellRegistration> {
  const m = new Map<string, CellRegistration>();
  m.set('text', { read: TextCell, edit: EditableTextCell });
  m.set('link', { read: LinkCell, edit: EditableLinkCell });
  // Editable lookup is OPT-IN (`./editableLookup`): its Combobox costs ~3 KB gzip, so the default
  // registry does not carry it. Register `{ read: LookupCell, edit: EditableLookupCell }` to enable it.
  m.set('lookup', { read: LookupCell });
  m.set('optionset', { read: OptionSetCell, edit: EditableOptionSetCell });
  m.set('currency', { read: CurrencyCell, edit: EditableNumberCell });
  m.set('number', { read: NumberCell, edit: EditableNumberCell });
  m.set('date', { read: TextCell, edit: EditableDateCell }); // buildCellProps formats date/datetime → read as text
  m.set('datetime', { read: TextCell, edit: EditableDateCell });
  m.set('boolean', { read: ToggleCell, edit: EditableToggleCell });
  m.set('toggle', { read: ToggleCell, edit: EditableToggleCell });
  m.set('icon', { read: IconCell });
  // Progress edits via a number input; coloredCell edits via a dropdown (needs
  // rendererConfig.options). Reads stay the progress bar / colored badge.
  m.set('progress', { read: ProgressBarCell, edit: EditableNumberCell });
  m.set('coloredCell', { read: ColoredCell, edit: EditableOptionSetCell });
  m.set('rating', { read: RatingCell, edit: EditableRatingCell });
  m.set('composite', { read: CompositeCell });
  return m;
}

/**
 * An editor may declare which columns it can actually edit — `true`, or the reason it cannot (shown in a
 * dev warning). The lookup editor needs a `searchLookup`: a column without one (e.g. from a JSON grid
 * definition, which cannot carry a function) must not look editable. A static on the component, so a
 * consumer's own editor is unaffected and no shared (vendored) type changes.
 */
export type CanEdit = (column: ColumnDef) => true | string;
type WithCanEdit = { canEdit?: CanEdit };

/** Why `column` is not editable by its registered editor, or `undefined` when it is (or has no rule). */
export function editorRefusal(column: ColumnDef, reg: CellRegistration | undefined): string | undefined {
  const canEdit = (reg?.edit as WithCanEdit | undefined)?.canEdit;
  const verdict = canEdit ? canEdit(column) : true;
  return verdict === true ? undefined : verdict;
}

/**
 * THE editability rule, for every v9 call site: the registry's `resolve` (which renderer) and the adapter
 * (the click-to-edit affordance, EditCellWrapper, truncation). Two copies would let a column look
 * editable while rendering read-only.
 */
export function isEditableColumn(column: ColumnDef, reg: CellRegistration | undefined, editable: boolean): boolean {
  return (
    editable &&
    !!column.editorType &&
    column.editorType !== 'none' &&
    !column.isLocked &&
    !!reg?.edit &&
    editorRefusal(column, reg) === undefined
  );
}

/**
 * Create a v9 cell-renderer registry with all read built-ins, optionally overridden.
 * `registry.register(type, { read, edit })` overrides a built-in or adds a new type.
 */
export function createV9CellRegistry(overrides?: Record<string, CellRegistration>): GridRegistry {
  const map = buildDefaults();
  if (overrides) for (const [key, reg] of Object.entries(overrides)) map.set(key, reg);

  return {
    get: (type) => map.get(type),
    register: (type, reg) => {
      map.set(type, reg);
    },
    resolve: (column, editable) => {
      const reg = map.get(column.rendererType);
      if (!reg) {
        // eslint-disable-next-line no-console
        if (typeof console !== 'undefined') {
          console.warn(`[grid-kit/v9] No renderer registered for "${column.rendererType}"; using text.`);
        }
        return (map.get('text') as CellRegistration).read as never;
      }
      return (isEditableColumn(column as ColumnDef, reg, editable) ? reg.edit! : reg.read) as never;
    },
  };
}
