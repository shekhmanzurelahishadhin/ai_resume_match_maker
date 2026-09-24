// Zod schema for the structured resume content JSON used by the rendering engine.
// This shape is stored on GeneratedResume.contentJson and validated on every
// generate / update API call.

import { z } from "zod";

export const contactSchema = z.object({
  // Allow empty strings — drafts are saved before the user fills everything in.
  // The export endpoints can do a stricter final check.
  name: z.string().max(120).default(""),
  email: z
    .string()
    .max(160)
    .refine(
      (v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      "Valid email required",
    )
    .default(""),
  phone: z.string().max(40).optional().default(""),
  location: z.string().max(120).optional().default(""),
  website: z.string().max(200).optional().default(""),
  linkedin: z.string().max(200).optional().default(""),
  github: z.string().max(200).optional().default(""),
});
export type Contact = z.infer<typeof contactSchema>;

export const experienceItemSchema = z.object({
  id: z.string().optional(),
  company: z.string().max(160).default(""),
  position: z.string().max(160).default(""),
  startDate: z.string().max(40).optional().default(""),
  endDate: z.string().max(40).optional().default(""),
  description: z.string().max(600).optional().default(""),
  bullets: z.array(z.string().max(400)).default([]),
});
export type ExperienceItem = z.infer<typeof experienceItemSchema>;

export const educationItemSchema = z.object({
  id: z.string().optional(),
  institution: z.string().max(160).default(""),
  degree: z.string().max(120).optional().default(""),
  field: z.string().max(120).optional().default(""),
  startDate: z.string().max(40).optional().default(""),
  endDate: z.string().max(40).optional().default(""),
  gpa: z.string().max(20).optional().default(""),
});
export type EducationItem = z.infer<typeof educationItemSchema>;

export const skillGroupSchema = z.object({
  category: z.string().max(60).default(""),
  items: z.array(z.string().max(80)).default([]),
});
export type SkillGroup = z.infer<typeof skillGroupSchema>;

export const projectItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().max(160).default(""),
  description: z.string().max(600).optional().default(""),
  url: z.string().max(200).optional().default(""),
  technologies: z.array(z.string().max(60)).default([]),
});
export type ProjectItem = z.infer<typeof projectItemSchema>;

export const certificationItemSchema = z.object({
  name: z.string().max(160).default(""),
  issuer: z.string().max(160).optional().default(""),
  date: z.string().max(40).optional().default(""),
});
export type CertificationItem = z.infer<typeof certificationItemSchema>;

export const resumeContentSchema = z.object({
  contact: contactSchema,
  summary: z.string().max(2000).optional().default(""),
  experience: z.array(experienceItemSchema).default([]),
  education: z.array(educationItemSchema).default([]),
  skills: z.array(skillGroupSchema).default([]),
  projects: z.array(projectItemSchema).optional().default([]),
  certifications: z.array(certificationItemSchema).optional().default([]),
});
export type ResumeContent = z.infer<typeof resumeContentSchema>;

// Older saves (and AI output) can carry `null` for blank fields. Treat null as
// "missing" so the schema defaults fill in "" / [] instead of failing.
function dropNulls(value: unknown): unknown {
  if (Array.isArray(value)) return value.filter((v) => v !== null).map(dropNulls);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== null)
        .map(([k, v]) => [k, dropNulls(v)]),
    );
  }
  return value;
}

export function parseResumeContent(raw: unknown) {
  return resumeContentSchema.safeParse(dropNulls(raw));
}

// Theme overrides applied on top of a template. Mirrors the rules in
// ResumeTemplateRenderer::customizationRules() on the Laravel side; any key
// left out means "use the template's default".
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a #rrggbb colour");

export const customizationSchema = z
  .object({
    primaryColor: hexColor.optional(),
    accentColor: hexColor.optional(),
    headingFont: z.enum(["sans", "modern", "serif", "mono"]).optional(),
    bodyFont: z.enum(["sans", "modern", "serif", "mono"]).optional(),
    spacing: z.enum(["compact", "normal", "relaxed"]).optional(),
    fontSize: z.enum(["small", "medium", "large"]).optional(),
  })
  .optional()
  .default({});
export type ResumeCustomization = z.infer<typeof customizationSchema>;

// Default empty content — used when no originalResume is provided.
export function emptyResumeContent(): ResumeContent {
  return {
    contact: {
      name: "",
      email: "",
      phone: "",
      location: "",
      website: "",
      linkedin: "",
      github: "",
    },
    summary: "",
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
  };
}

/**
 * Build a ResumeContent from an uploaded Resume's parsed data.
 * Heuristic: skills are bucketed into one "Technical Skills" group by their
 * extracted category; experience is inferred from the resume's plain text
 * (best-effort — we just put the whole extracted text into the summary if no
 * experience can be parsed).
 */
export function contentFromParsedResume(args: {
  extractedText: string | null;
  skillsJson: {
    skills?: string[];
    categories?: Record<string, string[]>;
  } | null;
  experienceYears: number | null;
  fileName: string;
}): ResumeContent {
  const text = args.extractedText ?? "";
  const cats = args.skillsJson?.categories ?? {};
  const skills: SkillGroup[] = Object.entries(cats)
    .filter(([, items]) => Array.isArray(items) && items.length > 0)
    .map(([category, items]) => ({
      category,
      items: (items as string[]).slice(0, 40),
    }));

  // Heuristic: try to pull a name from the first non-empty line.
  const firstLine = text.split(/\r?\n/).map((l) => l.trim()).find((l) => l.length > 0) ?? "";

  // Pull email/phone out of the text if possible.
  const email = (text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] ?? "");
  const phone = (text.match(/(\+?\d[\d\s().-]{7,}\d)/)?.[0] ?? "");

  return {
    contact: {
      name: firstLine.slice(0, 80),
      email,
      phone,
      location: "",
      website: "",
      linkedin: "",
      github: "",
    },
    summary:
      `Imported from ${args.fileName}.` +
      (args.experienceYears
        ? ` Approximately ${args.experienceYears} year${args.experienceYears === 1 ? "" : "s"} of experience.`
        : ""),
    experience: [],
    education: [],
    skills: skills.length > 0 ? skills : [],
    projects: [],
    certifications: [],
  };
}
