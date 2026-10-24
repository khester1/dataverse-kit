// The Dynamics CE Fluent v9 theme builders — the v9 counterpart of surface-kit's v8
// `createDynamicsTheme()`. Both feed the SAME brand triad (brand / brandHover / brandDark)
// into their respective theme factories, so a Dynamics-blue button is #0078d4 whichever
// skin renders it.
import {
  createLightTheme,
  createDarkTheme,
  webLightTheme,
  type BrandVariants,
  type Theme,
} from '@fluentui/react-components';
import { dynamicsBrandRamp } from './brand';

// ★ The assignability check that makes ./brand's inferred type safe. If someone re-annotates
//   the ramp as `Record<number, string>` (an index signature, which does not satisfy
//   BrandVariants' sixteen required literal keys) this line fails to compile — at the
//   declaration, not at some downstream consumer's call site.
const defaultBrand: BrandVariants = dynamicsBrandRamp;

/**
 * Build a Fluent v9 `Theme` for the Dynamics surfaces. Defaults to the Dynamics-blue brand
 * ramp; pass a custom `BrandVariants` (e.g. from your org's brand) to override.
 * Wrap the app or subtree in `<FluentProvider theme={createDynamicsV9Theme()}>`.
 */
export function createDynamicsV9Theme(brand: BrandVariants = defaultBrand): Theme {
  return createLightTheme(brand);
}

/** Dark-mode variant of the Dynamics v9 theme (same brand ramp). */
export function createDynamicsV9DarkTheme(brand: BrandVariants = defaultBrand): Theme {
  return createDarkTheme(brand);
}

/** The default light Dynamics v9 theme (memoized module singleton). */
export const dynamicsV9Theme: Theme = createDynamicsV9Theme();

/** The default dark Dynamics v9 theme (memoized module singleton). */
export const dynamicsV9DarkTheme: Theme = createDynamicsV9DarkTheme();

/**
 * The Dynamics 365 CE model-driven "new look" theme: Fluent 2 web light, whose colours, shadows
 * and radii the new look uses unmodified.
 *
 * Measured on a live org (dynamics-ui-kit `apps/ce-parity/reference/`), every colour, shadow and
 * radius the new-look form renders is an unmodified `webLightTheme` token, and so is its brand.
 * Typography is NOT fully stock (tabs are 16px on a 28px line); that lives in the
 * `@dataverse-kit/design-tokens` `ceForm` metrics, which components apply on top of this theme. The tab
 * underline is `#0f6cbd` and links are `#115ea3`. That is Fluent's default web brand ramp, NOT
 * the classic Dynamics `#0078d4` that {@link createDynamicsV9Theme} pins. Use this theme when
 * the goal is to look identical to a current Dynamics form, and `createDynamicsV9Theme` when a
 * surface must match the classic blue.
 *
 * Returns a fresh copy so callers can override tokens without mutating Fluent's singleton.
 */
export function createDynamicsCeTheme(): Theme {
  return { ...webLightTheme };
}

/** The default CE new-look theme (module singleton). */
export const dynamicsCeTheme: Theme = createDynamicsCeTheme();
