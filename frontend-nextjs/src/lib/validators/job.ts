// Zod schemas for job endpoints.
import { z } from "zod";

export const createJobSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(8000),
  requiredSkills: z.array(z.string().min(1).max(80)).max(50).default([]),
  isActive: z.boolean().optional(),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;

export const updateJobSchema = createJobSchema.partial();
export type UpdateJobInput = z.infer<typeof updateJobSchema>;

// Shape stored in JobPost.requiredSkillsJson
export const requiredSkillsJsonSchema = z.object({
  skills: z.array(z.string()),
});

export type RequiredSkillsJson = z.infer<typeof requiredSkillsJsonSchema>;
