/**
 * Event colours.
 *
 * ★ Without FullCalendar Premium there are no resource lanes, so "appointments by location"
 *   is expressed as ONE COLOUR PER GROUP. `groupColor` is deterministic (same key → same colour
 *   on every load and every machine), which is what lets a person learn the legend.
 * ★ Every palette entry carries white text at >= 4.5:1 (WCAG AA, normal text) — asserted by a
 *   test, not by eye. Host-supplied colours (Dataverse option colours are often pale) get their
 *   text colour from `readableTextOn` instead of assuming white; a well-known client control
 *   hard-coded white on yellow, which is ~1.4:1.
 */
export const GROUP_PALETTE: readonly string[] = [
  '#0f6cbd', // blue
  '#107c10', // green
  '#c50f1f', // red
  '#8764b8', // lavender
  '#ae4b00', // dark orange
  '#03787c', // teal
  '#4f52b2', // indigo
  '#8a5b00', // dark gold
  '#c0077d', // magenta
  '#5c2e91', // purple
];

/** FNV-1a — tiny, stable across engines, good enough spread for a 10-colour palette. */
function hash(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function groupColor(key: string, palette: readonly string[] = GROUP_PALETTE): string {
  return palette[hash(key) % palette.length];
}

/** `#rgb` / `#rrggbb` → [r, g, b] 0-255, or null for anything else (named colours, var()). */
export function parseHex(color: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number): number => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio between two hex colours, or null if either cannot be parsed. */
export function contrastRatio(a: string, b: string): number | null {
  const pa = parseHex(a);
  const pb = parseHex(b);
  if (!pa || !pb) return null;
  const [hi, lo] = [luminance(pa), luminance(pb)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Black or white text, whichever reads better on `background`. Unparseable backgrounds
 * (a CSS variable, a named colour) get `undefined`, i.e. the theme's own event text colour.
 */
export function readableTextOn(background: string): '#000000' | '#ffffff' | undefined {
  const onWhite = contrastRatio(background, '#ffffff');
  const onBlack = contrastRatio(background, '#000000');
  if (onWhite === null || onBlack === null) return undefined;
  return onWhite >= onBlack ? '#ffffff' : '#000000';
}
