// Seed 6 resume templates into the ResumeTemplate table.
//
// Idempotent: upserts by `slug`, so re-running is safe.
// Run with: `bun run scripts/seed-templates.ts` (or `bun run db:seed-templates`).
//
// The matching Handlebars templates live in src/lib/resume-templates/<slug>/.
// This seed only inserts the DB metadata (name, slug, description, previewImage).

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

interface TemplateSeed {
  slug: string;
  name: string;
  description: string;
  previewImage: string | null;
}

const TEMPLATES: TemplateSeed[] = [
  {
    slug: "modern-clean",
    name: "Modern Clean",
    description:
      "Modern Clean — Minimalist single-column with clear typography hierarchy",
    previewImage: null,
  },
  {
    slug: "professional-classic",
    name: "Professional Classic",
    description:
      "Professional Classic — Traditional serif, two-column with sidebar",
    previewImage: null,
  },
  {
    slug: "creative",
    name: "Creative",
    description:
      "Creative — Bold accents and asymmetric layout for design roles",
    previewImage: null,
  },
  {
    slug: "executive",
    name: "Executive",
    description:
      "Executive — Compact, dense, executive-level format with summary on top",
    previewImage: null,
  },
  {
    slug: "technical",
    name: "Technical",
    description: "Technical — Skills-forward layout emphasizing tech stack",
    previewImage: null,
  },
  {
    slug: "academic",
    name: "Academic",
    description:
      "Academic — Citation-friendly format for researchers and academics",
    previewImage: null,
  },
];

async function main() {
  console.log("Seeding resume templates...");
  for (const t of TEMPLATES) {
    const row = await db.resumeTemplate.upsert({
      where: { slug: t.slug },
      create: {
        slug: t.slug,
        name: t.name,
        description: t.description,
        previewImage: t.previewImage,
        isActive: true,
      },
      update: {
        name: t.name,
        description: t.description,
        previewImage: t.previewImage,
        isActive: true,
      },
    });
    console.log(`  ✓ ${row.slug} → ${row.id}`);
  }
  console.log(`Done. ${TEMPLATES.length} templates seeded.`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
