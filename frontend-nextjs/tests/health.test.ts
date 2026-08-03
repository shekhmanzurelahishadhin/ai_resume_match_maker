// GET /api/health — public health probe.

import { describe, it, expect } from "vitest";

import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("returns 200 with status=ok", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });

  it("includes a ISO-8601 timestamp", async () => {
    const res = await GET();
    const body = await res.json();
    expect(body.timestamp).toBeTypeOf("string");
    const t = Date.parse(body.timestamp);
    expect(Number.isFinite(t)).toBe(true);
    // Should be within the last minute.
    expect(Math.abs(Date.now() - t)).toBeLessThan(60_000);
  });

  it("reports a version string", async () => {
    const res = await GET();
    const body = await res.json();
    expect(body.version).toBeTypeOf("string");
    expect(body.version.length).toBeGreaterThan(0);
  });

  it("reports the DB as connected (test DB is up)", async () => {
    const res = await GET();
    const body = await res.json();
    expect(body.db).toBe("connected");
  });

  it("reports the cache backend as memory (no REDIS_URL set)", async () => {
    const res = await GET();
    const body = await res.json();
    expect(body.cache).toBe("memory");
  });
});
