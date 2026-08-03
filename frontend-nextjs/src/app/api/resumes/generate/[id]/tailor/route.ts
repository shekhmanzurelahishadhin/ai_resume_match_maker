// POST /api/resumes/generate/{id}/tailor — tailor a resume to a specific job.
//
// Body: { jobPostId }
//
// Tailoring heuristics (per spec):
//   - Reorder skills so that skills matched by the job's requiredSkills go first.
//   - Suggest a summary edit incorporating the job's title.
//   - Create a new version (the same PUT flow) so the user can roll back.
//
// Returns the updated GeneratedResume + a tailoring summary.

import { db } from "@/lib/db";
import {
  ok,
  err,
  notFound,
  forbidden,
  parseJson,
  getCurrentUser,
  unauthorized,
} from "@/lib/api";
import {
  resumeContentSchema,
  customizationSchema,
  type ResumeContent,
  type ResumeCustomization,
} from "@/lib/validators/resume-content";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const r = await db.generatedResume.findUnique({
    where: { id },
    include: {
      template: { select: { slug: true, name: true } },
    },
  });
  if (!r) return notFound("Generated resume not found");
  if (r.userId !== user.id) return forbidden();

  const body = await parseJson<{ jobPostId?: string }>(req);
  if (!body?.jobPostId) return err("jobPostId is required", 400, "VALIDATION_ERROR");

  const job = await db.jobPost.findUnique({
    where: { id: body.jobPostId },
    select: { id: true, title: true, description: true, requiredSkillsJson: true, isActive: true },
  });
  if (!job || !job.isActive) return notFound("Job not found");

  const requiredSkills = ((job.requiredSkillsJson as { skills?: string[] })?.skills ?? []).map(
    (s) => s.toLowerCase(),
  );

  // Validate current content.
  const contentParsed = resumeContentSchema.safeParse(r.contentJson);
  if (!contentParsed.success) {
    return err("Stored resume content is malformed", 422, "CONTENT_MALFORMED");
  }
  const customizationParsed = customizationSchema.safeParse(r.customizationJson ?? {});

  const content: ResumeContent = contentParsed.data;

  // --- Tailoring transformations ---

  // 1. Reorder skills: matched items first within each group.
  const requiredSet = new Set(requiredSkills);
  const tailoring: string[] = [];
  const newSkills = content.skills.map((group) => {
    const matched: string[] = [];
    const unmatched: string[] = [];
    for (const item of group.items) {
      if (requiredSet.has(item.toLowerCase())) {
        matched.push(item);
        tailoring.push(`${group.category}: ${item}`);
      } else {
        unmatched.push(item);
      }
    }
    return { ...group, items: [...matched, ...unmatched] };
  });

  // 2. Suggest a summary edit that incorporates the job title.
  const name = content.contact.name?.trim() || "I";
  const baseSummary = content.summary?.trim() ?? "";
  const tailoredSummary = baseSummary
    ? `${baseSummary}\n\nTailored for the ${job.title} role: ${name} brings ${requiredSkills.length ? requiredSkills.slice(0, 5).join(", ") : "relevant"} experience directly aligned with the position's requirements.`
    : `${name} is a strong candidate for the ${job.title} role, with hands-on experience in ${requiredSkills.slice(0, 5).join(", ") || "the role's core competencies"}.`;

  const newContent: ResumeContent = {
    ...content,
    skills: newSkills,
    summary: tailoredSummary,
  };

  // 3. Persist + append a new version snapshot.
  const nextVersion = r.version + 1;
  const updated = await db.$transaction(async (tx) => {
    const gen = await tx.generatedResume.update({
      where: { id },
      data: {
        contentJson: newContent as never,
        version: nextVersion,
        isCurrent: true,
      },
    });
    await tx.resumeVersion.create({
      data: {
        generatedResumeId: gen.id,
        versionNumber: nextVersion,
        contentJson: newContent as never,
      },
    });
    return gen;
  });

  const full = await db.generatedResume.findUnique({
    where: { id: updated.id },
    include: {
      template: { select: { id: true, slug: true, name: true } },
      originalResume: { select: { id: true, fileName: true } },
    },
  });

  return ok({
    tailored: true,
    job: { id: job.id, title: job.title },
    newVersion: nextVersion,
    matchedSkillsReordered: tailoring,
    summaryUpdated: true,
    resume: full,
    customization: customizationParsed.success ? customizationParsed.data : null,
  });
}
