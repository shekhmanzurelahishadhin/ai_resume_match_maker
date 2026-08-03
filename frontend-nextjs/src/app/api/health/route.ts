// GET /api/health — public health probe.
//
// Returns:
//   {
//     status: "ok",
//     timestamp: ISO8601,
//     version: package version,
//     db: "connected" | "error",
//     cache: "memory" | "redis"
//   }
//
// The endpoint is intentionally public (no auth) so that container
// orchestrators (Docker healthcheck, Kubernetes liveness/readiness probes,
// load balancers) can poll it without managing session credentials.
//
// The DB probe runs a `SELECT 1` via Prisma's `$queryRaw`. If the DB is
// unreachable the endpoint still returns 200 with `db: "error"` so that the
// probe itself doesn't 5xx — operators should alert on `db != "connected"`.

import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const APP_VERSION = process.env.npm_package_version ?? "0.0.0";

function detectCacheBackend(): "memory" | "redis" {
  // The default CacheService implementation in src/lib/cache.ts is in-memory.
  // When the operator swaps in a Redis-backed implementation (see
  // docs/DEPLOYMENT.md), they should set REDIS_URL — which we use here as
  // the signal that the cache backend is Redis.
  return process.env.REDIS_URL && process.env.REDIS_URL.length > 0
    ? "redis"
    : "memory";
}

async function probeDatabase(): Promise<"connected" | "error"> {
  try {
    await db.$queryRaw`SELECT 1`;
    return "connected";
  } catch (err) {
    console.warn(
      JSON.stringify({
        level: "warn",
        event: "health_db_probe_failed",
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return "error";
  }
}

export async function GET() {
  const dbStatus = await probeDatabase();
  const body = {
    status: "ok" as const,
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    db: dbStatus,
    cache: detectCacheBackend(),
  };
  return NextResponse.json(body, { status: 200 });
}
