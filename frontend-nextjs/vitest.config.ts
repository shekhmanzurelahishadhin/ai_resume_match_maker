// Vitest configuration — node environment, tests in tests/, alias `@` → src/.
//
// Tests call Next.js route handlers directly (they export GET/POST/PUT/DELETE
// functions taking a standard Request and returning a Response). No dev
// server is required.

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
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    // `prisma db push` in setup can take a moment; allow generous per-test time.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Single-forked worker — the in-memory cache + a single test DB file are
    // shared global state; running tests in parallel would race.
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
    // Inline CJS deps whose default-export interop Vite would otherwise mangle.
    // pdf-parse in particular exports a function via `module.exports = ...`,
    // and Vite's pre-bundler sometimes wraps it in a way that loses the
    // callable shape.
    server: {
      deps: {
        inline: ["pdf-parse"],
      },
    },
  },
});
