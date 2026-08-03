// POST /api/reset-password — consume a reset token and set a new password.

import { db } from "@/lib/db";
import { cache } from "@/lib/cache";
import { hashPassword } from "@/lib/auth";
import { resetPasswordSchema } from "@/lib/validators/auth";
import { ok, err, parseJson } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await parseJson<unknown>(req);
  if (!body) return err("Invalid JSON body", 400);

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return err("Validation failed", 422, "VALIDATION_ERROR", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }

  const { token, password } = parsed.data;
  const payload = await cache.get<{ userId: string; email: string }>(
    `pwdreset:${token}`,
  );
  if (!payload) {
    return err("Token is invalid or expired", 400, "INVALID_TOKEN");
  }

  const passwordHash = await hashPassword(password);
  await db.user.update({
    where: { id: payload.userId },
    data: { passwordHash },
  });
  await cache.delete(`pwdreset:${token}`);

  return ok({ reset: true });
}
