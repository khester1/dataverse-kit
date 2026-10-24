import { createContext, useContext } from 'react';
import type { SurfaceLook } from '../core/ceLayout';

/**
 * Form-level appearance: `'default'` (the kit's existing look) or `'ce'` (the measured Dynamics CE
 * model-driven form). `FormSurface` provides it and layouts read it, the same way `DensityContext`
 * cascades density, so a single `look` on the form reaches every row and column.
 */
export const LookContext = createContext<SurfaceLook>('default');

/** Read the ambient surface look (defaults to `'default'` outside a provider). */
export const useLook = (): SurfaceLook => useContext(LookContext);
