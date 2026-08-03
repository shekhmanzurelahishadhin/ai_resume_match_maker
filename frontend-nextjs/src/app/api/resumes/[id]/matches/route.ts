// GET /api/resumes/{id}/matches — list this resume's matches (seeker only, own resume).
//
// Also exposed at /api/matches/resume/{resumeId}.

import { db } from "@/lib/db";
import { getCurrentUser, ok, unauthorized, notFound, forbidden, parsePagination } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  const resume = await db.resume.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });
  if (!resume) return notFound("Resume not found");
  if (resume.userId !== user.id) return forbidden();

  const { skip, take, page, pageSize } = parsePagination(req, 15);

  const [items, total] = await Promise.all([
    db.match.findMany({
      where: { resumeId: id },
      orderBy: { matchPercentage: "desc" },
      skip,
      take,
      include: {
        jobPost: {
          select: {
            id: true,
            title: true,
            recruiter: { select: { id: true, name: true } },
          },
        },
      },
    }),
    db.match.count({ where: { resumeId: id } }),
  ]);

  return ok({
    items: items.map((m) => ({
      id: m.id,
      matchPercentage: m.matchPercentage,
      matchSource: m.matchSource,
      matchedSkills: (m.matchedSkillsJson as { skills?: string[] })?.skills ?? [],
      missingSkills: (m.missingSkillsJson as { skills?: string[] })?.skills ?? [],
      analyzedAt: m.analyzedAt,
      createdAt: m.createdAt,
      job: m.jobPost,
    })),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
