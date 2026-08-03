// POST /api/register — create a new user (seeker or recruiter).

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { registerSchema } from "@/lib/validators/auth";
import { ok, err, parseJson } from "@/lib/api";
import { getOrCreatePreferences } from "@/lib/notifications/service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await parseJson<unknown>(req);
  if (!body) return err("Invalid JSON body", 400);

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return err("Validation failed", 422, "VALIDATION_ERROR", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }

  const { name, email, password, role } = parsed.data;
  const lowerEmail = email.trim().toLowerCase();

  const existing = await db.user.findUnique({ where: { email: lowerEmail } });
  if (existing) {
    return err("Email already registered", 409, "EMAIL_TAKEN");
  }

  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: { name: name.trim(), email: lowerEmail, passwordHash, role },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  // Auto-create NotificationPreference with the spec defaults
  // (all true except dailyDigest). Failures are logged but never block
  // the registration response — the prefs will be lazily created on first
  // use by `getOrCreatePreferences` if this insert is dropped.
  await getOrCreatePreferences(user.id).catch((e) => {
    console.warn(
      JSON.stringify({
        level: "warn",
        event: "default_prefs_create_failed",
        userId: user.id,
        error: e instanceof Error ? e.message : String(e),
      }),
    );
  });

  return ok({ user }, 201);
}
