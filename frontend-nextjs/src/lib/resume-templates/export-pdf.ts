// export-pdf.ts — minimal text-based PDF generation using pdf-lib.
//
// Per the spec §6 constraint, PDF export is content-accurate, NOT layout-accurate.
// We render a clean, readable plain-text-style PDF (title, contact, sections,
// bullets). No CSS replication is attempted.

import { PDFDocument, PDFFont, StandardFonts, PDFPage, rgb } from "pdf-lib";

import type { ResumeContent } from "@/lib/validators/resume-content";
import type { TemplateMeta } from "./types";

const MARGIN = 56; // 0.78"
const PAGE_WIDTH = 595.28; // A4 width in pt
const PAGE_HEIGHT = 841.89; // A4 height in pt
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const FONT_SIZE_TITLE = 22;
const FONT_SIZE_HEADER = 13;
const FONT_SIZE_BODY = 10.5;
const FONT_SIZE_SMALL = 9;
const LINE_GAP = 4;

interface RenderCtx {
  doc: PDFDocument;
  font: PDFFont;
  fontBold: PDFFont;
  fontItalic: PDFFont;
  page: PDFPage;
  y: number;
}

function newPage(ctx: RenderCtx): void {
  ctx.page = ctx.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  ctx.y = PAGE_HEIGHT - MARGIN;
}

function ensureSpace(ctx: RenderCtx, needed: number): void {
  if (ctx.y - needed < MARGIN) {
    newPage(ctx);
  }
}

function writeLine(
  ctx: RenderCtx,
  text: string,
  opts: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; gapAfter?: number } = {},
): void {
  const font = opts.font ?? ctx.font;
  const size = opts.size ?? FONT_SIZE_BODY;
  const color = opts.color ?? rgb(0.12, 0.16, 0.22);
  const gapAfter = opts.gapAfter ?? LINE_GAP;
  const lines = wrapText(font, text, size, CONTENT_WIDTH);
  for (const line of lines) {
    ensureSpace(ctx, size + 2);
    ctx.page.drawText(line, { x: MARGIN, y: ctx.y - size, size, font, color });
    ctx.y -= size + 2;
  }
  ctx.y -= gapAfter;
}

function writeHorizontalRule(ctx: RenderCtx, color: ReturnType<typeof rgb>): void {
  ensureSpace(ctx, 8);
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y - 2 },
    end: { x: MARGIN + CONTENT_WIDTH, y: ctx.y - 2 },
    thickness: 1,
    color,
  });
  ctx.y -= 8;
}

