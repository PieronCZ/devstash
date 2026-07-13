import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests are scoped to server actions and utilities (business logic) only —
// NOT React components. So we use the plain Node environment (no jsdom) and only
// pick up `*.test.ts` files under src.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
    globals: false,
    coverage: {
      provider: "v8",
      // Report coverage for the logic we actually test; exclude UI + generated code.
      include: ["src/lib/**", "src/actions/**"],
      exclude: ["src/**/*.{test,spec}.ts"],
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
