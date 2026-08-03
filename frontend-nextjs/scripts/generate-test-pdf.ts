// Generate a tiny test PDF resume for verification.
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

const out = "/home/z/my-project/tests/fixtures/sample-resume.pdf";
mkdirSync(dirname(out), { recursive: true });

(async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([612, 792]);
  const lines: Array<[string, number, boolean]> = [
    ["Jane Doe", 24, true],
    ["jane.doe@example.com | (555) 123-4567 | San Francisco, CA", 11, false],
    ["", 6, false],
    ["SUMMARY", 12, true],
    ["Senior backend engineer with 8 years building scalable APIs.", 11, false],
    ["", 6, false],
    ["SKILLS", 12, true],
    ["TypeScript, JavaScript, Node.js, Python, Go, React, PostgreSQL,", 11, false],
    ["MongoDB, Redis, Docker, Kubernetes, AWS, GraphQL, REST, gRPC,", 11, false],
    ["Microservices, CI/CD, Jenkins, Git, Linux, Terraform", 11, false],
    ["", 6, false],
    ["EXPERIENCE", 12, true],
    ["Senior Backend Engineer, Acme Corp — 2021 to Present", 11, false],
    ["  - Led migration of monolith to microservices (Go + Kubernetes).", 11, false],
    ["  - Built GraphQL gateway serving 2M requests/day.", 11, false],
    ["  - Reduced p99 latency by 40% via Redis caching.", 11, false],
    ["", 4, false],
    ["Backend Engineer, StartupX — 2018 to 2021", 11, false],
    ["  - Designed PostgreSQL schema serving 10M users.", 11, false],
    ["  - Implemented OAuth2 + JWT auth flow.", 11, false],
    ["", 6, false],
    ["EDUCATION", 12, true],
    ["B.S. Computer Science, UC Berkeley — 2014 to 2018", 11, false],
    ["", 6, false],
    ["CERTIFICATIONS", 12, true],
    ["AWS Solutions Architect Professional (2022)", 11, false],
    ["Certified Kubernetes Administrator (2021)", 11, false],
  ];
  let y = 740;
  for (const [text, size, isBold] of lines) {
    if (text) page.drawText(text as string, { x: 50, y, size: size as number, font: isBold ? bold : font, color: rgb(0, 0, 0) });
    y -= (size as number) + 6;
  }
  writeFileSync(out, await doc.save());
  console.log("Wrote", out, "size:", (await doc.save()).length, "bytes");
})();
