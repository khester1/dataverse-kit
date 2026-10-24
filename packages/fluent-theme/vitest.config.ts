import { defineConfig } from 'vitest/config';

// Pure-TS package: no DOM, no React. The default `node` environment is correct here and
// is deliberately NOT jsdom — nothing in this package touches the document.
export default defineConfig({
  test: { globals: true, include: ['src/**/*.{test,spec}.{ts,tsx}'] },
});
