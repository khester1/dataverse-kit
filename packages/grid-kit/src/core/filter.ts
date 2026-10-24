/**
 * Framework-agnostic filter model + predicate engine. No React / no Fluent
 * imports (enforced by the package ESLint guard on src/core/**).
 *
 * The operator vocabulary uses FetchXML names (`eq`/`like`/`begins-with`/…) so a
 * consumer can map a `GridFilterModel` onto a server-side FetchXML / OData query
 * (e.g. `@dataverse-kit/runtime`) 1:1 — grid-kit applies it client-side here.
 */
import { toNumber, toBool, toDate, toDisplayString } from './coercion';
import { filterableFields, type FilterFieldType } from './filterFields';
import { columnDisplayText } from './displayText';
import type { ColumnDef } from '../types';

export type FilterOperator =
  | 'eq'
  | 'ne'
  | 'like'
  | 'not-like'
  | 'begins-with'
  | 'ends-with'
  | 'gt'
  | 'ge'
  | 'lt'
  | 'le'
  | 'on-or-after'
  | 'on-or-before'
  | 'in'
  | 'not-in'
  | 'null'
  | 'not-null';

/** How the conditions combine: `all` = AND, `any` = OR. */
export type FilterMatch = 'all' | 'any';

/**
 * One filter condition. Values are strings (FetchXML-aligned); `values` holds the
 * list for `in`/`not-in`. `null`/`not-null` need no value.
 */
export interface FilterCondition {
  fieldName: string;
  operator: FilterOperator;
  value?: string;
  values?: string[];
}

/** A built filter: a flat list of conditions combined by `match`. */
export interface GridFilterModel {
  match: FilterMatch;
  conditions: FilterCondition[];
}

// ★ The explicit `<FilterOperator>` is load-bearing under TypeScript 4.9, which is what the
// `web-resource` export target pins (react-scripts 5 peers `typescript@^4`, and the repo's own
// note records that a TS5 bump there breaks the CRA dependency tree). TS 5.3 infers the element
// type from the annotation; 4.9 widens to `Set<string>` and rejects the assignment with TS2322.
// The other targets are on 5.3, so this compiled everywhere the gates looked.
const NO_VALUE_OPS: ReadonlySet<FilterOperator> = new Set<FilterOperator>(['null', 'not-null']);
const MULTI_VALUE_OPS: ReadonlySet<FilterOperator> = new Set<FilterOperator>(['in', 'not-in']);

/** Whether `operator` needs an operand value (false for `null`/`not-null`). */
export function operatorRequiresValue(operator: FilterOperator): boolean {
  return !NO_VALUE_OPS.has(operator);
}

/** Whether `operator` takes a list of values (`in`/`not-in`). */
export function operatorIsMultiValue(operator: FilterOperator): boolean {
  return MULTI_VALUE_OPS.has(operator);
}

/** A condition is applied only when fully specified (gates incomplete rows out). */
export function isConditionComplete(c: FilterCondition): boolean {
  if (!c.fieldName || !c.operator) return false;
  if (!operatorRequiresValue(c.operator)) return true;
  if (operatorIsMultiValue(c.operator)) return Array.isArray(c.values) && c.values.length > 0;
  return c.value !== undefined && c.value !== null && c.value !== '';
}

const isEmpty = (v: unknown): boolean => v === null || v === undefined || v === '';
const asText = (v: unknown): string => toDisplayString(v).toLowerCase();

/**
 * Compare raw vs operand numerically, else by date. `undefined` ⇒ not comparable.
 * Number-first is deliberate: a bare-year operand like `"2024"` compares as the
 * number 2024 (the date editor always emits a full `YYYY-MM-DD`, never a bare year).
 */
