// Spacing density multiplier — `comfortable` (Dynamics default) vs `compact`
// (denser forms / embedded PCF). Pure-TS.
export type Density = 'comfortable' | 'compact';

export const densityScale = {
  comfortable: 1,
  compact: 0.75,
} as const;

/** Scale a base spacing value (px) by the active density. */
export function scaleSpacing(value: number, density: Density = 'comfortable'): number {
  return Math.round(value * densityScale[density]);
}
