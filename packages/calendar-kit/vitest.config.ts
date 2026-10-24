import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // `globals: true` lets @testing-library/react register its automatic cleanup (see agent-kit).
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // FullCalendar ships CSS imports; vitest must process them rather than choke on them.
    css: true,
  },
});
