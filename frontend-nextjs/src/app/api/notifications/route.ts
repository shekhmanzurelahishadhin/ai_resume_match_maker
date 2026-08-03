// GET /api/notifications
// Paginated list of the current user's notifications.

import { ok, requireUser, parsePagination } from "@/lib/api";
import { getUserNotifications } from "@/lib/notifications/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const got = await requireUser();
  if ("response" in got) return got.response;
  const { user } = got;

  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get("unreadOnly") === "true";
  const { page, pageSize } = parsePagination(req, 15);

  const result = await getUserNotifications(user.id, { page, pageSize, unreadOnly });
  return ok(result);
}
