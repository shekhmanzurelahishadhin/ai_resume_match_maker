// GET    /api/resumes/{id} — full resume detail (seeker only, own resume).
// DELETE /api/resumes/{id} — delete file + record (hard delete).

import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { getCurrentUser, ok, unauthorized, notFound, forbidden } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  const resume = await db.resume.findUnique({ where: { id } });
  if (!resume) return notFound("Resume not found");
  if (resume.userId !== user.id) return forbidden();

  const skillsJson = (resume.skillsJson as { skills?: string[]; categories?: Record<string, string[]>; _source?: string } | null);
  return ok({
    resume: {
      id: resume.id,
      fileName: resume.fileName,
      mimeType: resume.mimeType,
      fileSizeBytes: resume.fileSizeBytes,
      status: resume.status,
      parseError: resume.parseError,
      experienceYears: resume.experienceYears,
      skills: skillsJson?.skills ?? [],
      categories: skillsJson?.categories ?? { Technical: [], Tools: [], "Soft Skills": [], Domain: [], Languages: [] },
      skillSource: skillsJson?._source ?? "fallback",
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt,
    },
  });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  const resume = await db.resume.findUnique({
    where: { id },
    select: { id: true, userId: true, filePath: true },
  });
  if (!resume) return notFound("Resume not found");
  if (resume.userId !== user.id) return forbidden();

  // Delete file on disk (best-effort), then the DB row (cascades to matches).
  await storage.deleteFile(resume.filePath);
  await db.resume.delete({ where: { id } });

  return ok({ deleted: true });
}
