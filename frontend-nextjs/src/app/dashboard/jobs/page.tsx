"use client";

// Seeker → Find jobs. Search and filter every active job; each card shows the
// seeker's match score and whether they have already applied.

import { useEffect, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2, Search, SearchX } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SkillBadge } from "@/components/skill-badge";
import { EmptyState } from "@/components/empty-state";
import { JobMeta } from "@/components/jobs/job-meta";
import {
  APPLICATION_STATUS_STYLES,
  EMPLOYMENT_TYPE_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  WORK_MODE_LABELS,
  pctColor,
  timeAgo,
  type JobListing,
} from "@/lib/jobs";
import type { Paginated } from "@/lib/server-api";

const PAGE_SIZE = 12;
const ANY = "any";

function useDebounced<T>(value: T, ms = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function FindJobsPage() {
  const [search, setSearch] = useState("");
  const [workMode, setWorkMode] = useState(ANY);
  const [employmentType, setEmploymentType] = useState(ANY);
  const [level, setLevel] = useState(ANY);
  const [sort, setSort] = useState<"newest" | "match">("match");
  const [page, setPage] = useState(1);
  const q = useDebounced(search.trim());

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), sort });
  if (q) params.set("q", q);
  if (workMode !== ANY) params.set("workMode", workMode);
  if (employmentType !== ANY) params.set("employmentType", employmentType);
  if (level !== ANY) params.set("experienceLevel", level);
  const qs = params.toString();

  const jobs = useQuery({
    queryKey: ["jobs", qs],
    queryFn: async () => {
      const res = await fetch(`/api/jobs?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Failed to load jobs");
      return json.data as Paginated<JobListing>;
    },
    placeholderData: keepPreviousData,
  });

  // Any filter change starts again from the first page.
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  const filtersActive = q || workMode !== ANY || employmentType !== ANY || level !== ANY;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Find jobs</h1>
        <p className="text-sm text-muted-foreground">
          {jobs.data ? `${jobs.data.total} open positions. ` : ""}
          Your match score is based on your analyzed resumes.
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-3 py-4 sm:grid-cols-2 lg:grid-cols-[1fr_repeat(4,minmax(0,160px))]">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => reset(setSearch)(e.target.value)}
              placeholder="Title, company, location or skill"
              className="pl-8"
              aria-label="Search jobs"
            />
          </div>
          <FilterSelect label="Work mode" value={workMode} onChange={reset(setWorkMode)} options={WORK_MODE_LABELS} />
          <FilterSelect label="Job type" value={employmentType} onChange={reset(setEmploymentType)} options={EMPLOYMENT_TYPE_LABELS} />
          <FilterSelect label="Level" value={level} onChange={reset(setLevel)} options={EXPERIENCE_LEVEL_LABELS} />
          <Select value={sort} onValueChange={(v) => reset(setSort)(v as "newest" | "match")}>
            <SelectTrigger aria-label="Sort" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="match">Best match first</SelectItem>
              <SelectItem value="newest">Newest first</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {jobs.isLoading ? (
        <div className="stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : jobs.isError ? (
        <EmptyState icon={SearchX} title="Couldn't load jobs" description={(jobs.error as Error).message} />
      ) : jobs.data && jobs.data.items.length > 0 ? (
        <>
          <div className="stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {jobs.data.items.map((job) => (
              <JobListingCard key={job.id} job={job} />
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Page {jobs.data.page} of {jobs.data.totalPages}
              {jobs.isFetching ? <Loader2 className="inline size-3 ml-2 animate-spin" /> : null}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="size-4" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= jobs.data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          icon={SearchX}
          title="No jobs found"
          description={filtersActive ? "Try a different search or clear some filters." : "No open positions right now — check back soon."}
        />
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Record<string, string>;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>Any {label.toLowerCase()}</SelectItem>
        {Object.entries(options).map(([k, v]) => (
          <SelectItem key={k} value={k}>
            {v}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function JobListingCard({ job }: { job: JobListing }) {
  const pct = job.myMatch?.matchPercentage;
  return (
    <Card className="card-hover flex flex-col">
      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/dashboard/jobs/${job.id}`} className="font-semibold leading-snug hover:underline">
              {job.title}
            </Link>
            <p className="text-sm text-muted-foreground truncate">{job.company}</p>
          </div>
          {pct != null ? (
            <div className="text-right shrink-0">
              <p className={`text-xl font-bold tabular-nums leading-none ${pctColor(pct)}`}>{Math.round(pct)}%</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">match</p>
            </div>
          ) : null}
        </div>

        <JobMeta job={job} showCompany={false} />

        <p className="text-sm text-muted-foreground line-clamp-2 [overflow-wrap:anywhere]">{job.description}</p>

        <div className="flex flex-wrap gap-1.5">
          {job.requiredSkills.slice(0, 5).map((s) => (
            <SkillBadge key={s} skill={s} variant="muted" />
          ))}
          {job.requiredSkills.length > 5 ? (
            <Badge variant="outline" className="bg-muted text-muted-foreground">
              +{job.requiredSkills.length - 5}
            </Badge>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
          <span className="text-xs text-muted-foreground">Posted {timeAgo(job.createdAt)}</span>
          {job.myApplication && job.myApplication.status !== "withdrawn" ? (
            <Badge variant="outline" className={APPLICATION_STATUS_STYLES[job.myApplication.status]}>
              {job.myApplication.statusLabel}
            </Badge>
          ) : (
            <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Link href={`/dashboard/jobs/${job.id}`}>View & apply</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
