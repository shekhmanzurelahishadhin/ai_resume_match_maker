// GET /api/templates/{slug} — single template detail.

import { db } from "@/lib/db";
import { cache } from "@/lib/cache";
import { ok, getCurrentUser, unauthorized, notFound } from "@/lib/api";
import { getTemplateMeta, renderTemplatePreview } from "@/lib/resume-templates/render";

export const dynamic = "force-dynamic";

function cacheKey(slug: string) {
  return `templates:detail:${slug}`;
}
const CACHE_TTL = 3600;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { slug } = await ctx.params;
  const cached = await cache.get<unknown>(cacheKey(slug));
  if (cached) return ok(cached);

  const row = await db.resumeTemplate.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      previewImage: true,
      isActive: true,
      createdAt: true,
    },
  });
  if (!row || !row.isActive) return notFound("Template not found");

  const meta = getTemplateMeta(slug);
  const previewHtml = renderTemplatePreview(slug);

  const payload = {
    ...row,
    colors: meta?.colors ?? null,
    fonts: meta?.fonts ?? null,
    previewHtml,
  };
  await cache.set(cacheKey(slug), payload, CACHE_TTL);
  return ok(payload);
}
