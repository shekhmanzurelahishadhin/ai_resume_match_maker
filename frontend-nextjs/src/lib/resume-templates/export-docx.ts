// export-docx.ts — minimal DOCX generation using jszip + a templated XML.
//
// Per spec §6: DOCX is content-accurate, NOT layout-accurate. We emit a clean
// single-column document with paragraphs, headings, and bullet lists.
// This avoids the heavy `html-docx-js` dependency (which has had issues in
// modern bundlers) and gives us full control over the output.

import JSZip from "jszip";

import type { ResumeContent } from "@/lib/validators/resume-content";

// Minimal DOCX skeleton. The `[Content]` placeholder is replaced with the
// generated <w:body> XML.
const DOCX_TEMPLATE = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<w:body>
[Content]
<w:sectPr>
<w:pgSz w:w="12240" w:h="15840"/>
<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
</w:sectPr>
</w:body>
</w:document>`;

const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

const RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const WORD_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults>
<w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault>
</w:docDefaults>
<w:style w:type="paragraph" w:styleId="Title">
<w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="40"/><w:color w:val="059669"/></w:rPr>
</w:style>
<w:style w:type="paragraph" w:styleId="Heading2">
<w:name w:val="heading 2"/><w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="059669"/></w:rPr>
</w:style>
<w:style w:type="paragraph" w:styleId="ListBullet">
<w:name w:val="List Bullet"/>
</w:style>
</w:styles>`;

/** Escape a string for safe insertion into XML. */
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function paragraph(text: string, opts: { bold?: boolean; style?: string; italics?: boolean } = {}): string {
  const rPr: string[] = [];
  if (opts.bold) rPr.push("<w:b/>");
  if (opts.italics) rPr.push("<w:i/>");
  const rPrTag = rPr.length > 0 ? `<w:rPr>${rPr.join("")}</w:rPr>` : "";
  const pPr = opts.style ? `<w:pPr><w:pStyle w:val="${opts.style}"/></w:pPr>` : "";
  return `<w:p>${pPr}<w:r>${rPrTag}<w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r></w:p>`;
}

function bullet(text: string, bold = false): string {
  return paragraph(text, { bold, style: "ListBullet" });
}

function heading(text: string): string {
  return paragraph(text, { style: "Heading2" });
}

function title(text: string): string {
  return paragraph(text, { style: "Title" });
}

function emptyPara(): string {
  return `<w:p/>`;
}

/**
 * Render a resume to a DOCX Buffer.
 */
export async function renderDocx(
  _slug: string,
  _meta: { colors: { primary: string } },
  content: ResumeContent,
): Promise<Buffer> {
  const parts: string[] = [];

  // Title + contact
  parts.push(title(content.contact.name || "Your Name"));
  const contactBits = [
    content.contact.email,
    content.contact.phone,
    content.contact.location,
    content.contact.website,
    content.contact.linkedin,
    content.contact.github,
  ].filter(Boolean);
  if (contactBits.length > 0) {
    parts.push(paragraph(contactBits.join("  ·  ")));
  }
  parts.push(emptyPara());

  if (content.summary) {
    parts.push(heading("Summary"));
    parts.push(paragraph(content.summary));
    parts.push(emptyPara());
  }

  if (content.experience.length > 0) {
    parts.push(heading("Experience"));
    for (const exp of content.experience) {
      parts.push(paragraph(`${exp.position} — ${exp.company}`, { bold: true }));
      const dates =
        exp.startDate || exp.endDate
          ? `${exp.startDate || ""}${exp.endDate ? ` – ${exp.endDate}` : " – Present"}`
          : "";
      if (dates) parts.push(paragraph(dates, { italics: true }));
      if (exp.description) parts.push(paragraph(exp.description, { italics: true }));
      for (const b of exp.bullets) parts.push(bullet(b));
      parts.push(emptyPara());
    }
  }

  if (content.education.length > 0) {
    parts.push(heading("Education"));
    for (const edu of content.education) {
      parts.push(paragraph(edu.institution, { bold: true }));
      const line2 = [
        [edu.degree, edu.field].filter(Boolean).join(", "),
        edu.startDate || edu.endDate
          ? `${edu.startDate || ""}${edu.endDate ? ` – ${edu.endDate}` : ""}`
          : "",
        edu.gpa ? `GPA: ${edu.gpa}` : "",
      ].filter(Boolean).join("  ·  ");
      if (line2) parts.push(paragraph(line2, { italics: true }));
      parts.push(emptyPara());
    }
  }

  if (content.skills.length > 0) {
    parts.push(heading("Skills"));
    for (const grp of content.skills) {
      parts.push(paragraph(`${grp.category}: ${grp.items.join(", ")}`, { bold: false }));
    }
    parts.push(emptyPara());
  }

  if (content.projects?.length) {
    parts.push(heading("Projects"));
    for (const p of content.projects) {
      parts.push(paragraph(p.name + (p.url ? ` — ${p.url}` : ""), { bold: true }));
      if (p.description) parts.push(paragraph(p.description, { italics: true }));
      if (p.technologies.length > 0) {
        parts.push(paragraph(`Tech: ${p.technologies.join(", ")}`, { italics: true }));
      }
      parts.push(emptyPara());
    }
  }

  if (content.certifications?.length) {
    parts.push(heading("Certifications"));
    for (const c of content.certifications) {
      const bits = [c.name, c.issuer, c.date].filter(Boolean);
      parts.push(bullet(bits.join("  ·  "), true));
    }
  }

  const documentXml = DOCX_TEMPLATE.replace("[Content]", parts.join("\n"));

  const zip = new JSZip();
  zip.file("[Content_Types].xml", CONTENT_TYPES_XML);
  zip.folder("_rels")!.file(".rels", RELS_XML);
  zip.folder("word")!.file("document.xml", documentXml);
  zip.folder("word")!.folder("_rels")!.file("document.xml.rels", WORD_RELS_XML);
  zip.folder("word")!.file("styles.xml", STYLES_XML);

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
