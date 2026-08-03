// GET /api/matches/{id} — single match detail.
//
// Privacy:
//   - Seekers: can only see their own matches (where resume.userId === user.id).
//   - Recruiters: can only see matches for their own jobs (where recruiterId === user.id).

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
  const match = await db.match.findUnique({
    where: { id },
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
      jobPost: {
        select: {
          id: true,
          title: true,
          description: true,
          requiredSkillsJson: true,
          recruiterId: true,
          recruiter: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!match) return notFound("Match not found");

  // Authorization
  if (user.role === "seeker") {
    if (match.resume.userId !== user.id) return forbidden();
  } else {
    if (match.jobPost.recruiterId !== user.id) return forbidden();
  }

  const skillsJson = match.resume.skillsJson as { skills?: string[] } | null;
  const requiredSkills = (match.jobPost.requiredSkillsJson as { skills?: string[] })?.skills ?? [];

  return ok({
    match: {
      id: match.id,
      matchPercentage: match.matchPercentage,
      matchSource: match.matchSource,
      matchedSkills: (match.matchedSkillsJson as { skills?: string[] })?.skills ?? [],
      missingSkills: (match.missingSkillsJson as { skills?: string[] })?.skills ?? [],
      analyzedAt: match.analyzedAt,
      createdAt: match.createdAt,
      resume: {
        id: match.resume.id,
        fileName: match.resume.fileName,
        experienceYears: match.resume.experienceYears,
        skills: skillsJson?.skills ?? [],
        status: match.resume.status,
        candidate: match.resume.user,
      },
      job: {
        id: match.jobPost.id,
        title: match.jobPost.title,
        description: match.jobPost.description,
        requiredSkills,
        recruiter: match.jobPost.recruiter,
      },
    },
  });
}
