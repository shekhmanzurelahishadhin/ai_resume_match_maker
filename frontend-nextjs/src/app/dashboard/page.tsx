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
  Inbox,
  Search,
  Send,
} from "lucide-react";

import { apiGetOrNull } from "@/lib/server-api";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AiSourceBadge } from "@/components/ai-source-badge";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { APPLICATION_STATUS_STYLES, type ApplicationStatus } from "@/lib/jobs";

export const dynamic = "force-dynamic";

interface RecruiterOverview {
  role: "recruiter";
  stats: {
    jobCount: number;
    activeJobCount: number;
    candidateCount: number;
    topMatchPercentage: number;
    applicationCount: number;
    newApplicationCount: number;
  };
  recentApplications: Array<{
    id: string;
    candidateName: string | null;
    jobId: string;
    jobTitle: string | null;
    status: ApplicationStatus;
    statusLabel: string;
    matchPercentage: number | null;
    appliedAt: string | null;
  }>;
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
    applicationCount: number;
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
    const { stats, recentJobs, recentApplications } = overview;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Your <span className="text-gradient">overview</span></h1>
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

        <div className="stagger grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard icon={Briefcase} label={`Open jobs (of ${stats.jobCount})`} value={stats.activeJobCount} accent="emerald" />
          <StatCard icon={Users} label="Matched candidates" value={stats.candidateCount} accent="teal" />
          <StatCard
            icon={Inbox}
            label={stats.newApplicationCount > 0 ? `Applications · ${stats.newApplicationCount} new` : "Applications"}
            value={stats.applicationCount}
            accent="amber"
          />
          <StatCard
            icon={TrendingUp}
            label="Top match"
            value={`${Math.round(stats.topMatchPercentage)}%`}
            accent="emerald"
          />
        </div>

        <div className="stagger grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent jobs</CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link href="/dashboard/recruiter/jobs">View all</Link>
            </Button>
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
                  <li key={job.id} className="py-3 -mx-2 px-2 rounded-lg flex items-center justify-between gap-3 transition-colors hover:bg-muted/50">
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/recruiter/jobs/${job.id}`}
                        className="text-sm font-medium hover:underline truncate block"
                      >
                        {job.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {job.candidateCount} matched ·{" "}
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Latest applications</CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link href="/dashboard/recruiter/applicants">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentApplications.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No applications yet"
                description="Contact your top matched candidates to invite them to apply."
              />
            ) : (
              <ul className="divide-y">
                {recentApplications.map((a) => (
                  <li key={a.id} className="py-3 -mx-2 px-2 rounded-lg flex items-center justify-between gap-3 transition-colors hover:bg-muted/50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{a.candidateName}</p>
                      <Link
                        href={`/dashboard/recruiter/jobs/${a.jobId}?tab=applicants`}
                        className="text-xs text-muted-foreground hover:underline truncate block"
                      >
                        {a.jobTitle} · {formatDate(a.appliedAt)}
                      </Link>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {a.matchPercentage != null ? (
                        <span className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                          {Math.round(a.matchPercentage)}%
                        </span>
                      ) : null}
                      <Badge variant="outline" className={APPLICATION_STATUS_STYLES[a.status]}>
                        {a.statusLabel}
                      </Badge>
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

  // ----- Seeker overview -----
  const { stats, recentResumes, topMatches } = overview;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Your <span className="text-gradient">overview</span></h1>
          <p className="text-sm text-muted-foreground">
            Your resumes and best matches at a glance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/seeker/resumes">Upload resume</Link>
          </Button>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Link href="/dashboard/jobs">
              <Search className="size-4" /> Find jobs <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="stagger grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={FileText} label="My resumes" value={stats.resumeCount} accent="emerald" />
        <StatCard icon={Send} label="Applications" value={stats.applicationCount} accent="teal" />
        <StatCard icon={Target} label="Matches" value={stats.matchCount} accent="teal" />
        <StatCard
          icon={TrendingUp}
          label="Avg match"
          value={`${Math.round(stats.avgMatchPercentage)}%`}
          accent="amber"
        />
      </div>

      <div className="stagger grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
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
                  <li key={r.id} className="py-3 -mx-2 px-2 rounded-lg flex items-center justify-between gap-3 transition-colors hover:bg-muted/50">
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
          <CardHeader className="flex flex-row items-center justify-between">
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
                  <li key={m.id} className="py-3 -mx-2 px-2 rounded-lg flex items-center justify-between gap-3 transition-colors hover:bg-muted/50">
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/jobs/${m.jobPost.id}`}
                        className="text-sm font-medium hover:underline truncate block"
                      >
                        {m.jobPost.title}
                      </Link>
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
