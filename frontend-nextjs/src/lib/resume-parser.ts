// Resume parsing + AI extraction + matching — shared by upload + re-analyze.
//
// `parseResumeAndMatch(resumeId)` does the heavy lifting:
//   1. Set status='parsing'.
//   2. Read file from disk, run pdf-parse to get plain text.
//   3. Run skills extraction via HuggingFaceService (with fallback to dictionary).
//   4. Compute experience_years via heuristic.
//   5. Update Resume: extractedText, skillsJson, experienceYears, status='ready'.
//   6. Run matchResumeAgainstAllJobs to populate Match rows.
//
// On any error: status='failed', parseError=message.

import { promises as fs } from "node:fs";
import path from "node:path";

import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { getHuggingFaceService } from "@/lib/ai/huggingface";
import { computeExperienceYears, matchResumeAgainstAllJobs } from "@/lib/ai/matcher";
import { RESUME_STATUS } from "@/lib/constants";
import { notifyResumeAnalysisComplete } from "@/lib/notifications/triggers";

export async function parseResumeAndMatch(resumeId: string): Promise<void> {
  const resume = await db.resume.findUnique({ where: { id: resumeId } });
  if (!resume) return;

  await db.resume.update({
    where: { id: resumeId },
    data: { status: RESUME_STATUS.PARSING, parseError: null },
  });

  try {
    const fileBuffer = await storage.getFile(resume.filePath);
    if (!fileBuffer) {
      throw new Error("Stored PDF file not found on disk");
    }

    // We use `unpdf` (a Node-friendly wrapper around pdfjs-dist that runs
    // fully in-process, no worker chunk needed). Turbopack's dev server
    // can't resolve pdfjs's `pdf.worker.mjs` chunks, so `unpdf` is the
    // cleanest cross-runtime choice. We import lazily so the heavy
    // pdfjs-dist dependency is only loaded when actually parsing.
    const { getDocumentProxy, extractText } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(fileBuffer));
    const { text: rawText } = await extractText(pdf, { mergePages: true });
    try {
      await pdf.destroy();
    } catch { /* ignore */ }
    const text = (rawText ?? "").trim();
    if (!text) {
      throw new Error("No extractable text in PDF (is it a scanned image?)");
    }

    const hf = getHuggingFaceService();
    const { result: extracted, source } = await hf.extractSkills(text);
    const experienceYears = computeExperienceYears(text);

    await db.resume.update({
      where: { id: resumeId },
      data: {
        extractedText: text,
        skillsJson: {
          skills: extracted.skills,
          categories: extracted.categories,
          _source: source,
        } as never,
        experienceYears,
        status: RESUME_STATUS.READY,
        parseError: null,
      },
    });

    // Now match this resume against every active job.
    try {
      await matchResumeAgainstAllJobs(resumeId);
    } catch (matchErr) {
      // Don't fail the parse just because matching failed — log + continue.
      console.warn(
        JSON.stringify({
          level: "warn",
          event: "resume_match_failed",
          resumeId,
          error: matchErr instanceof Error ? matchErr.message : String(matchErr),
        }),
      );
    }

    // Fire the "Resume analysis complete" notification. Wrapped in try/catch
    // so a notification failure never re-sends the resume into 'failed' state.
    try {
      await notifyResumeAnalysisComplete(resumeId);
    } catch (notifyErr) {
      console.warn(
        JSON.stringify({
          level: "warn",
          event: "resume_analysis_notify_failed",
          resumeId,
          error: notifyErr instanceof Error ? notifyErr.message : String(notifyErr),
        }),
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.resume.update({
      where: { id: resumeId },
      data: { status: RESUME_STATUS.FAILED, parseError: message },
    });
    // Even on failure, send a notification so the user knows their upload
    // didn't silently disappear.
    try {
      await notifyResumeAnalysisComplete(resumeId);
    } catch (notifyErr) {
      console.warn(
        JSON.stringify({
          level: "warn",
          event: "resume_analysis_notify_failed",
          resumeId,
          error: notifyErr instanceof Error ? notifyErr.message : String(notifyErr),
        }),
      );
    }
  }
}

// Used by tests/dev to confirm files actually land on disk.
export async function _debugResumeFilePath(resumeId: string): Promise<string | null> {
  const r = await db.resume.findUnique({ where: { id: resumeId } });
  if (!r) return null;
  const stored = await storage.getFile(r.filePath);
  if (!stored) return null;
  // Write to a temp debug path so an operator can eyeball it.
  const debugPath = path.join("/tmp", `resume-${resumeId}.pdf`);
  await fs.writeFile(debugPath, stored);
  return debugPath;
}
