// POST /api/resumes/generate — create a new generated resume.
// GET  /api/resumes/generate — list current user's generated resumes.
//
// POST is rate-limited: 10 generations / hour / user (RATE_LIMITS.RESUME_GENERATE).
//
// POST body: { originalResumeId?, templateId, contentJson?, customizationJson? }
//   - If originalResumeId is provided, contentJson is prefilled from the
//     extracted resume data (skills, heuristic experience) unless the caller
//     also passed contentJson.
//   - Creates GeneratedResume (version=1, isCurrent=true) and the first
//     ResumeVersion snapshot.

import crypto from "node:crypto";

import { db } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/constants";
import { cache } from "@/lib/cache";
import {
  ok,
  err,
  tooManyRequests,
  parseJson,
  getCurrentUser,
  unauthorized,
  notFound,
  forbidden,
} from "@/lib/api";
import {
  resumeContentSchema,
  customizationSchema,
  emptyResumeContent,
  contentFromParsedResume,
  type ResumeContent,
} from "@/lib/validators/resume-content";
import { allTemplateMetas } from "@/lib/resume-templates/render";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const items = await db.generatedResume.findMany({
    where: { userId: user.id, isCurrent: true },
    orderBy: { updatedAt: "desc" },
    include: {
      template: {
        select: { id: true, slug: true, name: true },
      },
      originalResume: {
        select: { id: true, fileName: true },
      },
      _count: { select: { versions: true } },
    },
  });

  return ok({
    items: items.map((r) => ({
      id: r.id,
      template: r.template,
      originalResume: r.originalResume,
      version: r.version,
      isCurrent: r.isCurrent,
      contentJson: r.contentJson,
      customizationJson: r.customizationJson,
      filePathPdf: r.filePathPdf,
      filePathDocx: r.filePathDocx,
      filePathHtml: r.filePathHtml,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      versionCount: r._count.versions,
    })),
    total: items.length,
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  // Rate limit: 10 generations / hour.
  const rl = await consumeRateLimit(
    `resume_generate:user:${user.id}`,
    RATE_LIMITS.RESUME_GENERATE.max,
    RATE_LIMITS.RESUME_GENERATE.windowSeconds,
  );
  if (!rl.ok) {
    return tooManyRequests(
      rl.retryAfter,
      "Resume generation limit exceeded (10/hour)",
    );
  }

  const body = await parseJson<{
    originalResumeId?: string;
    templateId?: string;
    contentJson?: unknown;
    customizationJson?: unknown;
  }>(req);
  if (!body) return err("Invalid JSON body", 400);

  const { originalResumeId, templateId, contentJson, customizationJson } = body;

  if (!templateId || typeof templateId !== "string") {
    return err("templateId is required", 400, "VALIDATION_ERROR");
  }

  // Resolve template + slug.
  const template = await db.resumeTemplate.findUnique({
    where: { id: templateId },
    select: { id: true, slug: true, name: true, isActive: true },
  });
  if (!template || !template.isActive) {
    return notFound("Template not found");
  }
  // Cross-check the slug is one we know how to render.
  const knownSlugs = new Set(allTemplateMetas().map((m) => m.slug));
  if (!knownSlugs.has(template.slug)) {
    return err(`Template '${template.slug}' has no renderer`, 500, "TEMPLATE_RENDERER_MISSING");
  }

  // Resolve originalResume (optional).
  let originalResume: { id: string; fileName: string; extractedText: string | null; skillsJson: unknown; experienceYears: number | null } | null = null;
  if (originalResumeId) {
    const found = await db.resume.findUnique({
      where: { id: originalResumeId },
      select: {
        id: true,
        userId: true,
        fileName: true,
        extractedText: true,
        skillsJson: true,
        experienceYears: true,
      },
    });
    if (!found) return notFound("Original resume not found");
    if (found.userId !== user.id) return forbidden("You do not own this resume");
    originalResume = {
      id: found.id,
      fileName: found.fileName,
      extractedText: found.extractedText,
      skillsJson: found.skillsJson,
      experienceYears: found.experienceYears,
    };
  }

  // Build the effective content.
  let content: ResumeContent;
  if (contentJson && typeof contentJson === "object") {
    const parsed = resumeContentSchema.safeParse(contentJson);
    if (!parsed.success) {
      return err("Invalid contentJson", 422, "VALIDATION_ERROR", {
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      });
    }
    content = parsed.data;
  } else if (originalResume) {
    content = contentFromParsedResume({
      extractedText: originalResume.extractedText,
      skillsJson: (originalResume.skillsJson as never) ?? null,
      experienceYears: originalResume.experienceYears,
      fileName: originalResume.fileName,
    });
  } else {
    content = emptyResumeContent();
  }

  // Customization (optional).
  const customizationParsed = customizationSchema.safeParse(customizationJson ?? {});
  if (!customizationParsed.success) {
    return err("Invalid customizationJson", 422, "VALIDATION_ERROR", {
      fieldErrors: customizationParsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }

  // Create the GeneratedResume + first ResumeVersion in one transaction.
  const created = await db.$transaction(async (tx) => {
    const gen = await tx.generatedResume.create({
      data: {
        userId: user.id,
        originalResumeId: originalResume?.id ?? null,
        templateId: template.id,
        contentJson: content as never,
        customizationJson: customizationParsed.data as never,
        version: 1,
        isCurrent: true,
      },
    });
    await tx.resumeVersion.create({
      data: {
        generatedResumeId: gen.id,
        versionNumber: 1,
        contentJson: content as never,
      },
    });
    return gen;
  });

  // Invalidate the user's generated resume list cache (best-effort).
  await cache.delete(`generated:list:${user.id}`);

  // Eagerly fetch the full record with template info for the response.
  const full = await db.generatedResume.findUnique({
    where: { id: created.id },
    include: {
      template: { select: { id: true, slug: true, name: true } },
      originalResume: { select: { id: true, fileName: true } },
    },
  });

  return ok({ resume: full }, 201);
}

/** Stable md5 helper (used elsewhere; keep here to avoid circular imports). */
export function md5(s: string): string {
  return crypto.createHash("md5").update(s).digest("hex");
}
