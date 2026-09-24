"use client";

// Seeker → My applications. Every job applied to, with its pipeline status.

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FileText, MessageSquare, Send } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/empty-state";
import {
  APPLICATION_STATUS_STYLES,
  pctColor,
  timeAgo,
  type Application,
  type ApplicationStatus,
} from "@/lib/jobs";

const GROUPS: Record<string, { label: string; statuses: ApplicationStatus[] | null }> = {
  all: { label: "All", statuses: null },
  active: { label: "In progress", statuses: ["applied", "reviewing", "shortlisted", "interview", "offered"] },
  closed: { label: "Closed", statuses: ["hired", "rejected", "withdrawn"] },
};

export default function SeekerApplicationsPage() {
  const [group, setGroup] = useState("all");

  const apps = useQuery({
    queryKey: ["applications", "mine"],
    queryFn: async () => {
      const res = await fetch("/api/applications?pageSize=100");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Failed to load applications");
      return json.data.items as Application[];
    },
  });

  const statuses = GROUPS[group].statuses;
  const rows = (apps.data ?? []).filter((a) => !statuses || statuses.includes(a.status));
  const counts = Object.fromEntries(
    Object.entries(GROUPS).map(([k, g]) => [
      k,
      (apps.data ?? []).filter((a) => !g.statuses || g.statuses.includes(a.status)).length,
    ]),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My applications</h1>
          <p className="text-sm text-muted-foreground">Track where each application stands.</p>
        </div>
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Link href="/dashboard/jobs">Find more jobs</Link>
        </Button>
      </div>

      <Tabs value={group} onValueChange={setGroup}>
        <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
          {Object.entries(GROUPS).map(([k, g]) => (
            <TabsTrigger key={k} value={k}>
              {g.label} <span className="ml-1 text-muted-foreground tabular-nums">({counts[k]})</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {apps.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Send}
          title={apps.data?.length ? "Nothing in this group" : "No applications yet"}
          description="Browse open jobs and apply with one of your resumes."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {a.job ? (
                      <Link href={`/dashboard/jobs/${a.job.id}`} className="font-semibold hover:underline">
                        {a.job.title}
                      </Link>
                    ) : (
                      <span className="font-semibold">Removed job</span>
                    )}
                    <Badge variant="outline" className={APPLICATION_STATUS_STYLES[a.status]}>
                      {a.statusLabel}
                    </Badge>
                    {a.job && !a.job.isActive ? (
                      <Badge variant="outline" className="bg-muted text-muted-foreground">Job closed</Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {[a.job?.company, a.job?.location].filter(Boolean).join(" · ")}
                  </p>
                  <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>Applied {timeAgo(a.appliedAt)}</span>
                    {a.statusChangedAt && a.status !== "applied" ? <span>Updated {timeAgo(a.statusChangedAt)}</span> : null}
                    {a.resume.name ? (
                      <span className="inline-flex items-center gap-1">
                        <FileText className="size-3" /> {a.resume.name}
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:shrink-0">
                  {a.matchPercentage != null ? (
                    <div className="text-right">
                      <p className={`text-lg font-bold tabular-nums leading-none ${pctColor(a.matchPercentage)}`}>
                        {Math.round(a.matchPercentage)}%
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">match</p>
                    </div>
                  ) : null}
                  {a.conversationId ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/dashboard/messages?c=${a.conversationId}`}>
                        <MessageSquare className="size-4" /> Messages
                      </Link>
                    </Button>
                  ) : null}
                  {a.job ? (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/dashboard/jobs/${a.job.id}`}>View job</Link>
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
