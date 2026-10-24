import type { StorybookConfig } from '@storybook/react-vite';
import type { PluginOption } from 'vite';
import react from '@vitejs/plugin-react';

// Dedicated surface-kit Storybook (mirrors grid-kit :6007 and reusable-components
// :6008 — surface-kit runs on :6009). Container-focused: every surface, a size
// matrix per overlay, layout galleries, responsive-resize demos, and grid-in-
// container integration stories. Opted OUT of the shared apps/storybook so surfaces
// live only here; re-aggregation is one glob + one alias away if ever wanted.
const config: StorybookConfig = {
  framework: { name: '@storybook/react-vite', options: {} },
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs'],
  core: { disableTelemetry: true },
  viteFinal: async (cfg) => {
    // Storybook 10's react-vite framework no longer wires @vitejs/plugin-react
    // itself — without it stories render but get no Fast Refresh. The cast bridges
    // a vite-version type-identity mismatch only (duck-typed at runtime).
    cfg.plugins = [...(cfg.plugins ?? []), react() as unknown as PluginOption];
    return cfg;
  },
};

export default config;
