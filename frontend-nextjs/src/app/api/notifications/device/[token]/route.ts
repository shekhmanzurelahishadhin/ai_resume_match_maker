// DELETE /api/notifications/device/{token}
// Deactivate a device token for the current user (soft delete).

import { ok, err, requireUser } from "@/lib/api";
import { deactivateDeviceToken } from "@/lib/notifications/service";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const got = await requireUser();
  if ("response" in got) return got.response;
  const { user } = got;

  const { token } = await ctx.params;
  if (!token || token.length < 16) {
    return err("Invalid device token", 400, "INVALID_TOKEN");
  }

  const count = await deactivateDeviceToken(token, user.id);
  if (count === 0) {
    return ok({ deactivated: false, message: "Token not found for this user" });
  }
  return ok({ deactivated: true, count });
}
