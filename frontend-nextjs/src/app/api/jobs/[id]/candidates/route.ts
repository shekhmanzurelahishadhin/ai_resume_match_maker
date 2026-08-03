// GET /api/jobs/{id}/candidates — for recruiters — list matches for this job,
// sorted by match_percentage DESC, paginated 15/page, with resume summary
// (NO full extracted_text — only skills + experience_years + matched/missing skills).
//
// Privacy (§5): recruiters only see matches for their own jobs; seekers get 403.

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
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "recruiter") return forbidden();

  const { id } = await ctx.params;
  const job = await db.jobPost.findUnique({
    where: { id },
    select: { id: true, recruiterId: true, title: true },
  });
  if (!job) return notFound("Job not found");
  if (job.recruiterId !== user.id) return forbidden();

  const { skip, take, page, pageSize } = parsePagination(req, 15);
  const url = new URL(req.url);
  const minPct = Number(url.searchParams.get("minMatch") ?? "0") || 0;

  const where = { jobPostId: id, matchPercentage: { gte: minPct } };

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
            userId: true,
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
          candidate: {
            id: m.resume.user.id,
            name: m.resume.user.name,
          },
        },
      };
    }),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
