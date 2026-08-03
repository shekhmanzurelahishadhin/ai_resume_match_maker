// POST /api/notifications/digest/run
// Admin-only manual trigger for the daily digest.
// Guarded by `x-admin-secret` header compared against `process.env.ADMIN_SECRET`.

import { ok, unauthorized } from "@/lib/api";
import { sendDailyDigest } from "@/lib/notifications/daily-digest";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const provided = req.headers.get("x-admin-secret");
  const expected = process.env.ADMIN_SECRET;
  if (!expected || provided !== expected) {
    return unauthorized("Invalid admin secret");
  }
  const result = await sendDailyDigest();
  return ok({ result });
}
