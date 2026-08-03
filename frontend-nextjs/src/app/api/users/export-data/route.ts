// POST /api/users/export-data — return a JSON export of all the user's data.
// (§5 privacy endpoint — implements a "download my data" right.)

import { db } from "@/lib/db";
import { getCurrentUser, ok, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const [profile, resumes, jobs, matchesAsSeeker, matchesAsRecruiter] =
    await Promise.all([
      db.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.resume.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      }),
      db.jobPost.findMany({
        where: { recruiterId: user.id },
        orderBy: { createdAt: "desc" },
      }),
      db.match.findMany({
        where: { resume: { userId: user.id } },
        orderBy: { createdAt: "desc" },
        include: { jobPost: { select: { id: true, title: true } } },
      }),
      db.match.findMany({
        where: { recruiterId: user.id },
        orderBy: { createdAt: "desc" },
        include: {
          resume: {
            select: {
              id: true,
              fileName: true,
              user: { select: { id: true, name: true } },
            },
          },
          jobPost: { select: { id: true, title: true } },
        },
      }),
    ]);

  return ok({
    exportedAt: new Date().toISOString(),
    profile,
    resumes,
    jobs,
    matchesAsSeeker: matchesAsSeeker.map((m) => ({
      id: m.id,
      matchPercentage: m.matchPercentage,
      matchSource: m.matchSource,
      analyzedAt: m.analyzedAt,
      createdAt: m.createdAt,
      job: m.jobPost,
    })),
    matchesAsRecruiter: matchesAsRecruiter.map((m) => ({
      id: m.id,
      matchPercentage: m.matchPercentage,
      matchSource: m.matchSource,
      analyzedAt: m.analyzedAt,
      createdAt: m.createdAt,
      job: m.jobPost,
      candidate: m.resume.user,
    })),
  });
}
