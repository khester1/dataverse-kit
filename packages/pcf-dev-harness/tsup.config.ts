import { defineConfig } from "tsup";

/**
 * ONE multi-entry build (mirrors surface-kit — same repo). NOT an array of configs: two
 * configs each with `clean: true` would wipe the other's output. A single config with two
 * entries emits `dist/shell.*` + `dist/node.*` in one pass and cleans once.
 *
 * `target: es2020` covers both entries — the browser `shell` and the Node `node` entry (Node 18+
 * ⊇ es2020), so no separate node target is needed. react / react-dom / vite stay external (peers);
 * Node built-ins are external by default under tsup's node platform.
 */
export default defineConfig({
  entry: {
    shell: "src/shell/index.ts",
    node: "src/node/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  target: "es2020",
  // Match the filenames declared in package.json exports (`.cjs` / `.mjs`).
  outExtension: ({ format }) => ({ js: format === "cjs" ? ".cjs" : ".mjs" }),
  external: ["react", "react-dom", "vite"],
});
