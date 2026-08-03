// render.ts — Handlebars HTML renderer for resume templates.
//
// `renderHtml(slug, content, customization)` → full HTML document string.
// Used by:
//   - GET /api/templates → preview thumbnails (small content)
//   - GET /api/resumes/generate/{id}/preview → live preview
//   - POST /api/resumes/generate/{id}/export { format: 'html' } → file
//
// All user-provided content is rendered through Handlebars' default `{{ }}`
// auto-escaping. We never use `{{{ }}}` (unescaped) for user fields.
// (Only `{{{baseCss}}}` and `{{{meta.*}}}` are server-trusted and unescaped.)
//
// Template sources are read from disk with node:fs (no bundler `?raw` import)
// so this works in both dev (Turbopack) and standalone build modes.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import "./register-partials";
import Handlebars from "handlebars";

import { BASE_CSS, type TemplateMeta } from "./types";
import type { ResumeContent, ResumeCustomization } from "@/lib/validators/resume-content";

import { meta as modernCleanMeta } from "./modern-clean/meta";
import { meta as professionalClassicMeta } from "./professional-classic/meta";
import { meta as creativeMeta } from "./creative/meta";
import { meta as executiveMeta } from "./executive/meta";
import { meta as technicalMeta } from "./technical/meta";
import { meta as academicMeta } from "./academic/meta";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readTemplate(slug: string): string {
  return readFileSync(
    path.resolve(__dirname, slug, "template.hbs"),
    "utf8",
  );
}

interface TemplateEntry {
  source: string;
  meta: TemplateMeta;
  compiled: HandlebarsTemplateDelegate;
}

function makeEntry(meta: TemplateMeta): TemplateEntry {
  const source = readTemplate(meta.slug);
  return {
    source,
    meta,
    compiled: Handlebars.compile(source, { noEscape: false }),
  };
}

const TEMPLATES: Record<string, TemplateEntry> = {
  "modern-clean": makeEntry(modernCleanMeta),
  "professional-classic": makeEntry(professionalClassicMeta),
  creative: makeEntry(creativeMeta),
  executive: makeEntry(executiveMeta),
  technical: makeEntry(technicalMeta),
  academic: makeEntry(academicMeta),
};

export const TEMPLATE_SLUGS = Object.keys(TEMPLATES);

export function getTemplateMeta(slug: string): TemplateMeta | null {
  return TEMPLATES[slug]?.meta ?? null;
}

export function allTemplateMetas(): TemplateMeta[] {
  return TEMPLATE_SLUGS.map((slug) => TEMPLATES[slug].meta);
}

/** Merge user customization over the template's defaults. */
function effectiveMeta(
  slug: string,
  customization?: ResumeCustomization | null,
): TemplateMeta {
  const base = TEMPLATES[slug].meta;
  return {
    ...base,
    colors: {
      ...base.colors,
      ...(customization?.primaryColor ? { primary: customization.primaryColor } : {}),
      ...(customization?.accentColor ? { accent: customization.accentColor } : {}),
    },
    fonts: {
      ...base.fonts,
      ...(customization?.headingFont ? { heading: customization.headingFont } : {}),
      ...(customization?.bodyFont ? { body: customization.bodyFont } : {}),
    },
  };
}

/**
 * Render a resume template to a full HTML document.
 *
 * @param slug           Template slug (e.g. "modern-clean").
 * @param content        Structured resume content.
 * @param customization  Optional color/font overrides.
 */
export function renderHtml(
  slug: string,
  content: ResumeContent,
  customization?: ResumeCustomization | null,
): string {
  const tpl = TEMPLATES[slug];
  if (!tpl) {
    throw new Error(`Unknown resume template slug: ${slug}`);
  }
  const meta = effectiveMeta(slug, customization);
  // The template uses `{{{baseCss}}}` (server-trusted, unescaped) for the
  // shared stylesheet. All other variables come from `content` and go
  // through Handlebars' default HTML auto-escaping.
  return tpl.compiled({
    contact: content.contact,
    summary: content.summary,
    experience: content.experience,
    education: content.education,
    skills: content.skills,
    projects: content.projects ?? [],
    certifications: content.certifications ?? [],
    meta,
    baseCss: BASE_CSS,
  });
}

/**
 * Render a small HTML snippet suitable for a template thumbnail preview.
 * Uses canned sample content so the preview is independent of user data.
 */
export function renderTemplatePreview(slug: string): string {
  const sample: ResumeContent = {
    contact: {
      name: "Alex Sample",
      email: "alex@example.com",
      phone: "+1 (555) 123-4567",
      location: "San Francisco, CA",
      website: "alexsample.dev",
      linkedin: "linkedin.com/in/alexsample",
      github: "github.com/alexsample",
    },
    summary:
      "Senior product engineer with 8+ years building delightful web apps end-to-end.",
    experience: [
      {
        company: "Acme Corp",
        position: "Senior Engineer",
        startDate: "2021",
        endDate: "Present",
        description: "",
        bullets: [
          "Led migration to a typed serverless stack, cutting p95 latency by 40%.",
          "Mentored 4 engineers and established the team's testing culture.",
        ],
      },
      {
        company: "Beta LLC",
        position: "Software Engineer",
        startDate: "2017",
        endDate: "2021",
        description: "",
        bullets: ["Shipped the v2 dashboard used by 10k+ daily users."],
      },
    ],
    education: [
      {
        institution: "State University",
        degree: "B.S.",
        field: "Computer Science",
        startDate: "2013",
        endDate: "2017",
        gpa: "3.8",
      },
    ],
    skills: [
      { category: "Languages", items: ["TypeScript", "Python", "Go"] },
      { category: "Tools", items: ["React", "Next.js", "PostgreSQL", "Docker"] },
    ],
    projects: [
      {
        name: "OpenResume",
        description: "Open-source resume builder with 2k+ stars.",
        url: "github.com/alexsample/openresume",
        technologies: ["Next.js", "Prisma", "Tailwind"],
      },
    ],
    certifications: [],
  };
  return renderHtml(slug, sample, null);
}
