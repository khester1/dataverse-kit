import type { BrandVariants, Theme } from '@fluentui/react-components';
import {
  createDynamicsV9Theme,
  createDynamicsV9DarkTheme,
  dynamicsBrandRamp,
} from '@dataverse-kit/fluent-theme';
import { typography, radius } from '@dataverse-kit/design-tokens';

/**
 * The Dynamics CE look, for conversational surfaces.
 *
 * ★ The brand ramp and the base builders are NOT declared here — they come from
 *   `@dataverse-kit/fluent-theme`, the single declaration shared with grid-kit/v9 and
 *   surface-kit/v9. agent-kit adds only the two things that differ for a chat surface.
 */
function applyAgentOverrides(base: Theme): Theme {
  return {
    ...base,
    // Fluent's web theme is close to CE but does not pin the Web variant of Segoe.
    fontFamilyBase: typography.fontFamily,
    // CE is squarer than Fluent web's default. Bubbles opt back up to borderRadiusLarge.
    borderRadiusMedium: radius.card,
  };
}

export function createAgentTheme(brand: BrandVariants = dynamicsBrandRamp as BrandVariants): Theme {
  return applyAgentOverrides(createDynamicsV9Theme(brand));
}

export function createAgentDarkTheme(
  brand: BrandVariants = dynamicsBrandRamp as BrandVariants,
): Theme {
  return applyAgentOverrides(createDynamicsV9DarkTheme(brand));
}

/** Memoized module singletons. */
export const agentTheme: Theme = createAgentTheme();
export const agentDarkTheme: Theme = createAgentDarkTheme();

export interface ResolveHostThemeInput {
  /** An explicit theme always wins. */
  theme?: Theme;
  /** The Dynamics host's own theme — `context.fluentDesignLanguage?.tokenTheme` in a PCF. */
  hostTheme?: Theme;
  isDarkTheme?: boolean;
}

/**
 * Decide which theme to render with. ONE ladder, called by both `AgentKitHostProvider` and
 * the Storybook decorator so the two cannot drift.
 *
 * ★ The host theme wins over the kit's. That is the rule worth a gate, and the test that can
 *   see it must supply a host theme whose brand DIFFERS from the kit's — a resolver that
 *   silently ignored `hostTheme` looks identical to a correct one when the two happen to
 *   agree.
 *
 * ★ The fallback is the Dynamics theme, not stock `webLightTheme`. The gallery controls fall
 *   back to `webLightTheme` because in-host they always receive a real theme; a standalone
 *   SWA or custom page has none, and stock Fluent does not read as Dynamics CE.
 */
export function resolveHostTheme(input: ResolveHostThemeInput = {}): Theme {
  if (input.theme) return input.theme;
  if (input.hostTheme) return input.hostTheme;
  return input.isDarkTheme ? agentDarkTheme : agentTheme;
}
