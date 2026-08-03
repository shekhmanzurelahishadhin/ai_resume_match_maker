// PUT /api/notifications/{id}/read
// Mark a single notification as read (must be owned by the current user).

import { ok, notFound, err, requireUser } from "@/lib/api";
import { markAsRead } from "@/lib/notifications/service";

export const dynamic = "force-dynamic";

export async function PUT(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const got = await requireUser();
  if ("response" in got) return got.response;
  const { user } = got;

  const { id } = await ctx.params;
  if (!id) return err("Missing id", 400);

  const updated = await markAsRead(id, user.id);
  if (!updated) return notFound("Notification not found");
  return ok({ notification: updated });
}
