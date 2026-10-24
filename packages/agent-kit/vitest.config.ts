import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // ★ `globals: true` is load-bearing: it is what lets @testing-library/react register its
    // automatic afterEach(cleanup). grid-kit needs explicit cleanup() calls precisely
    // because it has no vitest config and therefore no globals.
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
