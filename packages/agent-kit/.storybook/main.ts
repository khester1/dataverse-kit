import type { StorybookConfig } from '@storybook/react-vite';
import type { PluginOption } from 'vite';
import react from '@vitejs/plugin-react';

const config: StorybookConfig = {
  framework: { name: '@storybook/react-vite', options: {} },
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs'],
  core: { disableTelemetry: true },
  viteFinal: async (cfg) => {
    // Storybook 10's react-vite framework no longer wires @vitejs/plugin-react
    // itself — without it stories render but get no Fast Refresh.
    cfg.plugins = [...(cfg.plugins ?? []), react() as unknown as PluginOption];
    return cfg;
  },
};
export default config;
