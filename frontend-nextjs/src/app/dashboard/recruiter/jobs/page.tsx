"use client";

// Recruiter → My jobs. Search / filter the recruiter's postings; each card
// shows its candidate and applicant counts with quick links.

import { useEffect, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Briefcase, Inbox, Loader2, Plus, Search, Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/empty-state";
import { JobMeta } from "@/components/jobs/job-meta";
import { timeAgo, type JobListing } from "@/lib/jobs";
import type { Paginated } from "@/lib/server-api";

export default function RecruiterJobsPage() {
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const params = new URLSearchParams({ pageSize: "100" });
  if (status !== "all") params.set("status", status);
  if (q) params.set("q", q);

  const jobs = useQuery({
    queryKey: ["recruiter-jobs", params.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/jobs?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Failed to load jobs");
      return json.data as Paginated<JobListing>;
    },
    placeholderData: keepPreviousData,
  });

  const items = jobs.data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My jobs</h1>
          <p className="text-sm text-muted-foreground">
            Every new job is matched against all analyzed resumes automatically.
          </p>
        </div>
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Link href="/dashboard/recruiter/jobs/new">
            <Plus className="size-4" /> Post a job
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={status} onValueChange={setStatus}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Open</TabsTrigger>
            <TabsTrigger value="closed">Closed</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your jobs"
            className="pl-8"
            aria-label="Search jobs"
          />
        </div>
        {jobs.isFetching && !jobs.isLoading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
      </div>

      {jobs.isLoading ? (
        <div className="stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={q || status !== "all" ? "No jobs match" : "No jobs posted yet"}
          description={
            q || status !== "all"
              ? "Try another search or filter."
              : "Post your first job — matching candidates will appear within moments."
          }
        />
      ) : (
        <div className="stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((j) => (
            <Card key={j.id} className="card-hover flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/dashboard/recruiter/jobs/${j.id}`} className="font-semibold leading-snug hover:underline">
                    {j.title}
                  </Link>
                  <Badge
                    variant="outline"
                    className={
                      j.isActive
                        ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200 shrink-0"
                        : "bg-muted text-muted-foreground shrink-0"
                    }
                  >
                    {j.isActive ? "Open" : "Closed"}
                  </Badge>
                </div>
                <JobMeta job={j} showCompany={false} showSalary={false} />
                <p className="text-xs text-muted-foreground">Posted {timeAgo(j.createdAt)}</p>

                <div className="mt-auto grid grid-cols-2 gap-2">
                  <Link
                    href={`/dashboard/recruiter/jobs/${j.id}?tab=candidates`}
                    className="rounded-lg border p-2.5 transition-colors hover:border-emerald-300"
                  >
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Sparkles className="size-3" /> Matched
                    </p>
                    <p className="text-lg font-bold tabular-nums">{j.matchCount ?? 0}</p>
                  </Link>
                  <Link
                    href={`/dashboard/recruiter/jobs/${j.id}?tab=applicants`}
                    className="rounded-lg border p-2.5 transition-colors hover:border-emerald-300"
                  >
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Inbox className="size-3" /> Applicants
                    </p>
                    <p className="text-lg font-bold tabular-nums">
                      {j.applicationCount ?? 0}
                      {(j.newApplicationCount ?? 0) > 0 ? (
                        <span className="ml-1.5 align-middle rounded-full bg-emerald-600 px-1.5 text-[10px] font-semibold text-white">
                          {j.newApplicationCount} new
                        </span>
                      ) : null}
                    </p>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
