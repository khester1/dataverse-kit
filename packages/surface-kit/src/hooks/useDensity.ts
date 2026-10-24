import { createContext, useContext } from 'react';
import type { Density } from '../tokens/density';

/**
 * Form-level spacing density. `FormSurface` provides it; `Section` (and any future
 * container) reads it via `useDensity()`, so a single `density` switch on the form
 * cascades to every section instead of being set per-section. Defaults to
 * `'comfortable'` (the Dynamics default) — `'compact'` scales spacing by 0.75.
 */
export const DensityContext = createContext<Density>('comfortable');

/** Read the ambient spacing density (defaults to `'comfortable'` outside a provider). */
export const useDensity = (): Density => useContext(DensityContext);
