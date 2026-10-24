/**
 * The cell-renderer registry — the single source of truth that both grid hosts
 * (DetailsList adapter + GridCustomizer overrides) consume. Maps each
 * `CellRendererType` to a read (and optional edit) wrapper over the canonical
 * @khester/dynamics-cell-renderers components.
 */
import {
  TextCell,
  LinkCell,
  CurrencyCell,
  DateCell,
  NumberCell,
  OptionSetCell,
  ToggleCell,
  IconCell,
  ProgressBarCell,
  ColoredCell,
  LookupCell,
  RatingCell,
  CompositeCell,
  EditableTextCell,
  EditableNumberCell,
  EditableDateCell,
  EditableOptionSetCell,
  EditableLookupCell,
  EditableRatingCell,
} from '@khester/dynamics-cell-renderers';
import type { CellRegistration, GridRegistry } from '../types';
import { makeReadWrapper, makeEditWrapper, makeReadOrEditWrapper } from './renderers';
import { FileDropCell } from '../dnd/FileDropCell';

function buildDefaults(): Map<string, CellRegistration> {
  const m = new Map<string, CellRegistration>();

  m.set('text', {
    read: makeReadWrapper(TextCell, 'GridKit(text)'),
    edit: makeEditWrapper(EditableTextCell, 'GridKit(edit:text)'),
  });
  // Editable link keeps the blue read LinkCell until you actually edit (then a
  // text input), so an editable owner/link still reads as a blue link.
  m.set('link', {
    read: makeReadWrapper(LinkCell, 'GridKit(link)'),
    edit: makeReadOrEditWrapper(LinkCell, EditableTextCell, 'GridKit(link)'),
  });
  // Editable lookup is fetch-free: the consumer supplies `searchLookup(term)` on
  // the column's rendererConfig (mapped to `column.lookupSearch`), so the cell
  // never needs an apiService. A column opts in with editorType:'lookup'.
  m.set('lookup', {
    read: makeReadWrapper(LookupCell, 'GridKit(lookup)'),
    edit: makeEditWrapper(EditableLookupCell, 'GridKit(edit:lookup)'),
  });
  m.set('optionset', {
    read: makeReadWrapper(OptionSetCell, 'GridKit(optionset)'),
    edit: makeEditWrapper(EditableOptionSetCell, 'GridKit(edit:optionset)'),
  });
  m.set('currency', {
    read: makeReadWrapper(CurrencyCell, 'GridKit(currency)'),
    edit: makeEditWrapper(EditableNumberCell, 'GridKit(edit:currency)'),
  });
  m.set('number', {
    read: makeReadWrapper(NumberCell, 'GridKit(number)'),
    edit: makeEditWrapper(EditableNumberCell, 'GridKit(edit:number)'),
  });
  m.set('date', {
    read: makeReadWrapper(DateCell, 'GridKit(date)'),
    edit: makeEditWrapper(EditableDateCell, 'GridKit(edit:date)'),
  });
  m.set('datetime', {
    read: makeReadWrapper(DateCell, 'GridKit(datetime)'),
    edit: makeEditWrapper(EditableDateCell, 'GridKit(edit:datetime)'),
  });
  m.set('boolean', { read: makeReadWrapper(ToggleCell, 'GridKit(boolean)') });
  m.set('toggle', { read: makeReadWrapper(ToggleCell, 'GridKit(toggle)') });
  m.set('icon', { read: makeReadWrapper(IconCell, 'GridKit(icon)') });
  // Progress edits via a number input (0–max); the read stays the progress bar.
  m.set('progress', {
    read: makeReadWrapper(ProgressBarCell, 'GridKit(progress)'),
    edit: makeEditWrapper(EditableNumberCell, 'GridKit(edit:progress)'),
  });
  // A coloredCell edits via a dropdown (needs rendererConfig.options); the read
  // stays the colored badge.
  m.set('coloredCell', {
    read: makeReadWrapper(ColoredCell, 'GridKit(coloredCell)'),
    edit: makeEditWrapper(EditableOptionSetCell, 'GridKit(edit:coloredCell)'),
  });
  // Rating is click-to-set editable (stars or sentiment emoji). Opt in with
  // editorType:'number'; rendererConfig.style:'emoji' switches to faces.
  m.set('rating', {
    read: makeReadWrapper(RatingCell, 'GridKit(rating)'),
    edit: makeEditWrapper(EditableRatingCell, 'GridKit(edit:rating)'),
  });
  m.set('composite', { read: makeReadWrapper(CompositeCell, 'GridKit(composite)') });
  // grid-kit-native (not a canonical-lib wrapper): a per-cell file-drop target.
  m.set('fileDrop', { read: FileDropCell });

  return m;
}

/**
 * Create a cell-renderer registry with all built-ins, optionally overridden.
 * Consumers can also call `registry.register(type, { read, edit })` later to
 * override a built-in or add a brand-new cell type.
 */
export function createCellRegistry(overrides?: Record<string, CellRegistration>): GridRegistry {
  const map = buildDefaults();
  if (overrides) {
    for (const [key, reg] of Object.entries(overrides)) map.set(key, reg);
  }

  const registry: GridRegistry = {
    get: (type) => map.get(type),
    register: (type, reg) => {
      map.set(type, reg);
    },
    resolve: (column, editable) => {
      const reg = map.get(column.rendererType);
      if (!reg) {
        // Unknown renderer type → safe text fallback (no silent blank cells).
        // Read 'text' live so a consumer's register('text', …) override is honored.
        // eslint-disable-next-line no-console
        if (typeof console !== 'undefined') {
          console.warn(`[grid-kit] No renderer registered for "${column.rendererType}"; using text.`);
        }
        return (map.get('text') as CellRegistration).read as never;
      }
      const canEdit =
        editable &&
        !!column.editorType &&
        column.editorType !== 'none' &&
        !column.isLocked &&
        !!reg.edit;
      return (canEdit ? reg.edit! : reg.read) as never;
    },
  };

  return registry;
}
