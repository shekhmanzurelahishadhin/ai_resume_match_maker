// GET /api/resumes/generate/{id}/versions — list all versions of a generated resume.

import { db } from "@/lib/db";
import {
  ok,
  notFound,
  forbidden,
  getCurrentUser,
  unauthorized,
} from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const r = await db.generatedResume.findUnique({
    where: { id },
    select: { id: true, userId: true, version: true, isCurrent: true },
  });
  if (!r) return notFound("Generated resume not found");
  if (r.userId !== user.id) return forbidden();

  const versions = await db.resumeVersion.findMany({
    where: { generatedResumeId: id },
    orderBy: { versionNumber: "desc" },
  });

  return ok({
    items: versions.map((v) => ({
      id: v.id,
      versionNumber: v.versionNumber,
      contentJson: v.contentJson,
      createdAt: v.createdAt,
      isCurrent: v.versionNumber === r.version,
    })),
    current: r.version,
  });
}
