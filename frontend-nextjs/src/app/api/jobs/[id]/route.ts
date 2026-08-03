// GET    /api/jobs/{id} — get a single job. Seekers can fetch active jobs; recruiters can fetch own.
// PUT    /api/jobs/{id} — update a job (recruiter only, own job).
// DELETE /api/jobs/{id} — delete a job (recruiter only, own job).

import { after } from "next/server";

import { db } from "@/lib/db";
import { updateJobSchema } from "@/lib/validators/job";
import {
  ok,
  err,
  notFound,
  forbidden,
  parseJson,
  getCurrentUser,
  unauthorized,
} from "@/lib/api";
import { matchJobAgainstAllResumes } from "@/lib/ai/matcher";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  const job = await db.jobPost.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      requiredSkillsJson: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      recruiterId: true,
      recruiter: { select: { id: true, name: true } },
    },
  });
  if (!job) return notFound("Job not found");

  if (user.role === "seeker") {
    if (!job.isActive) return notFound("Job not found");
  } else if (job.recruiterId !== user.id) {
    return forbidden();
  }

  return ok({
    job: {
      id: job.id,
      title: job.title,
      description: job.description,
      requiredSkills: (job.requiredSkillsJson as { skills?: string[] })?.skills ?? [],
      isActive: job.isActive,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      recruiter: job.recruiter,
    },
  });
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "recruiter") return forbidden();

  const { id } = await ctx.params;
  const job = await db.jobPost.findUnique({
    where: { id },
    select: { id: true, recruiterId: true },
  });
  if (!job) return notFound("Job not found");
  if (job.recruiterId !== user.id) return forbidden();

  const body = await parseJson<unknown>(req);
  if (!body) return err("Invalid JSON body", 400);

  const parsed = updateJobSchema.safeParse(body);
  if (!parsed.success) {
    return err("Validation failed", 422, "VALIDATION_ERROR", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title.trim();
  if (parsed.data.description !== undefined) data.description = parsed.data.description.trim();
  if (parsed.data.requiredSkills !== undefined) {
    data.requiredSkillsJson = { skills: parsed.data.requiredSkills } as never;
  }
  if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;

  const updated = await db.jobPost.update({
    where: { id },
    data,
    select: {
      id: true,
      title: true,
      description: true,
      requiredSkillsJson: true,
      isActive: true,
      updatedAt: true,
    },
  });

  // Re-run matching if skills changed.
  if (parsed.data.requiredSkills !== undefined) {
    after(
      matchJobAgainstAllResumes(id).catch(() => undefined),
    );
  }

  return ok({
    job: {
      ...updated,
      requiredSkills: (updated.requiredSkillsJson as { skills?: string[] })?.skills ?? [],
    },
  });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "recruiter") return forbidden();

  const { id } = await ctx.params;
  const job = await db.jobPost.findUnique({
    where: { id },
    select: { id: true, recruiterId: true },
  });
  if (!job) return notFound("Job not found");
  if (job.recruiterId !== user.id) return forbidden();

  await db.jobPost.delete({ where: { id } });
  return ok({ deleted: true });
}
