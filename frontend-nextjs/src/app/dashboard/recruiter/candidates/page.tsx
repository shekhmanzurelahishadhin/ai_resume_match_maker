// Recruiter → Candidates. Pick a job, see its candidates.
// Lists all of the recruiter's jobs in a sidebar and shows the CandidateList for the
// selected job (defaults to the first/most-recent one).

import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, Briefcase } from "lucide-react";

import { apiGetOrNull, type Paginated } from "@/lib/server-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CandidateList } from "@/components/candidate-list";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

interface JobSummary {
  id: string;
  title: string;
  isActive: boolean;
  matchCount: number;
}

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string }>;
}) {
  const sp = await searchParams;

  // The API scopes this to the signed-in recruiter's own jobs.
  const page = await apiGetOrNull<Paginated<JobSummary>>("jobs?pageSize=100");
  const jobs = page?.items ?? [];

  if (jobs.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Candidates</h1>
          <p className="text-sm text-muted-foreground">
            Browse ranked candidates per job.
          </p>
        </div>
        <EmptyState
          icon={Briefcase}
          title="No jobs yet"
          description="Post a job first — candidates will appear here once seekers' resumes match it."
          actionLabel="Post a job"
        />
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Link href="/dashboard/recruiter/jobs/new">Post a job</Link>
        </Button>
      </div>
    );
  }

  const selectedId = sp.job ?? jobs[0].id;
  const selected = jobs.find((j) => j.id === selectedId) ?? jobs[0];

  // If the requested ?job= doesn't belong to the recruiter, redirect to first.
  if (sp.job && !jobs.some((j) => j.id === sp.job)) {
    redirect("/dashboard/recruiter/candidates");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Candidates</h1>
        <p className="text-sm text-muted-foreground">
          Pick a job to see its ranked candidates, then contact the ones you like.
        </p>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-4">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Jobs ({jobs.length})</CardTitle>
          </CardHeader>
          <CardContent className="px-2">
            <ul className="space-y-1 max-h-60 overflow-y-auto lg:max-h-none">
              {jobs.map((j) => {
                const active = j.id === selected.id;
                return (
                  <li key={j.id}>
                    <Link
                      href={`/dashboard/recruiter/candidates?job=${j.id}`}
                      className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                        active
                          ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200"
                          : "hover:bg-muted/60"
                      }`}
                    >
                      <p className="font-medium truncate">{j.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <Users className="size-3" />
                        {j.matchCount} candidates
                        {!j.isActive ? (
                          <Badge variant="outline" className="bg-muted text-muted-foreground ml-auto">
                            Closed
                          </Badge>
                        ) : null}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">{selected.title}</h2>
            <Button asChild size="sm" variant="outline">
              <Link href={`/dashboard/recruiter/jobs/${selected.id}?tab=applicants`}>Open job workspace</Link>
            </Button>
          </div>
          <CandidateList key={selected.id} jobId={selected.id} jobTitle={selected.title} />
        </div>
      </div>
    </div>
  );
}
