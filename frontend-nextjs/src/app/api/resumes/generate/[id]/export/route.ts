// POST /api/resumes/generate/{id}/export — render + save a file in the chosen format.
//
// Body: { format: 'pdf' | 'docx' | 'html' }
// Rate-limited: 10 / hour / user (shares the RESUME_GENERATE bucket with /generate).
//
// Returns: { format, fileName, filePath, fileUrl, size }

import { db } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/constants";
import {
  ok,
  err,
  tooManyRequests,
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
import { exportGeneratedResume, type ExportFormat } from "@/lib/resume-templates/export";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const r = await db.generatedResume.findUnique({
    where: { id },
    include: { template: { select: { slug: true, name: true } } },
  });
  if (!r) return notFound("Generated resume not found");
  if (r.userId !== user.id) return forbidden();

  // Rate limit (shares the generate bucket).
  const rl = await consumeRateLimit(
    `resume_generate:user:${user.id}`,
    RATE_LIMITS.RESUME_GENERATE.max,
    RATE_LIMITS.RESUME_GENERATE.windowSeconds,
  );
  if (!rl.ok) {
    return tooManyRequests(rl.retryAfter, "Export limit exceeded (10/hour)");
  }

  const body = await parseJson<{ format?: string }>(req);
  if (!body) return err("Invalid JSON body", 400);

  const format = (body.format ?? "").toLowerCase() as ExportFormat;
  if (!["pdf", "docx", "html"].includes(format)) {
    return err("format must be one of: pdf, docx, html", 400, "VALIDATION_ERROR");
  }

  // Validate stored content.
  const contentParsed = resumeContentSchema.safeParse(r.contentJson);
  if (!contentParsed.success) {
    return err("Resume content is malformed", 422, "CONTENT_MALFORMED");
  }
  const customizationParsed = customizationSchema.safeParse(r.customizationJson ?? {});

  try {
    const result = await exportGeneratedResume({
      generatedResumeId: r.id,
      userId: user.id,
      slug: r.template.slug,
      content: contentParsed.data as ResumeContent,
      customization: (customizationParsed.success ? customizationParsed.data : null) as ResumeCustomization | null,
      format,
    });
    return ok({ export: result }, 201);
  } catch (e) {
    return err(
      `Export failed: ${e instanceof Error ? e.message : String(e)}`,
      500,
      "EXPORT_ERROR",
    );
  }
}