function compare(raw: unknown, operand: string): number | undefined {
  const a = toNumber(raw);
  const b = toNumber(operand);
  if (a !== null && b !== null) return a === b ? 0 : a < b ? -1 : 1;
  const da = calendarDay(raw);
  const db = calendarDay(operand);
  if (da !== undefined && db !== undefined) return da === db ? 0 : da < db ? -1 : 1;
  return undefined;
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * The calendar day a value is SHOWN as, as a sortable number (yyyymmdd). The filter UI picks a day,
 * not an instant. ★ A DATE-ONLY value ("2026-06-15") is that day everywhere; a DATETIME is the
 * viewer's LOCAL day — what the cell displays. The shipped rule compared both by UTC day, so a record
 * at 2026-06-15T14:30Z, shown as Jun 16 at UTC+14, matched "on Jun 15" (pinned in `filter.tz.test.ts`,
 * which runs under TZ=Pacific/Kiritimati — in UTC, where CI runs, the two rules agree — and under
 * America/Los_Angeles, the only side where the date-only branch can fail).
 * ★ Known divergence, not this function's: with no `FormattedValue` annotation, dynamics-utils'
 *   `formatDate` renders a date-only value via a UTC-midnight `Date`, so WEST of UTC the CELL shows the
 *   previous day while this compares the stored day. The filter matches the data; the cell is wrong.
 */
function calendarDay(v: unknown): number | undefined {
  if (typeof v === 'string') {
    const m = DATE_ONLY.exec(v.trim());
    if (m) return Number(m[1]) * 10000 + Number(m[2]) * 100 + Number(m[3]);
  }
  const d = toDate(v);
  return d ? d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate() : undefined;
}

/** Loose equality: numeric when both coerce to numbers, else case-insensitive text. */
function looseEq(raw: unknown, operand: string): boolean {
  const a = toNumber(raw);
  const b = toNumber(operand);
  if (a !== null && b !== null) return a === b;
  return asText(raw) === operand.trim().toLowerCase();
}

/**
 * Equality used by `eq`/`ne`/`in`/`not-in`. Boolean operands (`'true'`/`'false'`
 * from the Yes/No editor) compare via `toBool`, so a row stored as a JS boolean,
 * `1`/`0`, or `'1'`/`'0'` (a Dataverse bit field) all match. Otherwise: text/numeric
 * loose-equality, then a date/number `compare` so a `Date` (or date-string) still
 * matches by calendar day — without this, `eq` on a date column never matched.
 */
function valuesEqual(raw: unknown, operand: string): boolean {
  if (operand === 'true' || operand === 'false') return toBool(raw) === (operand === 'true');
  if (looseEq(raw, operand)) return true;
  return compare(raw, operand) === 0;
}

/**
 * Evaluate one condition against a raw field value. Equality/relational compares
 * are coercion-based: when both sides parse as numbers they compare numerically
 * (so a numeric-looking text id like `'007'` equals `'7'`), dates compare by day,
 * else case-insensitive text. Assumes a complete condition (see
 * `isConditionComplete`) — `applyFilters` drops incomplete ones first; calling this
 * directly on e.g. a `not-in` with no `values` returns `true` (matches everything).
 */
export function evalCondition(raw: unknown, c: FilterCondition): boolean {
  const operand = c.value ?? '';
  // ★ A multi-select optionset's value is an ARRAY ([1, 2]). Coerced whole it became the text "1,2",
  //   so `eq`/`in` never matched and `not-in` matched everything. Per element instead: `eq` = contains,
  //   `in` = any overlap; `ne`/`not-in` are their negations; an empty array is empty.
  if (Array.isArray(raw)) {
    const has = (operandValue: string): boolean => raw.some((x) => valuesEqual(x, operandValue));
    switch (c.operator) {
      case 'null':
        return raw.length === 0;
      case 'not-null':
        return raw.length > 0;
      case 'eq':
        return has(operand);
      case 'ne':
        return !has(operand);
      case 'in':
        return (c.values ?? []).some(has);
      case 'not-in':
        return !(c.values ?? []).some(has);
      default:
        break; // text operators fall through to the joined text below
    }
  }
  switch (c.operator) {
    case 'null':
      return isEmpty(raw);
    case 'not-null':
      return !isEmpty(raw);
    case 'eq':
      return valuesEqual(raw, operand);
    case 'ne':
      return !valuesEqual(raw, operand);
    case 'like':
      return asText(raw).includes(operand.toLowerCase());
    case 'not-like':
      return !asText(raw).includes(operand.toLowerCase());
    case 'begins-with':
      return asText(raw).startsWith(operand.toLowerCase());
    case 'ends-with':
      return asText(raw).endsWith(operand.toLowerCase());
    case 'in':
      return (c.values ?? []).some((v) => valuesEqual(raw, v));
    case 'not-in':
      return !(c.values ?? []).some((v) => valuesEqual(raw, v));
    case 'gt': {
      const r = compare(raw, operand);
      return r !== undefined && r > 0;
    }
    case 'ge':
    case 'on-or-after': {
      const r = compare(raw, operand);
      return r !== undefined && r >= 0;
    }
    case 'lt': {
      const r = compare(raw, operand);
      return r !== undefined && r < 0;
    }
    case 'le':
    case 'on-or-before': {
      const r = compare(raw, operand);
      return r !== undefined && r <= 0;
    }
    default:
      return true;
  }
}

function defaultGetValue(item: unknown, fieldName: string): unknown {
  return item && typeof item === 'object' ? (item as Record<string, unknown>)[fieldName] : undefined;
}

/**
 * Filter `items` by `model` (client-side, in-memory). Incomplete conditions are
 * ignored; with no complete condition the input is returned unchanged. `match`
 * `'all'` ⇒ every condition must pass (AND); `'any'` ⇒ at least one (OR).
 */
export function applyFilters<T>(
  items: T[],
  model: GridFilterModel | undefined,
  getValue: (item: T, fieldName: string) => unknown = defaultGetValue
): T[] {
  if (!model) return items;
  const active = model.conditions.filter(isConditionComplete);
  if (active.length === 0) return items;
  const matchAll = model.match !== 'any';
  return items.filter((item) =>
    matchAll
      ? active.every((c) => evalCondition(getValue(item, c.fieldName), c))
      : active.some((c) => evalCondition(getValue(item, c.fieldName), c))
  );
}

// ─── Column-aware evaluation (decision 1: text operators match what the grid SHOWS) ───────────────

const TEXT_OPERATORS: ReadonlySet<FilterOperator> = new Set<FilterOperator>(['like', 'not-like', 'begins-with', 'ends-with']);
const NEGATED: Partial<Record<FilterOperator, FilterOperator>> = { 'not-like': 'like', ne: 'eq' };

/**
 * Whether `c` matches a row whose raw value is `raw` and whose DISPLAYED text is `text`, for a field of
 * type `fieldType`. Text operators — and `eq`/`ne` on text & lookup fields — match if EITHER the raw value
 * OR the displayed text matches (a lookup's GUID or its name; a pasted GUID keeps working), and the
 * negations are the exact NOT of that. optionset / boolean / date / number / currency compare RAW only:
 * their operands are codes, `'true'`, ISO days and numbers, which a display string ("Active", "Yes",
 * "6/15/2026", "1,000") would never equal.
 */
export function evalConditionForField(raw: unknown, text: string, c: FilterCondition, fieldType: FilterFieldType): boolean {
  const textual = fieldType === 'text' || fieldType === 'lookup';
  const usesText = TEXT_OPERATORS.has(c.operator) || (textual && (c.operator === 'eq' || c.operator === 'ne'));
  if (!usesText) return evalCondition(raw, c);
  const positive = (NEGATED[c.operator] ?? c.operator) as FilterOperator;
  const pc: FilterCondition = { ...c, operator: positive };
  const matches = evalCondition(raw, pc) || (text !== '' && evalCondition(text, pc));
  return positive === c.operator ? matches : !matches;
}

interface ResolvedField<T> {
  fieldType: FilterFieldType;
  column: ColumnDef<T>;
}

function resolveFields<T>(columns: ColumnDef<T>[]): Map<string, ResolvedField<T>> {
  const byField = new Map(columns.map((col) => [col.fieldName, col] as const));
  return new Map(filterableFields(columns).map((f) => [f.key, { fieldType: f.fieldType, column: byField.get(f.key) as ColumnDef<T> }]));
}

/** The complete conditions that target a field the grid still offers. */
function applicableConditions<T>(model: GridFilterModel | undefined, fields: Map<string, ResolvedField<T>>): FilterCondition[] {
  return (model?.conditions ?? []).filter((c) => isConditionComplete(c) && fields.has(c.fieldName));
}

/**
 * Filter `items` by `model` against the grid's `columns` (client-side). Like `applyFilters`, plus:
 * text operators match the displayed text (see `evalConditionForField`), and a condition on a field
 * no longer offered (removed, `isFilterable: false`, a host `__…` column) is IGNORED — the shipped rule
 * read `undefined` for it and emptied the grid while the badge still counted it.
 */
export function applyColumnFilters<T>(items: T[], model: GridFilterModel | undefined, columns: ColumnDef<T>[]): T[] {
  const fields = resolveFields(columns);
  const active = applicableConditions(model, fields);
  if (active.length === 0) return items;
  const matchAll = model?.match !== 'any';
  const test = (item: T, c: FilterCondition): boolean => {
    const f = fields.get(c.fieldName) as ResolvedField<T>;
    return evalConditionForField(defaultGetValue(item, c.fieldName), columnDisplayText(item, f.column), c, f.fieldType);
  };
  return items.filter((item) => (matchAll ? active.every((c) => test(item, c)) : active.some((c) => test(item, c))));
}

/** The "Filters (n)" count: complete conditions on fields the grid still offers. */
export function activeFilterCount<T>(model: GridFilterModel | undefined, columns: ColumnDef<T>[]): number {
  return applicableConditions(model, resolveFields(columns)).length;
}

/**
 * `model` without conditions on fields the grid no longer offers (incomplete conditions on offered
 * fields are kept — they are the user's half-built rows). Returns `model` itself when nothing is
 * dropped, so it is safe to call during render. Used to seed `initialFilterModel` once columns exist
 * and to hand the panel only rows it can show.
 */
export function pruneFilterModel<T>(model: GridFilterModel, columns: ColumnDef<T>[]): GridFilterModel {
  const offered = new Set(filterableFields(columns).map((f) => f.key));
  const conditions = model.conditions.filter((c) => offered.has(c.fieldName));
  return conditions.length === model.conditions.length ? model : { ...model, conditions };
}
