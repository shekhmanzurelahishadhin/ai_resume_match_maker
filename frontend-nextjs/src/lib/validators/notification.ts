// Zod schemas for notification API request bodies.

import { z } from "zod";

export const registerDeviceSchema = z.object({
  deviceToken: z
    .string()
    .min(16, "deviceToken must be a non-empty string")
    .max(4096, "deviceToken is too long"),
  deviceType: z.enum(["web", "ios", "android"]).default("web"),
  browserInfo: z.string().max(512).optional(),
});

export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;

export const updatePreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  jobMatches: z.boolean().optional(),
  resumeAnalysis: z.boolean().optional(),
  newJobs: z.boolean().optional(),
  dailyDigest: z.boolean().optional(),
});

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
