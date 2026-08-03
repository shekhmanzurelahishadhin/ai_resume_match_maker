// Generate a tiny valid PDF containing a sample resume with extractable text.
// Run once before the resumes test (or any test that needs a real PDF).
//
// Output: tests/fixtures/sample-resume.pdf
//
// Uses pdf-lib (already in package.json — used by Phase 2's export feature).

import { promises as fs } from "node:fs";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const OUTPUT_DIR = path.join(__dirname);
const OUTPUT_FILE = path.join(OUTPUT_DIR, "sample-resume.pdf");

const RESUME_TEXT_LINES = [
  "Jane Doe",
  "Software Engineer",
  "Email: jane.doe@example.com",
  "Phone: 555-123-4567",
  "",
  "SKILLS",
  "JavaScript, TypeScript, React, Node.js, Python, SQL, AWS, Docker, GraphQL, REST API",
  "",
  "EXPERIENCE",
  "Senior Software Engineer at TechCorp (2020 - Present)",
  "Built React frontend with TypeScript",
  "Designed GraphQL APIs with Node.js",
  "Deployed on AWS using Docker",
  "",
  "Software Engineer at StartupCo (2017 - 2020)",
  "Developed Python backend services",
  "Managed PostgreSQL databases",
  "Created REST API endpoints",
  "",
  "EDUCATION",
  "B.S. Computer Science, State University (2013 - 2017)",
];

export async function generateSampleResumePdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.setTitle("Sample Resume — Resume Matchmaker Tests");
  doc.setAuthor("Vitest Fixture");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([612, 792]); // US Letter
  const fontSize = 11;
  const lineHeight = fontSize + 4;
  let y = page.getHeight() - 50;
  for (const line of RESUME_TEXT_LINES) {
    page.drawText(line, {
      x: 50,
      y,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });
    y -= lineHeight;
  }
  const bytes = await doc.save();
  return Buffer.from(bytes);
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const pdf = await generateSampleResumePdf();
  await fs.writeFile(OUTPUT_FILE, pdf);
  console.log(`Wrote ${OUTPUT_FILE} (${pdf.length} bytes)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
