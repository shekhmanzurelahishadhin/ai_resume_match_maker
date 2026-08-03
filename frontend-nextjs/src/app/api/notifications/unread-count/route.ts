// GET /api/notifications/unread-count
// Returns just the unread count for the bell badge.

import { ok, requireUser } from "@/lib/api";
import { getUnreadCount } from "@/lib/notifications/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const got = await requireUser();
  if ("response" in got) return got.response;
  const { user } = got;
  const count = await getUnreadCount(user.id);
  return ok({ count });
}
