// Recruiter → My Jobs. Lists the recruiter's jobs + create button.

import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { Briefcase, Plus } from "lucide-react";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { JobCard } from "@/components/job-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function RecruiterJobsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) return null;
  if (user.role !== "recruiter") notFound();

  const jobs = await db.jobPost.findMany({
    where: { recruiterId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { matches: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My jobs</h1>
          <p className="text-sm text-muted-foreground">
            Each new job is auto-matched against every ready resume.
          </p>
        </div>
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Link href="/dashboard/recruiter/jobs/new">
            <Plus className="size-4" /> Post a job
          </Link>
        </Button>
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No jobs posted yet"
          description="Post your first job to start matching against candidate resumes."
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((j) => (
            <JobCard
              key={j.id}
              job={{
                id: j.id,
                title: j.title,
                description: j.description,
                requiredSkills:
                  (j.requiredSkillsJson as { skills?: string[] })?.skills ?? [],
                isActive: j.isActive,
                createdAt: j.createdAt.toISOString(),
                matchCount: j._count.matches,
              }}
              variant="recruiter"
            />
          ))}
        </div>
      )}
    </div>
  );
}
