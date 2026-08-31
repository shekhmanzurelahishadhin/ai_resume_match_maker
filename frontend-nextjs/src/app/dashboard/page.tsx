// Dashboard overview — stat cards + recent activity, role-aware.
//
// Data comes from the Laravel `GET /api/dashboard` endpoint, which computes the
// aggregates server-side and returns the shape this page renders.

import Link from "next/link";
import {
  FileText,
  Target,
  Briefcase,
  Users,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

import { apiGetOrNull } from "@/lib/server-api";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AiSourceBadge } from "@/components/ai-source-badge";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

interface RecruiterOverview {
  role: "recruiter";
  stats: {
    jobCount: number;
    activeJobCount: number;
    candidateCount: number;
    topMatchPercentage: number;
  };
  recentJobs: Array<{
    id: string;
    title: string;
    isActive: boolean;
    candidateCount: number;
    createdAt: string | null;
  }>;
}

interface SeekerOverview {
  role: "seeker";
  stats: {
    resumeCount: number;
    matchCount: number;
    avgMatchPercentage: number;
  };
  recentResumes: Array<{
    id: string;
    fileName: string;
    status: string;
    matchCount: number;
    createdAt: string | null;
  }>;
  topMatches: Array<{
    id: string;
    matchPercentage: number;
    matchSource: string;
    analyzedAt: string | null;
    jobPost: {
      id: string | null;
      title: string | null;
      recruiterName: string | null;
    };
  }>;
}

type Overview = RecruiterOverview | SeekerOverview;

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString() : "—";
}

export default async function DashboardPage() {
  const overview = await apiGetOrNull<Overview>("dashboard");

  if (!overview) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="Dashboard unavailable"
        description="We couldn't load your overview. Check that the API is running, then refresh."
      />
    );
  }

  if (overview.role === "recruiter") {
    const { stats, recentJobs } = overview;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
            <p className="text-sm text-muted-foreground">
              Your hiring pipeline at a glance.
            </p>
          </div>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Link href="/dashboard/recruiter/jobs/new">
              Post a job <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Briefcase} label="Total jobs" value={stats.jobCount} accent="emerald" />
          <StatCard icon={Briefcase} label="Active jobs" value={stats.activeJobCount} accent="teal" />
          <StatCard icon={Users} label="Candidates" value={stats.candidateCount} accent="amber" />
          <StatCard
            icon={TrendingUp}
            label="Top match"
            value={`${Math.round(stats.topMatchPercentage)}%`}
            accent="emerald"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent jobs</CardTitle>
          </CardHeader>
          <CardContent>
            {recentJobs.length === 0 ? (
              <EmptyState
                icon={Briefcase}
                title="No jobs posted yet"
                description="Create your first job to start matching against candidate resumes."
                actionLabel="Post a job"
                onAction={undefined}
              />
            ) : (
              <ul className="divide-y">
                {recentJobs.map((job) => (
                  <li key={job.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/recruiter/jobs/${job.id}`}
                        className="text-sm font-medium hover:underline truncate block"
                      >
                        {job.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {job.candidateCount} candidates ·{" "}
                        {job.isActive ? "Active" : "Closed"} ·{" "}
                        {formatDate(job.createdAt)}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/dashboard/recruiter/jobs/${job.id}`}>View</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ----- Seeker overview -----
  const { stats, recentResumes, topMatches } = overview;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">
            Your resumes and best matches at a glance.
          </p>
        </div>
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Link href="/dashboard/seeker/resumes">
            Upload resume <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={FileText} label="My resumes" value={stats.resumeCount} accent="emerald" />
        <StatCard icon={Target} label="Matches" value={stats.matchCount} accent="teal" />
        <StatCard
          icon={TrendingUp}
          label="Avg match"
          value={`${Math.round(stats.avgMatchPercentage)}%`}
          accent="amber"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Recent resumes</CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link href="/dashboard/seeker/resumes">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentResumes.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No resumes yet"
                description="Upload your first PDF resume to start matching against jobs."
              />
            ) : (
              <ul className="divide-y">
                {recentResumes.map((r) => (
                  <li key={r.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/seeker/resumes/${r.id}`}
                        className="text-sm font-medium hover:underline truncate block"
                      >
                        {r.fileName}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {r.matchCount} matches · {r.status} · {formatDate(r.createdAt)}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/dashboard/seeker/resumes/${r.id}`}>View</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Top matches</CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link href="/dashboard/seeker/matches">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {topMatches.length === 0 ? (
              <EmptyState
                icon={Target}
                title="No matches yet"
                description="Once your resume is parsed and recruiters post jobs, your top matches will appear here."
              />
            ) : (
              <ul className="divide-y">
                {topMatches.map((m) => (
                  <li key={m.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{m.jobPost.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.jobPost.recruiterName} · {formatDate(m.analyzedAt)}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <AiSourceBadge source={m.matchSource} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        {Math.round(m.matchPercentage)}%
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
