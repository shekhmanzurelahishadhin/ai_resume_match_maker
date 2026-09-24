"use client";

// applicant-list.tsx — the recruiter's hiring pipeline. Lists applications for
// one job (or all jobs), with status filters, resume download, cover letter,
// contact details, and a status picker per applicant.

import { useEffect, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Download, Inbox, Loader2, Mail, MessageSquare, Search } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { ContactDialog, type ContactTarget } from "@/components/jobs/contact-dialog";
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_STYLES,
  RECRUITER_STATUSES,
  downloadFrom,
  pctColor,
  timeAgo,
  type Application,
  type ApplicationStatus,
} from "@/lib/jobs";

const ALL = "all";

export function ApplicantList({ jobId, showJob = false }: { jobId?: string; showJob?: boolean }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>(ALL);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [contact, setContact] = useState<ContactTarget | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const params = new URLSearchParams({ pageSize: "100" });
  if (jobId) params.set("jobId", jobId);
  if (status !== ALL) params.set("status", status);
  if (q) params.set("q", q);

  const list = useQuery({
    queryKey: ["applications", "recruiter", params.toString()],
    queryFn: async () => {
      const r = await fetch(`/api/applications?${params.toString()}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error?.message ?? "Failed to load applicants");
      return j.data as { items: Application[]; total: number };
    },
    placeholderData: keepPreviousData,
  });

  const move = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: ApplicationStatus }) => {
      const r = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error?.message ?? "Could not update status");
      return j.data.application as Application;
    },
    onSuccess: (app) => {
      toast.success(`${app.candidate?.name ?? "Candidate"} → ${app.statusLabel}. They've been notified.`);
      qc.invalidateQueries({ queryKey: ["applications"] });
      qc.invalidateQueries({ queryKey: ["candidates"] });
      qc.invalidateQueries({ queryKey: ["recruiter-job"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = list.data?.items ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search applicants by name"
            className="pl-8"
            aria-label="Search applicants"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[170px]" aria-label="Status filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All stages</SelectItem>
            {RECRUITER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {APPLICATION_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {list.isFetching && !list.isLoading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
      </div>

      {list.isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="size-5 animate-spin mr-2" /> Loading applicants…
        </div>
      ) : list.isError ? (
        <EmptyState icon={Inbox} title="Couldn't load applicants" description={(list.error as Error).message} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={status !== ALL || q ? "No applicants match these filters" : "No applications yet"}
          description={
            status !== ALL || q
              ? "Try another stage or clear the search."
              : "When seekers apply, they'll show up here. You can also contact matched candidates to invite them."
          }
        />
      ) : (
        <div className="space-y-3">
          {rows.map((a) => (
            <ApplicantCard
              key={a.id}
              app={a}
              showJob={showJob}
              moving={move.isPending && move.variables?.id === a.id}
              onMove={(next) => move.mutate({ id: a.id, next })}
              onContact={() =>
                a.candidate && a.job
                  ? setContact({ seekerId: a.candidate.id, name: a.candidate.name, jobId: a.job.id, jobTitle: a.job.title })
                  : undefined
              }
            />
          ))}
        </div>
      )}

      <ContactDialog
        target={contact}
        onOpenChange={(o) => !o && setContact(null)}
        onSent={() => qc.invalidateQueries({ queryKey: ["applications"] })}
      />
    </div>
  );
}

function ApplicantCard({
  app,
  showJob,
  moving,
  onMove,
  onContact,
}: {
  app: Application;
  showJob: boolean;
  moving: boolean;
  onMove: (s: ApplicationStatus) => void;
  onContact: () => void;
}) {
  const [showLetter, setShowLetter] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      await downloadFrom(`/api/applications/${app.id}/resume`, "resume.pdf");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card className="py-4">
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">{app.candidate?.name}</p>
              <Badge variant="outline" className={APPLICATION_STATUS_STYLES[app.status]}>
                {app.statusLabel}
              </Badge>
            </div>
            {showJob && app.job ? (
              <Link href={`/dashboard/recruiter/jobs/${app.job.id}`} className="text-sm text-emerald-700 dark:text-emerald-300 hover:underline">
                {app.job.title}
              </Link>
            ) : null}
            <p className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
              {app.candidate?.email ? (
                <a href={`mailto:${app.candidate.email}`} className="inline-flex items-center gap-1 hover:underline">
                  <Mail className="size-3" /> {app.candidate.email}
                </a>
              ) : null}
              <span>Applied {timeAgo(app.appliedAt)}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 sm:shrink-0">
            {app.matchPercentage != null ? (
              <div className="text-right">
                <p className={`text-lg font-bold tabular-nums leading-none ${pctColor(app.matchPercentage)}`}>
                  {Math.round(app.matchPercentage)}%
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">match</p>
              </div>
            ) : null}
            <Select value={app.status} onValueChange={(v) => onMove(v as ApplicationStatus)} disabled={moving}>
              <SelectTrigger className="w-[150px]" aria-label="Move to stage">
                {moving ? <Loader2 className="size-4 animate-spin" /> : <SelectValue />}
              </SelectTrigger>
              <SelectContent>
                {RECRUITER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {APPLICATION_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={download} disabled={downloading || !app.resume.available}>
            {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {app.resume.available ? "Resume" : "Resume removed"}
          </Button>
          {app.conversationId ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/dashboard/messages?c=${app.conversationId}`}>
                <MessageSquare className="size-4" /> Chat
              </Link>
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={onContact}>
              <MessageSquare className="size-4" /> Message
            </Button>
          )}
          {app.coverLetter ? (
            <Button size="sm" variant="ghost" onClick={() => setShowLetter((v) => !v)}>
              Cover letter
              <ChevronDown className={cn("size-4 transition-transform", showLetter && "rotate-180")} />
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">No cover letter</span>
          )}
          {app.resume.name ? (
            <span className="text-xs text-muted-foreground truncate max-w-[220px]" title={app.resume.name}>
              {app.resume.name}
            </span>
          ) : null}
        </div>

        {showLetter && app.coverLetter ? (
          <p className="rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">{app.coverLetter}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
