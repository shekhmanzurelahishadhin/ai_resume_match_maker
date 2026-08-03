// POST /api/resumes/generate/{id}/enhance — AI-enhance a section's text.
//
// Body: { section: 'summary' | 'experience' | 'skills', text: string }
// Returns: { original, improved, source, flag? }
//
// Persists a ResumeImprovement record linked to the GeneratedResume's
// originalResumeId (if any). If the generated resume has no linked original
// (i.e., was authored from scratch), the improvement is still returned but
// not persisted — we surface this as `persisted: false` in the response.
//
// AI source: HuggingFaceService.enhanceBullet(text) using google/flan-t5-base.
// Fallback (no API key): returns the original text with source='fallback'
// and flag='AI enhancement unavailable'.

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
import { getHuggingFaceService } from "@/lib/ai/huggingface";

export const dynamic = "force-dynamic";

const MAX_TEXT = 1000;

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const r = await db.generatedResume.findUnique({
    where: { id },
    select: { id: true, userId: true, originalResumeId: true },
  });
  if (!r) return notFound("Generated resume not found");
  if (r.userId !== user.id) return forbidden();

  const body = await parseJson<{
    section?: string;
    text?: string;
  }>(req);
  if (!body) return err("Invalid JSON body", 400);

  const section = (body.section ?? "").toLowerCase();
  if (!["summary", "experience", "skills"].includes(section)) {
    return err("section must be one of: summary, experience, skills", 400, "VALIDATION_ERROR");
  }

  const text = (body.text ?? "").trim();
  if (!text) return err("text is required", 400, "VALIDATION_ERROR");
  if (text.length > MAX_TEXT) {
    return err(`text is too long (max ${MAX_TEXT} chars)`, 400, "VALIDATION_ERROR");
  }

  const hf = getHuggingFaceService();
  const { result: improved, source } = await hf.enhanceBullet(text);

  const flag = source === "fallback" ? "AI enhancement unavailable" : undefined;

  // Persist a ResumeImprovement record only if we have an original resume to
  // attach it to. The schema requires `resumeId` to reference a Resume row.
  let persisted = false;
  if (r.originalResumeId) {
    await db.resumeImprovement.create({
      data: {
        resumeId: r.originalResumeId,
        originalText: text,
        improvedText: improved,
        suggestionType: section === "summary" ? "style" : "enhancement",
        source,
      },
    });
    persisted = true;
  }

  return ok({
    original: text,
    improved,
    source,
    ...(flag ? { flag } : {}),
    persisted,
  });
}
