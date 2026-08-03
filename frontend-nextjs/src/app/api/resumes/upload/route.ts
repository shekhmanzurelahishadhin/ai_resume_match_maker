// POST /api/resumes/upload — accept a PDF resume, store it, kick off parsing.
//
// Flow:
//   1. Auth check (seeker only).
//   2. Rate limit: 5 uploads/hour/user.
//   3. Multipart parse — extract `file` field.
//   4. Validate MIME + magic bytes (%PDF) + size <= 5MB.
//   5. Save via StorageService.
//   6. Insert Resume row with status='pending'.
//   7. After the response is sent: extract text via pdf-parse, extract skills via
//      HuggingFaceService (with fallback), compute experience_years, then run
//      matchResumeAgainstAllJobs to populate Match rows.
//   8. Update Resume: status='ready' (or 'failed' with parseError).

import { after } from "next/server";

import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { consumeRateLimit } from "@/lib/rate-limit";
import { RATE_LIMITS, MAX_RESUME_SIZE_BYTES, ACCEPTED_RESUME_MIME, PDF_MAGIC_BYTES } from "@/lib/constants";
import { ok, err, tooManyRequests, requireRole } from "@/lib/api";
import { parseResumeAndMatch } from "@/lib/resume-parser";

export const dynamic = "force-dynamic";
// Multipart upload — do not let Next.js parse it as JSON.
export const runtime = "nodejs";

export async function POST(req: Request) {
  const got = await requireRole("seeker");
  if ("response" in got) return got.response;
  const { user } = got;

  // Rate limit
  const rl = await consumeRateLimit(
    `resume_upload:user:${user.id}`,
    RATE_LIMITS.RESUME_UPLOAD.max,
    RATE_LIMITS.RESUME_UPLOAD.windowSeconds,
  );
  if (!rl.ok) {
    return tooManyRequests(rl.retryAfter, "Resume upload limit exceeded (5/hour)");
  }

  // Multipart parse
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return err("Expected multipart/form-data", 400, "INVALID_CONTENT_TYPE");
  }

  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return err("Missing 'file' field", 400, "MISSING_FILE");
  }

  if (file.size > MAX_RESUME_SIZE_BYTES) {
    return err("File too large (max 5MB)", 413, "FILE_TOO_LARGE");
  }

  // Validate MIME type (and filename extension as a courtesy).
  const declaredType = file.type || "";
  const isPdfMime = declaredType === ACCEPTED_RESUME_MIME;
  const isPdfExt = /\.pdf$/i.test(file.name);
  if (!isPdfMime && !isPdfExt) {
    return err("Only PDF files are accepted", 415, "UNSUPPORTED_TYPE");
  }

  // Read into buffer to check magic bytes.
  const arrayBuf = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);
  if (!buffer.subarray(0, PDF_MAGIC_BYTES.length).equals(PDF_MAGIC_BYTES)) {
    return err("File does not appear to be a valid PDF", 415, "INVALID_PDF");
  }

  // Persist the file via StorageService. We need a resumeId first for the path.
  const resume = await db.resume.create({
    data: {
      userId: user.id,
      fileName: file.name,
      filePath: "", // placeholder, updated below
      mimeType: ACCEPTED_RESUME_MIME,
      fileSizeBytes: buffer.length,
      status: "pending",
    },
  });

  const stored = await storage.saveFile({
    userId: user.id,
    ownerId: resume.id,
    fileName: file.name,
    mimeType: ACCEPTED_RESUME_MIME,
    data: buffer,
  });

  await db.resume.update({
    where: { id: resume.id },
    data: { filePath: stored.key },
  });

  // Schedule the parsing work to run after the response is flushed.
  // This keeps the upload endpoint snappy while the heavy lifting happens
  // in the background.
  after(
    parseResumeAndMatch(resume.id).catch((e) => {
      console.error(
        JSON.stringify({
          level: "error",
          event: "resume_parse_failed",
          resumeId: resume.id,
          error: e instanceof Error ? e.message : String(e),
        }),
      );
    }),
  );

  return ok({ resume: { ...resume, filePath: stored.key, status: "pending" } }, 201);
}

// Re-export GET to support health probes (no body parsing).
export async function GET() {
  return ok({ endpoint: "resumes/upload", method: "POST" });
}
