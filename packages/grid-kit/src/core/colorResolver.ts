/**
 * Framework-agnostic cell-color resolution. Wraps (does not reimplement)
 * @khester/dynamics-utils contrast + hex helpers.
 */
import { getContrastColor, normalizeHexColor } from '@khester/dynamics-utils';

export { getContrastColor, normalizeHexColor };

export interface ColorResolution {
  /** Map of value → background color. */
  colorMap?: Record<string | number, string>;
  /** Function deriving a background color from the value. */
  getBackgroundColor?: (value: string | number) => string;
}

/** Resolve the background color for a cell value, or undefined for none. */
export function resolveCellColor(value: unknown, res: ColorResolution): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (res.getBackgroundColor) return res.getBackgroundColor(value as string | number);
  if (res.colorMap) {
    const key = typeof value === 'number' ? value : String(value);
    return res.colorMap[key];
  }
  return undefined;
}
