// GET /api/resumes/generate/{id}/preview — return an HTML preview string.
//
// Cache: 1 hour keyed on `template:preview:<slug>:<md5(contentJson)>`.

import crypto from "node:crypto";

import { db } from "@/lib/db";
import { cache } from "@/lib/cache";
import {
  ok,
  notFound,
  forbidden,
  getCurrentUser,
  unauthorized,
} from "@/lib/api";
import { renderHtml } from "@/lib/resume-templates/render";
import {
  resumeContentSchema,
  customizationSchema,
  type ResumeContent,
  type ResumeCustomization,
} from "@/lib/validators/resume-content";

export const dynamic = "force-dynamic";

const CACHE_TTL = 3600;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const r = await db.generatedResume.findUnique({
    where: { id },
    include: { template: { select: { slug: true, name: true } } },
  });
  if (!r) return notFound("Generated resume not found");
  if (r.userId !== user.id) return forbidden();

  // Validate the stored content (defense-in-depth — it was validated on write).
  const contentParsed = resumeContentSchema.safeParse(r.contentJson);
  if (!contentParsed.success) {
    return ok({
      html: "<!doctype html><html><body><p>Resume content is malformed.</p></body></html>",
    });
  }
  const customizationParsed = customizationSchema.safeParse(r.customizationJson ?? {});

  const content = contentParsed.data as ResumeContent;
  const customization = (customizationParsed.success ? customizationParsed.data : null) as ResumeCustomization | null;

  // Cache key includes the slug + an md5 of the content so any edit busts the cache.
  const cacheKey = `template:preview:${r.template.slug}:${md5(JSON.stringify(content))}`;
  const cached = await cache.get<string>(cacheKey);
  if (cached) {
    return ok({ html: cached, cached: true });
  }

  const html = renderHtml(r.template.slug, content, customization);
  await cache.set(cacheKey, html, CACHE_TTL);
  return ok({ html, cached: false });
}

function md5(s: string): string {
  return crypto.createHash("md5").update(s).digest("hex");
}
