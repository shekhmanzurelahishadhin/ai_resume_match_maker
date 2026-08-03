// Global test setup — runs once before any test file.
//
// Responsibilities:
//   1. Set environment variables (DATABASE_URL → test SQLite file,
//      NEXTAUTH_SECRET, UPLOADS_DIR) BEFORE any module that reads them is
//      imported. This is why this file must be listed in
//      `vitest.config.ts#test.setupFiles` and runs before test files.
//   2. Mock `next-auth` so `getServerSession(authOptions)` returns a
//      controllable session per-test (see `tests/helpers.ts#loginAs`).
//   3. Mock `next/server#after` so background work scheduled via `after()`
//      can be awaited deterministically in tests (see
//      `tests/helpers.ts#waitForBackgroundWork`).
//   4. Ensure the test DB exists with the current schema. We delete any
//      existing test.db file and run `prisma db push` to recreate it.
//   5. Wipe all rows between tests so each test starts with a clean slate.
//   6. Clear the in-memory cache between tests so rate-limit buckets don't
//      leak across tests.

import { vi, beforeAll, beforeEach, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

// ---------- 1. environment ----------
const PROJECT_ROOT = path.resolve(__dirname, "..");
const TEST_DB_PATH = path.join(PROJECT_ROOT, "db", "test.db");
const TEST_DB_URL = `file:${TEST_DB_PATH}`;
const TEST_UPLOADS_DIR = path.join(PROJECT_ROOT, "uploads-test");

process.env.DATABASE_URL = TEST_DB_URL;
process.env.NEXTAUTH_SECRET = "test-secret-do-not-use-in-production";
process.env.NEXTAUTH_URL = "http://localhost:3000";
process.env.UPLOADS_DIR = TEST_UPLOADS_DIR;
process.env.NODE_ENV = "test";
// Empty HF key → AI fallback path (deterministic dictionary + TF-IDF).
process.env.HUGGINGFACE_API_KEY = "";

// ---------- 2. mock next-auth ----------
// `getServerSession` is the single hook the API layer uses to read the session.
// Mocking it here lets tests inject an arbitrary session per-test.
vi.mock("next-auth", () => {
  const mockGetServerSession = vi.fn(async () => null);
  return {
    default: vi.fn(() => ({
      // NextAuth handlers (GET/POST) — not exercised in unit tests.
      GET: vi.fn(),
      POST: vi.fn(),
    })),
    getServerSession: mockGetServerSession,
  };
});

// ---------- 3. mock next/server#after ----------
// Collect promises passed to `after(...)` so tests can await them. The real
// `after()` runs after the response is flushed — not deterministic enough
// for tests. Our mock captures the promise and lets the test drain it via
// `waitForBackgroundWork()`.
//
// We SERIALIZE the queued promises via an `afterChain`. SQLite (the test DB)
// doesn't tolerate concurrent writes well — "Response from the Engine was
// empty" errors fire when two `after()`s race. Serialization matches the
// production intent (`after()` work is meant to be background but each unit
// is internally consistent) and avoids the SQLite-specific contention.
const pendingAfterPromises: Array<Promise<unknown>> = [];
let afterChain: Promise<unknown> = Promise.resolve();
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: (promise: Promise<unknown>) => {
      const next = afterChain.then(() => promise.catch(() => undefined));
      pendingAfterPromises.push(next);
      afterChain = next;
    },
  };
});

// ---------- 4. ensure test DB ----------
async function recreateTestDb() {
  // Delete the test DB file + its SQLite journal sidecars.
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    try {
      await fs.unlink(`${TEST_DB_PATH}${suffix}`);
    } catch {
      // file doesn't exist — fine
    }
  }
  // Push the schema. `--skip-generate` because the client is already
  // generated at install time; we only need the DB schema applied.
  execSync("bunx prisma db push --skip-generate --accept-data-loss", {
    stdio: "pipe",
    cwd: PROJECT_ROOT,
    env: process.env,
  });
}

// ---------- 5/6. per-test cleanup ----------
async function wipeAllTables() {
  // Import lazily so the env-vars above are set first.
  const { db } = await import("@/lib/db");
  // Wipe in dependency order to avoid referential-action surprises.
  await db.match.deleteMany();
  await db.notification.deleteMany();
  await db.notificationPreference.deleteMany();
  await db.deviceToken.deleteMany();
  await db.resumeImprovement.deleteMany();
  await db.resumeVersion.deleteMany();
  await db.generatedResume.deleteMany();
  await db.resume.deleteMany();
  await db.jobPost.deleteMany();
  await db.aiCache.deleteMany();
  await db.rateLimitBucket.deleteMany();
  await db.user.deleteMany();
}

async function clearCache() {
  const { cache } = await import("@/lib/cache");
  await cache.clear();
}

beforeAll(async () => {
  await fs.mkdir(TEST_UPLOADS_DIR, { recursive: true });
  await recreateTestDb();
});

beforeEach(async () => {
  await wipeAllTables();
  await clearCache();
  // Drain any straggler `after()` promises before the next test starts.
  await Promise.all(pendingAfterPromises.splice(0)).catch(() => undefined);
  // Reset the next-auth mock to "logged out" by default.
  const { getServerSession } = await import("next-auth");
  vi.mocked(getServerSession).mockReset();
  vi.mocked(getServerSession).mockImplementation(async () => null);
});

afterAll(async () => {
  const { db } = await import("@/lib/db");
  await db.$disconnect();
  // Best-effort cleanup of the test DB file.
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    try {
      await fs.unlink(`${TEST_DB_PATH}${suffix}`);
    } catch {
      // ignore
    }
  }
});

// Re-export for helpers/tests to consume.
export { pendingAfterPromises };
