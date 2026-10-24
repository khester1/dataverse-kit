/**
 * Color manipulation utilities for Dynamics UI components.
 */

/**
 * Status color mapping for common Dynamics status values.
 */
export const STATUS_COLORS: Record<string, string> = {
  active: '#107c10',
  inactive: '#a19f9d',
  open: '#0078d4',
  closed: '#605e5c',
  won: '#107c10',
  lost: '#d13438',
  qualified: '#0078d4',
  disqualified: '#a19f9d',
  draft: '#8a8886',
  submitted: '#0078d4',
  approved: '#107c10',
  rejected: '#d13438',
  pending: '#ca5010',
  'in progress': '#0078d4',
  completed: '#107c10',
  cancelled: '#a19f9d',
  new: '#0078d4',
  resolved: '#107c10',
};

/**
 * Calculate YIQ brightness of a hex color.
 * @returns brightness value 0-255 (higher = lighter)
 */
export function getYIQBrightness(hexColor: string): number {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

/**
 * Get contrasting text color (black or white) for a given background.
 */
export function getContrastColor(hexColor: string): string {
  if (!isValidHexColor(hexColor)) return '#000000';
  const brightness = getYIQBrightness(normalizeHexColor(hexColor));
  return brightness >= 128 ? '#000000' : '#ffffff';
}

/**
 * Check if a string is a valid hex color.
 */
export function isValidHexColor(color: string): boolean {
  return /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
}

/**
 * Normalize a hex color to always include the # prefix.
 */
export function normalizeHexColor(color: string): string {
  if (color.startsWith('#')) return color;
  return `#${color}`;
}

/**
 * Lighten a hex color by a percentage (0-100).
 */
export function lightenColor(hexColor: string, percent: number): string {
  const hex = normalizeHexColor(hexColor).replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const amount = Math.round(255 * (percent / 100));

  const newR = Math.min(255, r + amount);
  const newG = Math.min(255, g + amount);
  const newB = Math.min(255, b + amount);

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Darken a hex color by a percentage (0-100).
 */
export function darkenColor(hexColor: string, percent: number): string {
  const hex = normalizeHexColor(hexColor).replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const amount = Math.round(255 * (percent / 100));

  const newR = Math.max(0, r - amount);
  const newG = Math.max(0, g - amount);
  const newB = Math.max(0, b - amount);

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Get a color for a Dynamics state code value.
 */
export function getStateCodeColor(stateCode: number): string {
  switch (stateCode) {
    case 0:
      return STATUS_COLORS.active;
    case 1:
      return STATUS_COLORS.inactive;
    default:
      return STATUS_COLORS.inactive;
  }
}
