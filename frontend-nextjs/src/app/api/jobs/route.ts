// GET  /api/jobs — list jobs. Seekers see all active jobs; recruiters see own.
// POST /api/jobs — create a new job (recruiter only).

import { after } from "next/server";

import { db } from "@/lib/db";
import { createJobSchema } from "@/lib/validators/job";
import {
  ok,
  err,
  forbidden,
  parseJson,
  parsePagination,
  requireRole,
  getCurrentUser,
  unauthorized,
} from "@/lib/api";
import { matchJobAgainstAllResumes } from "@/lib/ai/matcher";
import { notifySeekersOfNewJob } from "@/lib/notifications/triggers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { skip, take, page, pageSize } = parsePagination(req, 15);
  const url = new URL(req.url);
  const search = url.searchParams.get("q")?.trim() ?? "";

  const where =
    user.role === "recruiter"
      ? { recruiterId: user.id, ...(search ? { title: { contains: search } } : {}) }
      : {
          isActive: true,
          ...(search ? { title: { contains: search } } : {}),
        };

  const [items, total] = await Promise.all([
    db.jobPost.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        title: true,
        description: true,
        requiredSkillsJson: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        recruiter: { select: { id: true, name: true } },
        _count: { select: { matches: true } },
      },
    }),
    db.jobPost.count({ where }),
  ]);

  return ok({
    items: items.map((j) => ({
      id: j.id,
      title: j.title,
      description: j.description,
      requiredSkills: (j.requiredSkillsJson as { skills?: string[] })?.skills ?? [],
      isActive: j.isActive,
      createdAt: j.createdAt,
      updatedAt: j.updatedAt,
      recruiter: j.recruiter,
      matchCount: j._count.matches,
    })),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export async function POST(req: Request) {
  const got = await requireRole("recruiter");
  if ("response" in got) return got.response;
  const { user } = got;

  const body = await parseJson<unknown>(req);
  if (!body) return err("Invalid JSON body", 400);

  const parsed = createJobSchema.safeParse(body);
  if (!parsed.success) {
    return err("Validation failed", 422, "VALIDATION_ERROR", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }

  const { title, description, requiredSkills, isActive } = parsed.data;

  const job = await db.jobPost.create({
    data: {
      recruiterId: user.id,
      title: title.trim(),
      description: description.trim(),
      requiredSkillsJson: { skills: requiredSkills } as never,
      isActive: isActive ?? true,
    },
    select: {
      id: true,
      title: true,
      description: true,
      requiredSkillsJson: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // After responding, match this new job against every ready resume + notify seekers.
  after(
    (async () => {
      await matchJobAgainstAllResumes(job.id).catch((e) => {
        console.error(
          JSON.stringify({
            level: "error",
            event: "job_match_failed",
            jobId: job.id,
            error: e instanceof Error ? e.message : String(e),
          }),
        );
      });
      // Notify seekers with `newJobs=true` that a new job was posted.
      await notifySeekersOfNewJob(job.id).catch((e) => {
        console.warn(
          JSON.stringify({
            level: "warn",
            event: "new_job_notify_failed",
            jobId: job.id,
            error: e instanceof Error ? e.message : String(e),
          }),
        );
      });
    })(),
  );

  return ok(
    {
      job: {
        ...job,
        requiredSkills: (job.requiredSkillsJson as { skills?: string[] })?.skills ?? [],
      },
    },
    201,
  );
}
