// GET /api/templates — list all active resume templates (cached 1 hour).

import { db } from "@/lib/db";
import { cache } from "@/lib/cache";
import { ok, getCurrentUser, unauthorized } from "@/lib/api";
import { allTemplateMetas } from "@/lib/resume-templates/render";

export const dynamic = "force-dynamic";

const CACHE_KEY = "templates:list";
const CACHE_TTL = 3600; // 1 hour

export async function GET() {
  // Templates are public among authenticated users — no per-user scoping.
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const cached = await cache.get<unknown>(CACHE_KEY);
  if (cached) return ok(cached);

  const rows = await db.resumeTemplate.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
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

  // Merge in the static meta (colors/fonts) from the file system so the UI
  // can render template thumbnail accents without an extra request.
  const metaBySlug = new Map(allTemplateMetas().map((m) => [m.slug, m]));
  const items = rows.map((r) => ({
    ...r,
    colors: metaBySlug.get(r.slug)?.colors ?? null,
    fonts: metaBySlug.get(r.slug)?.fonts ?? null,
  }));

  const payload = { items, total: items.length };
  await cache.set(CACHE_KEY, payload, CACHE_TTL);
  return ok(payload);
}
