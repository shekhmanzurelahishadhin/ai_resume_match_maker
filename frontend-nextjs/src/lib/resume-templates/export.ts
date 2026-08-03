// Export helpers for the resume generation API.
// Centralizes the file-save + DB-update logic shared by the export endpoint.

import path from "node:path";

import { storage } from "@/lib/storage";
import { db } from "@/lib/db";
import { renderHtml } from "./render";
import { renderPdf } from "./export-pdf";
import { renderDocx } from "./export-docx";
import { getTemplateMeta } from "./render";
import type { ResumeContent, ResumeCustomization } from "@/lib/validators/resume-content";

export type ExportFormat = "pdf" | "docx" | "html";

export interface ExportResult {
  format: ExportFormat;
  fileName: string;
  filePath: string;
  fileUrl: string;
  size: number;
}

const MIME_BY_FORMAT: Record<ExportFormat, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  html: "text/html",
};

const EXT_BY_FORMAT: Record<ExportFormat, string> = {
  pdf: "pdf",
  docx: "docx",
  html: "html",
};

const COLUMN_BY_FORMAT: Record<ExportFormat, "filePathPdf" | "filePathDocx" | "filePathHtml"> = {
  pdf: "filePathPdf",
  docx: "filePathDocx",
  html: "filePathHtml",
};

/**
 * Render + save a generated resume to disk, then update the DB record's
 * `filePath{Format}` column.
 */
export async function exportGeneratedResume(args: {
  generatedResumeId: string;
  userId: string;
  slug: string;
  content: ResumeContent;
  customization: ResumeCustomization | null;
  format: ExportFormat;
}): Promise<ExportResult> {
  const meta = getTemplateMeta(args.slug);
  if (!meta) {
    throw new Error(`Unknown template slug: ${args.slug}`);
  }

  let buffer: Buffer;
  if (args.format === "html") {
    buffer = Buffer.from(renderHtml(args.slug, args.content, args.customization), "utf8");
  } else if (args.format === "pdf") {
    buffer = await renderPdf(args.slug, meta, args.content);
  } else {
    buffer = await renderDocx(args.slug, meta, args.content);
  }

  const fileName = `resume-v${Date.now()}.${EXT_BY_FORMAT[args.format]}`;
  const stored = await storage.saveFile({
    userId: args.userId,
    ownerId: args.generatedResumeId,
    fileName,
    mimeType: MIME_BY_FORMAT[args.format],
    data: buffer,
  });

  await db.generatedResume.update({
    where: { id: args.generatedResumeId },
    data: { [COLUMN_BY_FORMAT[args.format]]: stored.key } as never,
  });

  return {
    format: args.format,
    fileName: path.basename(stored.key),
    filePath: stored.key,
    fileUrl: `/api/storage/${encodeURIComponent(stored.key)}`,
    size: stored.size,
  };
}
