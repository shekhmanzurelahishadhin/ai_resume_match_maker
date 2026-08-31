// Recruiter → My Jobs. Lists the recruiter's jobs + create button.

import Link from "next/link";
import { Briefcase, Plus } from "lucide-react";

import { apiGetOrNull, type Paginated } from "@/lib/server-api";
import { JobCard } from "@/components/job-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface JobListItem {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  isActive: boolean;
  matchCount: number;
  createdAt: string;
}

export default async function RecruiterJobsPage() {
  // The API already scopes this to the signed-in recruiter's own jobs.
  const page = await apiGetOrNull<Paginated<JobListItem>>("jobs?pageSize=100");
  const jobs = page?.items ?? [];

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
              job={j}
              variant="recruiter"
            />
          ))}
        </div>
      )}
    </div>
  );
}
