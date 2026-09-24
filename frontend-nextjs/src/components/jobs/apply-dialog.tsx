"use client";

// apply-dialog.tsx — pick which resume to send (an upload or a builder
// resume), add an optional cover letter, and apply.

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Send, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiErrorMessage, type Application } from "@/lib/jobs";

interface ResumeOption {
  key: string;
  kind: "upload" | "builder";
  id: string;
  name: string;
  detail: string;
}

async function loadResumeOptions(): Promise<ResumeOption[]> {
  const [uploads, built] = await Promise.all([
    fetch("/api/resumes?pageSize=100").then((r) => r.json()),
    fetch("/api/resumes/generate?pageSize=100").then((r) => r.json()),
  ]);
  const up = ((uploads?.data?.items ?? []) as Array<{ id: string; fileName: string; status: string; createdAt: string }>)
    .filter((r) => r.status === "ready")
    .map((r) => ({
      key: `upload:${r.id}`,
      kind: "upload" as const,
      id: r.id,
      name: r.fileName,
      detail: `Uploaded ${new Date(r.createdAt).toLocaleDateString()}`,
    }));
  const gen = ((built?.data?.items ?? []) as Array<{
    id: string;
    contentJson?: { contact?: { name?: string } } | null;
    template?: { name?: string };
    updatedAt?: string;
  }>).map((r) => ({
    key: `builder:${r.id}`,
    kind: "builder" as const,
    id: r.id,
    name: r.contentJson?.contact?.name?.trim() || "Untitled resume",
    detail: `Resume Builder · ${r.template?.name ?? "template"}`,
  }));
  return [...up, ...gen];
}

export function ApplyDialog({
  jobId,
  jobTitle,
  preferredResumeId,
  open,
  onOpenChange,
  onApplied,
}: {
  jobId: string;
  jobTitle: string;
  /** Pre-select the resume that produced the best match. */
  preferredResumeId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplied?: (application: Application) => void;
}) {
  const qc = useQueryClient();
  const [picked, setPicked] = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState("");

  const options = useQuery({
    queryKey: ["apply-resume-options"],
    queryFn: loadResumeOptions,
    enabled: open,
  });

  const fallback =
    options.data?.find((o) => o.kind === "upload" && o.id === preferredResumeId)?.key ??
    options.data?.[0]?.key ??
    null;
  const selectedKey = picked ?? fallback;
  const selected = options.data?.find((o) => o.key === selectedKey) ?? null;

  const apply = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Choose a resume to send.");
      const res = await fetch(`/api/jobs/${jobId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(selected.kind === "upload" ? { resumeId: selected.id } : { generatedResumeId: selected.id }),
          coverLetter: coverLetter.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(json, "Could not apply"));
      return json.data.application as Application;
    },
    onSuccess: (app) => {
      toast.success("Application sent! The recruiter has been notified.");
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["job", jobId] });
      qc.invalidateQueries({ queryKey: ["applications"] });
      setCoverLetter("");
      onOpenChange(false);
      onApplied?.(app);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Apply for {jobTitle}</DialogTitle>
          <DialogDescription>
            The recruiter will see the resume you choose, your cover letter, and your email address.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Resume to send</Label>
            {options.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="size-4 animate-spin" /> Loading your resumes…
              </div>
            ) : options.data && options.data.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1" role="radiogroup">
                {options.data.map((o) => {
                  const active = o.key === selectedKey;
                  const Icon = o.kind === "upload" ? FileText : Wand2;
                  return (
                    <button
                      key={o.key}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setPicked(o.key)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-lg border-2 px-3 py-2.5 text-left transition-colors",
                        active
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                          : "border-border hover:border-emerald-300",
                      )}
                    >
                      <Icon className="size-4 shrink-0 text-emerald-600" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium truncate">{o.name}</span>
                        <span className="block text-xs text-muted-foreground">{o.detail}</span>
                      </span>
                      {o.kind === "upload" && o.id === preferredResumeId ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                          Best match
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                You don&apos;t have a resume yet.{" "}
                <Link href="/dashboard/seeker/resumes" className="text-emerald-600 hover:underline">
                  Upload one
                </Link>{" "}
                or{" "}
                <Link href="/dashboard/resumes/generate" className="text-emerald-600 hover:underline">
                  build one
                </Link>
                .
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cover-letter">Cover letter (optional)</Label>
            <Textarea
              id="cover-letter"
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              rows={5}
              maxLength={5000}
              placeholder="Why are you a great fit for this role?"
            />
            <p className="text-xs text-muted-foreground text-right">{coverLetter.length}/5000</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => apply.mutate()}
            disabled={!selected || apply.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {apply.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Submit application
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
