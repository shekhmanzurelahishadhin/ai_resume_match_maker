"use client";

// Recruiter → Job workspace. Stats, the matched-candidate list, the applicant
// pipeline, and the posting itself, with close/reopen, edit and delete.

import { Suspense, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Inbox, Loader2, Pencil, Power, Sparkles, Trash2, Users, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SkillBadge } from "@/components/skill-badge";
import { EmptyState } from "@/components/empty-state";
import { CandidateList } from "@/components/candidate-list";
import { ApplicantList } from "@/components/jobs/applicant-list";
import { JobMeta } from "@/components/jobs/job-meta";
import { timeAgo, type JobListing } from "@/lib/jobs";

const TABS = ["candidates", "applicants", "details"] as const;

export default function RecruiterJobPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <RecruiterJob />
    </Suspense>
  );
}

function RecruiterJob() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const search = useSearchParams();
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const requested = search.get("tab");
  const tab = TABS.includes(requested as (typeof TABS)[number]) ? (requested as string) : "candidates";
  const setTab = (t: string) => router.replace(`/dashboard/recruiter/jobs/${id}?tab=${t}`, { scroll: false });

  const job = useQuery({
    queryKey: ["recruiter-job", id],
    queryFn: async () => {
      const res = await fetch(`/api/jobs/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Job not found");
      return json.data.job as JobListing;
    },
  });

  const toggle = useMutation({
    mutationFn: async (isActive: boolean) => {
      const res = await fetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Update failed");
      return json.data.job as JobListing;
    },
    onSuccess: (j) => {
      toast.success(j.isActive ? "Job reopened — seekers can apply again." : "Job closed to new applications.");
      qc.invalidateQueries({ queryKey: ["recruiter-job", id] });
      qc.invalidateQueries({ queryKey: ["recruiter-jobs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Delete failed");
    },
    onSuccess: () => {
      toast.success("Job deleted.");
      qc.invalidateQueries({ queryKey: ["recruiter-jobs"] });
      router.push("/dashboard/recruiter/jobs");
      router.refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (job.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }
  if (job.isError || !job.data) {
    return <EmptyState icon={XCircle} title="Job not found" description="It may have been deleted." />;
  }

  const j = job.data;

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/dashboard/recruiter/jobs">
            <ArrowLeft className="size-4" /> My jobs
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{j.title}</h1>
              <Badge
                variant="outline"
                className={
                  j.isActive
                    ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200"
                    : "bg-muted text-muted-foreground"
                }
              >
                {j.isActive ? "Open" : "Closed"}
              </Badge>
            </div>
            <JobMeta job={j} />
            <p className="text-xs text-muted-foreground">Posted {timeAgo(j.createdAt)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" disabled={toggle.isPending} onClick={() => toggle.mutate(!j.isActive)}>
              {toggle.isPending ? <Loader2 className="size-4 animate-spin" /> : <Power className="size-4" />}
              {j.isActive ? "Close job" : "Reopen job"}
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/dashboard/recruiter/jobs/${j.id}/edit`}>
                <Pencil className="size-4" /> Edit
              </Link>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-rose-600 hover:text-rose-700"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-4" /> Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat icon={Sparkles} label="Matched candidates" value={j.matchCount ?? 0} onClick={() => setTab("candidates")} />
        <Stat icon={Inbox} label="Applications" value={j.applicationCount ?? 0} onClick={() => setTab("applicants")} />
        <Stat
          icon={Users}
          label="New, not reviewed"
          value={j.newApplicationCount ?? 0}
          highlight={(j.newApplicationCount ?? 0) > 0}
          onClick={() => setTab("applicants")}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="candidates">Matched candidates</TabsTrigger>
          <TabsTrigger value="applicants">
            Applicants
            {(j.newApplicationCount ?? 0) > 0 ? (
              <span className="ml-1.5 rounded-full bg-emerald-600 px-1.5 text-[10px] font-semibold text-white">
                {j.newApplicationCount}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="details">Job post</TabsTrigger>
        </TabsList>

        <TabsContent value="candidates" className="mt-4">
          <CandidateList jobId={j.id} jobTitle={j.title} />
        </TabsContent>
        <TabsContent value="applicants" className="mt-4">
          <ApplicantList jobId={j.id} />
        </TabsContent>
        <TabsContent value="details" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">{j.description}</p>
            </CardContent>
          </Card>
          {j.requiredSkills.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Required skills</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {j.requiredSkills.map((s) => (
                  <SkillBadge key={s} skill={s} variant="muted" />
                ))}
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this job?</AlertDialogTitle>
            <AlertDialogDescription>
              Its matches and applications are removed too. If you only want to stop new applications, close the job
              instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700 text-white" onClick={() => remove.mutate()}>
              Delete job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  highlight,
  onClick,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  highlight?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border bg-card p-4 text-left transition-colors hover:border-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
    >
      <Icon className={`size-4 ${highlight ? "text-emerald-600" : "text-muted-foreground"}`} />
      <p className={`mt-2 text-2xl font-bold tabular-nums ${highlight ? "text-emerald-600" : ""}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </button>
  );
}
