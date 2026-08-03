// Seeker → Resume detail. Shows extracted skills (categorized), experience years,
// list of matches with match %, AI source badge.

import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowLeft, FileText, Target, Clock } from "lucide-react";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SkillBadge } from "@/components/skill-badge";
import { AiSourceBadge } from "@/components/ai-source-badge";
import { EmptyState } from "@/components/empty-state";
import { ResumeStatusBadge } from "@/components/resume-status-badge";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  Technical: "Technical",
  Tools: "Tools",
  "Soft Skills": "Soft Skills",
  Domain: "Domain",
  Languages: "Languages",
};

export default async function ResumeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string } | undefined;
  if (!user?.id) return null;

  const resume = await db.resume.findUnique({
    where: { id },
    include: {
      matches: {
        orderBy: { matchPercentage: "desc" },
        include: {
          jobPost: {
            select: {
              id: true,
              title: true,
              recruiter: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  if (!resume) notFound();
  if (resume.userId !== user.id) notFound();

  const skillsJson = resume.skillsJson as {
    skills?: string[];
    categories?: Record<string, string[]>;
    _source?: "ai" | "fallback";
  } | null;
  const skills = skillsJson?.skills ?? [];
  const categories = skillsJson?.categories ?? {};
  const skillSource = skillsJson?._source ?? "fallback";

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/dashboard/seeker/resumes">
            <ArrowLeft className="size-4" /> Back to resumes
          </Link>
        </Button>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight truncate">
              {resume.fileName}
            </h1>
            <p className="text-sm text-muted-foreground">
              Uploaded {new Date(resume.createdAt).toLocaleString()}
            </p>
          </div>
          <ResumeStatusBadge status={resume.status} error={resume.parseError} />
        </div>
      </div>

      {resume.status === "failed" ? (
        <Card className="border-rose-300 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-800">
          <CardContent className="text-sm text-rose-900 dark:text-rose-200">
            <p className="font-medium">Parsing failed</p>
            <p className="mt-1 opacity-90">{resume.parseError}</p>
            <p className="mt-2 text-xs opacity-80">
              Try re-uploading or use the re-analyze button. Scanned image PDFs are
              not supported.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-2">
            <div className="rounded-md bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <Clock className="size-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Experience</p>
              <p className="font-semibold">
                {resume.experienceYears != null
                  ? `${resume.experienceYears} yr${resume.experienceYears === 1 ? "" : "s"}`
                  : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-2">
            <div className="rounded-md bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <FileText className="size-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Skills found</p>
              <p className="font-semibold">{skills.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-2">
            <div className="rounded-md bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <Target className="size-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Matches</p>
              <p className="font-semibold">{resume.matches.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Skills by category */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base">Extracted skills</CardTitle>
              <CardDescription>
                Grouped by category. The badge shows whether AI or fallback was used.
              </CardDescription>
            </div>
            <AiSourceBadge source={skillSource} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {skills.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              {resume.status === "ready"
                ? "No skills were detected. Try re-analyzing."
                : "Skills will appear here once parsing is complete."}
            </p>
          ) : (
            (Object.keys(CATEGORY_LABELS) as string[]).map((cat) => {
              const list = categories[cat] ?? [];
              if (list.length === 0) return null;
              return (
                <div key={cat}>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    {CATEGORY_LABELS[cat]} ({list.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {list.map((s) => (
                      <SkillBadge key={s} skill={s} />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Matches */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Job matches</CardTitle>
          <CardDescription>
            Ranked by match percentage. The AI source reflects how the similarity
            score was computed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {resume.matches.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No matches yet"
              description="When recruiters post active jobs, they'll appear here automatically."
            />
          ) : (
            <ul className="divide-y">
              {resume.matches.map((m) => (
                <li key={m.id} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {m.jobPost.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {m.jobPost.recruiter?.name} ·{" "}
                        {new Date(m.analyzedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {Math.round(m.matchPercentage)}%
                      </p>
                      <AiSourceBadge source={m.matchSource} />
                    </div>
                  </div>
                  <Progress value={m.matchPercentage} className="h-1.5 mt-2" />
                  {(m.matchedSkillsJson as { skills?: string[] })?.skills?.length ||
                  (m.missingSkillsJson as { skills?: string[] })?.skills?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {((m.matchedSkillsJson as { skills?: string[] })?.skills ?? []).slice(0, 6).map((s) => (
                        <SkillBadge key={s} skill={s} variant="matched" />
                      ))}
                      {((m.missingSkillsJson as { skills?: string[] })?.skills ?? []).slice(0, 4).map((s) => (
                        <SkillBadge key={s} skill={s} variant="missing" />
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
