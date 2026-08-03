// Recruiter → Job detail. Shows job metadata + candidate list (via CandidateList component).

import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowLeft, Briefcase, Calendar, Pencil } from "lucide-react";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SkillBadge } from "@/components/skill-badge";
import { CandidateList } from "@/components/candidate-list";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== "recruiter") notFound();

  const job = await db.jobPost.findUnique({
    where: { id },
    include: { _count: { select: { matches: true } } },
  });
  if (!job) notFound();
  if (job.recruiterId !== user.id) notFound();

  const requiredSkills = (job.requiredSkillsJson as { skills?: string[] })?.skills ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/dashboard/recruiter/jobs">
            <ArrowLeft className="size-4" /> Back to jobs
          </Link>
        </Button>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">{job.title}</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
              <Calendar className="size-3.5" />
              Posted {new Date(job.createdAt).toLocaleDateString()} ·{" "}
              {job._count.matches} candidates
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                job.isActive
                  ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200"
                  : "bg-muted text-muted-foreground"
              }
            >
              {job.isActive ? "Active" : "Closed"}
            </Badge>
            <Button asChild size="sm" variant="outline">
              <Link href={`/dashboard/recruiter/jobs/new?edit=${job.id}`}>
                <Pencil className="size-4" /> Edit
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Job description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">
            {job.description}
          </p>
        </CardContent>
      </Card>

      {requiredSkills.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Required skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {requiredSkills.map((s) => (
                <SkillBadge key={s} skill={s} variant="muted" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Briefcase className="size-5" /> Candidates
          </h2>
        </div>
        <CandidateList key={job.id} jobId={job.id} />
      </div>
    </div>
  );
}
