import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    // node env: the tests exercise the dev-server token provider (no DOM needed).
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
