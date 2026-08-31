// Vitest configuration — node environment, tests in tests/, alias `@` → src/.
//
// The frontend is a pure client of the Laravel API, so there is no database to
// set up here: tests stub `fetch` rather than talking to a real backend.
// End-to-end API behaviour is covered by the Laravel PHPUnit suite.

import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 15_000,
  },
});
