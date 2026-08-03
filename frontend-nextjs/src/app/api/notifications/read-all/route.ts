// PUT /api/notifications/read-all
// Mark all of the current user's unread notifications as read.

import { ok, requireUser } from "@/lib/api";
import { markAllAsRead } from "@/lib/notifications/service";

export const dynamic = "force-dynamic";

export async function PUT() {
  const got = await requireUser();
  if ("response" in got) return got.response;
  const { user } = got;

  const count = await markAllAsRead(user.id);
  return ok({ updated: count });
}
