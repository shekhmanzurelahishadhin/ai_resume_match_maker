// GET /api/user — current authenticated user (no password hash).

import { getCurrentUser, ok, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  return ok({ user });
}
