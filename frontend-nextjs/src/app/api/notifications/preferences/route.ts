// GET  /api/notifications/preferences
// PUT   /api/notifications/preferences

import { ok, err, parseJson, requireUser } from "@/lib/api";
import { updatePreferencesSchema } from "@/lib/validators/notification";
import { getOrCreatePreferences } from "@/lib/notifications/service";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const got = await requireUser();
  if ("response" in got) return got.response;
  const { user } = got;
  const prefs = await getOrCreatePreferences(user.id);
  return ok({
    preferences: {
      emailNotifications: prefs.emailNotifications,
      pushNotifications: prefs.pushNotifications,
      jobMatches: prefs.jobMatches,
      resumeAnalysis: prefs.resumeAnalysis,
      newJobs: prefs.newJobs,
      dailyDigest: prefs.dailyDigest,
    },
  });
}

export async function PUT(req: Request) {
  const got = await requireUser();
  if ("response" in got) return got.response;
  const { user } = got;

  const body = await parseJson<unknown>(req);
  if (!body) return err("Invalid JSON body", 400);

  const parsed = updatePreferencesSchema.safeParse(body);
  if (!parsed.success) {
    return err("Validation failed", 422, "VALIDATION_ERROR", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }

  // Ensure the prefs row exists.
  await getOrCreatePreferences(user.id);

  const updated = await db.notificationPreference.update({
    where: { userId: user.id },
    data: parsed.data,
  });

  return ok({
    preferences: {
      emailNotifications: updated.emailNotifications,
      pushNotifications: updated.pushNotifications,
      jobMatches: updated.jobMatches,
      resumeAnalysis: updated.resumeAnalysis,
      newJobs: updated.newJobs,
      dailyDigest: updated.dailyDigest,
    },
  });
}
