// Zod schemas for resume endpoints.
import { z } from "zod";

export const analyzeResumeSchema = z.object({
  // No body required, but allow optional force flag to bypass cache.
  force: z.boolean().optional(),
});

export type AnalyzeResumeInput = z.infer<typeof analyzeResumeSchema>;

// Shape stored in Resume.skillsJson
export const skillsJsonSchema = z.object({
  skills: z.array(z.string()),
  categories: z.record(z.string(), z.array(z.string())),
});

export type SkillsJson = z.infer<typeof skillsJsonSchema>;
