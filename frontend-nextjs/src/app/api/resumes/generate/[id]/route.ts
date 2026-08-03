// GET    /api/resumes/generate/{id} — get one generated resume (owner-only).
// PUT    /api/resumes/generate/{id} — update contentJson/customizationJson,
//         create a new ResumeVersion snapshot, bump version, set isCurrent=true.
// DELETE /api/resumes/generate/{id} — delete the record + any exported files.

import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
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
} from "@/lib/validators/resume-content";

export const dynamic = "force-dynamic";

async function getOwnedResume(id: string, userId: string) {
  const r = await db.generatedResume.findUnique({
    where: { id },
    include: {
      template: { select: { id: true, slug: true, name: true } },
      originalResume: { select: { id: true, fileName: true } },
    },
  });
  if (!r) return null;
  if (r.userId !== userId) return "forbidden" as const;
  return r;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const r = await getOwnedResume(id, user.id);
  if (!r) return notFound("Generated resume not found");
  if (r === "forbidden") return forbidden();

  return ok({
    resume: {
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
    },
  });
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const r = await getOwnedResume(id, user.id);
  if (!r) return notFound("Generated resume not found");
  if (r === "forbidden") return forbidden();

  const body = await parseJson<{
    contentJson?: unknown;
    customizationJson?: unknown;
  }>(req);
  if (!body) return err("Invalid JSON body", 400);

  // Validate content if provided.
  let newContent: unknown = r.contentJson;
  if (body.contentJson !== undefined) {
    const parsed = resumeContentSchema.safeParse(body.contentJson);
    if (!parsed.success) {
      return err("Invalid contentJson", 422, "VALIDATION_ERROR", {
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      });
    }
    newContent = parsed.data;
  }

  // Validate customization if provided.
  let newCustomization: unknown = r.customizationJson;
  if (body.customizationJson !== undefined) {
    const parsed = customizationSchema.safeParse(body.customizationJson ?? {});
    if (!parsed.success) {
      return err("Invalid customizationJson", 422, "VALIDATION_ERROR", {
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      });
    }
    newCustomization = parsed.data;
  }

  const nextVersion = r.version + 1;

  // Update the record + append a version snapshot atomically.
  const updated = await db.$transaction(async (tx) => {
    const gen = await tx.generatedResume.update({
      where: { id },
      data: {
        contentJson: newContent as never,
        customizationJson: newCustomization as never,
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

  return ok({ resume: full });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const r = await getOwnedResume(id, user.id);
  if (!r) return notFound("Generated resume not found");
  if (r === "forbidden") return forbidden();

  // Best-effort delete of any exported files on disk.
  const keys = [r.filePathPdf, r.filePathDocx, r.filePathHtml].filter(
    (k): k is string => Boolean(k),
  );
  await Promise.all(keys.map((k) => storage.deleteFile(k).catch(() => {})));

  // Cascade delete handles ResumeVersion rows.
  await db.generatedResume.delete({ where: { id } });

  return ok({ deleted: true, id });
}
