"use client";

// Job details for seekers: the full description, how their resume matches,
// and apply / withdraw.

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Loader2, Send, Undo2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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
import { JobMeta } from "@/components/jobs/job-meta";
import { ApplyDialog } from "@/components/jobs/apply-dialog";
import { APPLICATION_STATUS_STYLES, pctColor, timeAgo, type JobListing } from "@/lib/jobs";

export default function JobDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [applyOpen, setApplyOpen] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);

  const job = useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      const res = await fetch(`/api/jobs/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Job not found");
      return json.data.job as JobListing;
    },
  });

  const withdraw = useMutation({
    mutationFn: async (applicationId: string) => {
      const res = await fetch(`/api/applications/${applicationId}/withdraw`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Could not withdraw");
    },
    onSuccess: () => {
      toast.success("Application withdrawn.");
      qc.invalidateQueries({ queryKey: ["job", id] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (job.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (job.isError || !job.data) {
    return (
      <EmptyState
        icon={XCircle}
        title="Job not available"
        description="This job may have been closed or removed."
      />
    );
  }

  const j = job.data;
  const app = j.myApplication && j.myApplication.status !== "withdrawn" ? j.myApplication : null;
  const match = j.myMatch;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/dashboard/jobs">
          <ArrowLeft className="size-4" /> All jobs
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6 min-w-0">
          <Card>
            <CardContent className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{j.title}</h1>
                <p className="text-muted-foreground">{j.company}</p>
              </div>
              <JobMeta job={j} showCompany={false} className="text-sm" />
              <p className="text-xs text-muted-foreground">Posted {timeAgo(j.createdAt)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">About the role</CardTitle>
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
                {j.requiredSkills.map((s) => {
                  const has = match?.matchedSkills?.includes(s);
                  const missing = match?.missingSkills?.includes(s);
                  return (
                    <SkillBadge key={s} skill={s} variant={has ? "matched" : missing ? "missing" : "muted"} />
                  );
                })}
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Sticky action column */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardContent className="space-y-3">
              {app ? (
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-5 text-emerald-600" />
                    <p className="font-semibold">You applied {timeAgo(app.appliedAt)}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant="outline" className={APPLICATION_STATUS_STYLES[app.status]}>
                      {app.statusLabel}
                    </Badge>
                  </div>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/dashboard/seeker/applications">View my applications</Link>
                  </Button>
                  {app.status !== "hired" ? (
                    <Button
                      variant="ghost"
                      className="w-full text-rose-600 hover:text-rose-700"
                      disabled={withdraw.isPending}
                      onClick={() => setConfirmWithdraw(true)}
                    >
                      {withdraw.isPending ? <Loader2 className="size-4 animate-spin" /> : <Undo2 className="size-4" />}
                      Withdraw application
                    </Button>
                  ) : null}
                </>
              ) : j.isActive ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Interested? Send your resume straight to the recruiter.
                  </p>
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => setApplyOpen(true)}
                  >
                    <Send className="size-4" /> Apply now
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">This job is no longer accepting applications.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your match</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {match ? (
                <>
                  <div className="flex items-end justify-between">
                    <p className={`text-3xl font-bold tabular-nums ${pctColor(match.matchPercentage)}`}>
                      {Math.round(match.matchPercentage)}%
                    </p>
                    <p className="text-xs text-muted-foreground truncate max-w-[150px]" title={match.resumeName}>
                      {match.resumeName}
                    </p>
                  </div>
                  <Progress value={match.matchPercentage} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {match.matchedSkills?.length ?? 0} of {j.requiredSkills.length} required skills found in your resume.
                  </p>
                  {match.missingSkills && match.missingSkills.length > 0 ? (
                    <div>
                      <p className="text-xs font-medium text-rose-700 dark:text-rose-300 mb-1">Skills to highlight or learn</p>
                      <div className="flex flex-wrap gap-1">
                        {match.missingSkills.map((s) => (
                          <SkillBadge key={s} skill={s} variant="missing" />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No score yet.{" "}
                  <Link href="/dashboard/seeker/resumes" className="text-emerald-600 hover:underline">
                    Upload a resume
                  </Link>{" "}
                  to see how well you fit.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ApplyDialog
        jobId={j.id}
        jobTitle={j.title}
        preferredResumeId={match?.resumeId}
        open={applyOpen}
        onOpenChange={setApplyOpen}
      />

      <AlertDialog open={confirmWithdraw} onOpenChange={setConfirmWithdraw}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw your application?</AlertDialogTitle>
            <AlertDialogDescription>
              The recruiter will no longer see it in their pipeline. You can apply again later while the job is open.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={() => app && withdraw.mutate(app.id)}
            >
              Withdraw
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
