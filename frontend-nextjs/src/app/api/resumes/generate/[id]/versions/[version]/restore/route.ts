// POST /api/resumes/generate/{id}/versions/{version}/restore
//
// Restore a previous version: create a NEW version with the old content.
// (The history is append-only — restoring v3 from v5 creates v6 with v3's content.)
//
// Sets isCurrent=true on the parent record and bumps its version counter.

import { db } from "@/lib/db";
import {
  ok,
  notFound,
  forbidden,
  getCurrentUser,
  unauthorized,
} from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string; version: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id, version: versionStr } = await ctx.params;
  const targetVersion = parseInt(versionStr, 10);
  if (!Number.isFinite(targetVersion) || targetVersion < 1) {
    return notFound("Invalid version number");
  }

  const r = await db.generatedResume.findUnique({
    where: { id },
    select: { id: true, userId: true, version: true },
  });
  if (!r) return notFound("Generated resume not found");
  if (r.userId !== user.id) return forbidden();

  const target = await db.resumeVersion.findFirst({
    where: { generatedResumeId: id, versionNumber: targetVersion },
  });
  if (!target) return notFound(`Version ${targetVersion} not found`);

  const nextVersion = r.version + 1;

  const updated = await db.$transaction(async (tx) => {
    const gen = await tx.generatedResume.update({
      where: { id },
      data: {
        contentJson: target.contentJson,
        version: nextVersion,
        isCurrent: true,
      },
    });
    await tx.resumeVersion.create({
      data: {
        generatedResumeId: gen.id,
        versionNumber: nextVersion,
        contentJson: target.contentJson,
      },
    });
    return gen;
  });

  return ok({
    restored: true,
    fromVersion: targetVersion,
    newVersion: nextVersion,
    resume: updated,
  });
}
