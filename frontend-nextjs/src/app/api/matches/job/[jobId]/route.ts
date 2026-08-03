// GET /api/matches/job/{jobId} — list matches for a job.
// Recruiter only, own job. (Same shape as /api/jobs/{id}/candidates but no resume skills summary —
// returns full match rows with matched/missing skills.)

import { db } from "@/lib/db";
import {
  ok,
  forbidden,
  notFound,
  unauthorized,
  parsePagination,
  getCurrentUser,
} from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ jobId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "recruiter") return forbidden();

  const { jobId } = await ctx.params;
  const job = await db.jobPost.findUnique({
    where: { id: jobId },
    select: { id: true, recruiterId: true, title: true },
  });
  if (!job) return notFound("Job not found");
  if (job.recruiterId !== user.id) return forbidden();

  const { skip, take, page, pageSize } = parsePagination(req, 15);
  const where = { jobPostId: jobId };

  const [items, total] = await Promise.all([
    db.match.findMany({
      where,
      orderBy: { matchPercentage: "desc" },
      skip,
      take,
      include: {
        resume: {
          select: {
            id: true,
            fileName: true,
            experienceYears: true,
            skillsJson: true,
            status: true,
            user: { select: { id: true, name: true } },
          },
        },
      },
    }),
    db.match.count({ where }),
  ]);

  return ok({
    job: { id: job.id, title: job.title },
    items: items.map((m) => {
      const skillsJson = m.resume.skillsJson as { skills?: string[] } | null;
      return {
        matchId: m.id,
        matchPercentage: m.matchPercentage,
        matchSource: m.matchSource,
        matchedSkills: (m.matchedSkillsJson as { skills?: string[] })?.skills ?? [],
        missingSkills: (m.missingSkillsJson as { skills?: string[] })?.skills ?? [],
        analyzedAt: m.analyzedAt,
        resume: {
          id: m.resume.id,
          fileName: m.resume.fileName,
          experienceYears: m.resume.experienceYears,
          skills: skillsJson?.skills ?? [],
          status: m.resume.status,
          candidate: m.resume.user,
        },
      };
    }),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
