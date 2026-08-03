// POST /api/resumes/{id}/analyze — re-run analysis, return updated skills + match count.

import { after } from "next/server";

import { db } from "@/lib/db";
import { getCurrentUser, ok, unauthorized, notFound, forbidden, err } from "@/lib/api";
import { parseResumeAndMatch } from "@/lib/resume-parser";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  const resume = await db.resume.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });
  if (!resume) return notFound("Resume not found");
  if (resume.userId !== user.id) return forbidden();

  // Reject if status is currently 'parsing' to avoid concurrent edits.
  const current = await db.resume.findUnique({
    where: { id },
    select: { status: true },
  });
  if (current?.status === "parsing") {
    return err("Resume is currently being parsed; try again in a moment", 409, "PARSING_IN_PROGRESS");
  }

  // Kick off the re-parse in the background (same flow as upload).
  after(
    parseResumeAndMatch(id).catch((e) => {
      console.error(
        JSON.stringify({
          level: "error",
          event: "resume_reanalyze_failed",
          resumeId: id,
          error: e instanceof Error ? e.message : String(e),
        }),
      );
    }),
  );

  return ok({ reanalyzing: true, resumeId: id });
}
