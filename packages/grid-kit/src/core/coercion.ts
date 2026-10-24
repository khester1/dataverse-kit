/**
 * Framework-agnostic value coercion. No React / no Fluent imports (enforced by
 * the package ESLint guard on src/core/**).
 */

export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function toBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const s = String(value).toLowerCase();
  return s === 'true' || s === '1' || s === 'yes';
}

export function toDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (value === null || value === undefined || value === '') return null;
  const d = new Date(value as string | number);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toDisplayString(value: unknown): string {
  return value !== null && value !== undefined ? String(value) : '';
}