function wrapText(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  if (!text) return [];
  const paragraphs = text.split(/\r?\n/);
  const out: string[] = [];
  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      out.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      const width = font.widthOfTextAtSize(candidate, size);
      if (width > maxWidth && line) {
        out.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

/**
 * Render a resume to a PDF Buffer.
 * Layout: name → contact → summary → experience → education → skills → projects → certs.
 */
export async function renderPdf(
  _slug: string,
  meta: TemplateMeta,
  content: ResumeContent,
): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${content.contact.name || "Resume"} — Resume`);
  doc.setAuthor(content.contact.name || "Unknown");
  doc.setProducer("Resume Matchmaker");
  doc.setCreator("Resume Matchmaker — pdf-lib");

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique);

  const ctx: RenderCtx = {
    doc,
    font,
    fontBold,
    fontItalic,
    page: doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
    y: PAGE_HEIGHT - MARGIN,
  };

  // Parse the primary color (#rrggbb → rgb(r,g,b) in [0,1]).
  const primary = hexToRgb(meta.colors.primary) ?? rgb(0.02, 0.59, 0.41);
  const textColor = hexToRgb(meta.colors.text) ?? rgb(0.12, 0.16, 0.22);
  const muted = rgb(0.42, 0.45, 0.5);

  // Title
  writeLine(ctx, content.contact.name || "Your Name", {
    font: fontBold,
    size: FONT_SIZE_TITLE,
    color: primary,
    gapAfter: 4,
  });

  // Contact line
  const contactParts = [
    content.contact.email,
    content.contact.phone,
    content.contact.location,
    content.contact.website,
    content.contact.linkedin,
    content.contact.github,
  ].filter(Boolean);
  if (contactParts.length > 0) {
    writeLine(ctx, contactParts.join("  ·  "), { size: FONT_SIZE_SMALL, color: muted, gapAfter: 6 });
  }
  writeHorizontalRule(ctx, primary);

  // Summary
  if (content.summary) {
    writeLine(ctx, "SUMMARY", { font: fontBold, size: FONT_SIZE_HEADER, color: primary, gapAfter: 4 });
    writeLine(ctx, content.summary, { gapAfter: 8 });
  }

  // Experience
  if (content.experience.length > 0) {
    writeLine(ctx, "EXPERIENCE", { font: fontBold, size: FONT_SIZE_HEADER, color: primary, gapAfter: 4 });
    for (const exp of content.experience) {
      writeLine(ctx, `${exp.position} — ${exp.company}`, { font: fontBold, size: FONT_SIZE_BODY, color: textColor, gapAfter: 1 });
      const dates =
        exp.startDate || exp.endDate
          ? `${exp.startDate || ""}${exp.endDate ? ` – ${exp.endDate}` : " – Present"}`
          : "";
      if (dates) writeLine(ctx, dates, { size: FONT_SIZE_SMALL, color: muted, gapAfter: 3 });
      if (exp.description) writeLine(ctx, exp.description, { font: fontItalic, gapAfter: 3 });
      for (const bullet of exp.bullets) {
        writeLine(ctx, `•  ${bullet}`, { gapAfter: 2 });
      }
      ctx.y -= 4;
    }
    ctx.y += 4;
  }

  // Education
  if (content.education.length > 0) {
    ensureSpace(ctx, 30);
    writeLine(ctx, "EDUCATION", { font: fontBold, size: FONT_SIZE_HEADER, color: primary, gapAfter: 4 });
    for (const edu of content.education) {
      writeLine(ctx, `${edu.institution}`, { font: fontBold, color: textColor, gapAfter: 1 });
      const dates =
        edu.startDate || edu.endDate
          ? `${edu.startDate || ""}${edu.endDate ? ` – ${edu.endDate}` : ""}`
          : "";
      const degreeBits = [edu.degree, edu.field].filter(Boolean).join(", ");
      const line2 = [degreeBits, dates, edu.gpa ? `GPA: ${edu.gpa}` : ""].filter(Boolean).join("  ·  ");
      if (line2) writeLine(ctx, line2, { size: FONT_SIZE_SMALL, color: muted, gapAfter: 6 });
    }
  }

  // Skills
  if (content.skills.length > 0) {
    ensureSpace(ctx, 30);
    writeLine(ctx, "SKILLS", { font: fontBold, size: FONT_SIZE_HEADER, color: primary, gapAfter: 4 });
    for (const grp of content.skills) {
      writeLine(ctx, `${grp.category}: ${grp.items.join(", ")}`, { gapAfter: 3 });
    }
    ctx.y -= 2;
  }

  // Projects
  if (content.projects?.length) {
    ensureSpace(ctx, 30);
    writeLine(ctx, "PROJECTS", { font: fontBold, size: FONT_SIZE_HEADER, color: primary, gapAfter: 4 });
    for (const proj of content.projects) {
      writeLine(ctx, proj.name + (proj.url ? ` — ${proj.url}` : ""), { font: fontBold, color: textColor, gapAfter: 1 });
      if (proj.description) writeLine(ctx, proj.description, { font: fontItalic, gapAfter: 2 });
      if (proj.technologies.length > 0) {
        writeLine(ctx, `Tech: ${proj.technologies.join(", ")}`, { size: FONT_SIZE_SMALL, color: muted, gapAfter: 4 });
      }
    }
  }

  // Certifications
  if (content.certifications?.length) {
    ensureSpace(ctx, 20);
    writeLine(ctx, "CERTIFICATIONS", { font: fontBold, size: FONT_SIZE_HEADER, color: primary, gapAfter: 4 });
    for (const cert of content.certifications) {
      const bits = [cert.name, cert.issuer, cert.date].filter(Boolean);
      writeLine(ctx, `•  ${bits.join("  ·  ")}`, { gapAfter: 2 });
    }
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

function hexToRgb(hex: string): ReturnType<typeof rgb> | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const v = parseInt(m[1], 16);
  return rgb(((v >> 16) & 0xff) / 255, ((v >> 8) & 0xff) / 255, (v & 0xff) / 255);
}
