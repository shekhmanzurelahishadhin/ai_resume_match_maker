// POST /api/notifications/register-device
// Register or refresh a device token for the current user.

import { ok, err, parseJson, requireUser } from "@/lib/api";
import { registerDeviceSchema } from "@/lib/validators/notification";
import { registerDeviceToken } from "@/lib/notifications/service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const got = await requireUser();
  if ("response" in got) return got.response;
  const { user } = got;

  const body = await parseJson<unknown>(req);
  if (!body) return err("Invalid JSON body", 400);

  const parsed = registerDeviceSchema.safeParse(body);
  if (!parsed.success) {
    return err("Validation failed", 422, "VALIDATION_ERROR", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }

  try {
    const token = await registerDeviceToken({
      userId: user.id,
      deviceToken: parsed.data.deviceToken,
      deviceType: parsed.data.deviceType,
      browserInfo: parsed.data.browserInfo,
    });
    return ok({ deviceToken: token }, 201);
  } catch (e) {
    return err(
      e instanceof Error ? e.message : "Failed to register device",
      400,
      "REGISTER_FAILED",
    );
  }
}
