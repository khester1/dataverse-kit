/**
 * Framework-agnostic threshold resolution (progress / KPI coloring).
 */

export type ThresholdLevel = 'ok' | 'warning' | 'danger';

export interface Thresholds {
  warning?: number;
  danger?: number;
}

/**
 * Resolve a value to a threshold level.
 * - `direction: 'desc'` (default): lower is worse (e.g. completion %).
 * - `direction: 'asc'`: higher is worse (e.g. error count).
 */
export function resolveThreshold(
  value: number,
  thresholds?: Thresholds,
  direction: 'desc' | 'asc' = 'desc'
): ThresholdLevel {
  if (!thresholds) return 'ok';
  const { warning, danger } = thresholds;
  if (direction === 'desc') {
    if (danger !== undefined && value <= danger) return 'danger';
    if (warning !== undefined && value <= warning) return 'warning';
  } else {
    if (danger !== undefined && value >= danger) return 'danger';
    if (warning !== undefined && value >= warning) return 'warning';
  }
  return 'ok';
}
