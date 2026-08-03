// GET /api/resumes — list current user's resumes (paginated 15/page).

import { db } from "@/lib/db";
import { getCurrentUser, ok, unauthorized, parsePagination } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { skip, take, page, pageSize } = parsePagination(req, 15);

  const [items, total] = await Promise.all([
    db.resume.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        fileSizeBytes: true,
        experienceYears: true,
        status: true,
        parseError: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { matches: true } },
      },
    }),
    db.resume.count({ where: { userId: user.id } }),
  ]);

  return ok({
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
