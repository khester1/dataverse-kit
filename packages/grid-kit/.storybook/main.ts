import type { StorybookConfig } from '@storybook/react-vite';
import type { PluginOption } from 'vite';
import react from '@vitejs/plugin-react';

// Dedicated grid-kit Storybook (mirrors the reusable-components instance). The
// grid-kit story globs were removed from the shared apps/storybook so grids live
// only here. `@khester/dynamics-cell-renderers` + `@khester/dynamics-utils`
// resolve to their built `dist` (via node_modules) — the same as the rollup build
// and the tsconfig `paths` — so storybook + typecheck:stories never drift.
const config: StorybookConfig = {
  framework: { name: '@storybook/react-vite', options: {} },
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs'],
  core: { disableTelemetry: true },
  viteFinal: async (cfg) => {
    // Storybook 10's react-vite framework no longer wires @vitejs/plugin-react
    // itself — without it stories render but get no Fast Refresh (every edit
    // becomes a full page reload that loses Controls state).
    // The cast bridges a type-identity mismatch only: plugin-react is hoisted
    // next to the monorepo root's vite 5, while this builder uses the vite 7
    // nested under this package. The plugin objects are duck-typed at runtime.
    cfg.plugins = [...(cfg.plugins ?? []), react() as unknown as PluginOption];
    return cfg;
  },
};

export default config;
