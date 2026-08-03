// Dashboard overview — stat cards + recent activity, role-aware.

import Link from "next/link";
import { getServerSession } from "next-auth";
import {
  FileText,
  Target,
  Briefcase,
  Users,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AiSourceBadge } from "@/components/ai-source-badge";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) return null;

  const isRecruiter = user.role === "recruiter";

  if (isRecruiter) {
    const [jobs, totalCandidates, topMatchAgg] = await Promise.all([
      db.jobPost.findMany({
        where: { recruiterId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { _count: { select: { matches: true } } },
      }),
      db.match.count({
        where: { recruiterId: user.id },
      }),
      db.match.aggregate({
        where: { recruiterId: user.id },
        _max: { matchPercentage: true },
      }),
    ]);

    const topMatchPct = topMatchAgg._max.matchPercentage ?? 0;
    const activeJobs = await db.jobPost.count({
      where: { recruiterId: user.id, isActive: true },
    });

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
          <StatCard icon={Briefcase} label="Total jobs" value={jobs.length} accent="emerald" />
          <StatCard icon={Briefcase} label="Active jobs" value={activeJobs} accent="teal" />
          <StatCard icon={Users} label="Candidates" value={totalCandidates} accent="amber" />
          <StatCard
            icon={TrendingUp}
            label="Top match"
            value={`${Math.round(topMatchPct)}%`}
            accent="emerald"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent jobs</CardTitle>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <EmptyState
                icon={Briefcase}
                title="No jobs posted yet"
                description="Create your first job to start matching against candidate resumes."
                actionLabel="Post a job"
                onAction={undefined}
              />
            ) : (
              <ul className="divide-y">
                {jobs.map((job) => (
                  <li key={job.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/recruiter/jobs/${job.id}`}
                        className="text-sm font-medium hover:underline truncate block"
                      >
                        {job.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {job._count.matches} candidates ·{" "}
                        {job.isActive ? "Active" : "Closed"} ·{" "}
                        {new Date(job.createdAt).toLocaleDateString()}
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
  const [resumes, matches, avgAgg] = await Promise.all([
    db.resume.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { _count: { select: { matches: true } } },
    }),
    db.match.findMany({
      where: { resume: { userId: user.id } },
      orderBy: { matchPercentage: "desc" },
      take: 5,
      include: { jobPost: { select: { id: true, title: true, recruiter: { select: { name: true } } } } },
    }),
    db.match.aggregate({
      where: { resume: { userId: user.id } },
      _avg: { matchPercentage: true },
    }),
  ]);

  const avgMatchPct = avgAgg._avg.matchPercentage ?? 0;
  const totalMatches = await db.match.count({
    where: { resume: { userId: user.id } },
  });

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
        <StatCard icon={FileText} label="My resumes" value={resumes.length} accent="emerald" />
        <StatCard icon={Target} label="Matches" value={totalMatches} accent="teal" />
        <StatCard
          icon={TrendingUp}
          label="Avg match"
          value={`${Math.round(avgMatchPct)}%`}
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
            {resumes.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No resumes yet"
                description="Upload your first PDF resume to start matching against jobs."
              />
            ) : (
              <ul className="divide-y">
                {resumes.map((r) => (
                  <li key={r.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/seeker/resumes/${r.id}`}
                        className="text-sm font-medium hover:underline truncate block"
                      >
                        {r.fileName}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {r._count.matches} matches · {r.status} ·{" "}
                        {new Date(r.createdAt).toLocaleDateString()}
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
            {matches.length === 0 ? (
              <EmptyState
                icon={Target}
                title="No matches yet"
                description="Once your resume is parsed and recruiters post jobs, your top matches will appear here."
              />
            ) : (
              <ul className="divide-y">
                {matches.map((m) => (
                  <li key={m.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {m.jobPost.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {m.jobPost.recruiter?.name} ·{" "}
                        {new Date(m.analyzedAt).toLocaleDateString()}
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
