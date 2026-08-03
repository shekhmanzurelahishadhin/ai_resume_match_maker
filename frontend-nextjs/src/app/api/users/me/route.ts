// GET    /api/users/me — current user profile (no password hash).
// PATCH  /api/users/me — update profile (name only for v1).
// DELETE /api/users/me — hard-delete user + cascade. (§5 privacy right.)

import { db } from "@/lib/db";
import { updateProfileSchema } from "@/lib/validators/auth";
import {
  ok,
  err,
  parseJson,
  getCurrentUser,
  unauthorized,
} from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  return ok({ user });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const body = await parseJson<unknown>(req);
  if (!body) return err("Invalid JSON body", 400);

  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return err("Validation failed", 422, "VALIDATION_ERROR", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name.trim();

  const updated = await db.user.update({
    where: { id: user.id },
    data,
    select: { id: true, name: true, email: true, role: true, updatedAt: true },
  });
  return ok({ user: updated });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  // Prisma cascades on User → Resume/JobPost/Match/etc. (see schema's onDelete: Cascade).
  await db.user.delete({ where: { id: user.id } });
  return ok({ deleted: true });
}
