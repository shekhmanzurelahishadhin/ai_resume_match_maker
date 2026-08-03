// GET /api/resumes/{id}/status — return current parse status.

import { db } from "@/lib/db";
import { getCurrentUser, ok, unauthorized, notFound, forbidden } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  const resume = await db.resume.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true, parseError: true, updatedAt: true },
  });
  if (!resume) return notFound("Resume not found");
  if (resume.userId !== user.id) return forbidden();

  return ok({
    id: resume.id,
    status: resume.status,
    parseError: resume.parseError,
    updatedAt: resume.updatedAt,
  });
}
