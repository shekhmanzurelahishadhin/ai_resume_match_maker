"use client";

// tailor-dialog.tsx — pick a job to tailor the resume to.
//
// Lists the user's jobs (seekers see all active jobs; recruiters see their own).
// On confirm, calls POST /api/resumes/generate/{id}/tailor with the chosen jobPostId.

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Scissors, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface JobItem {
  id: string;
  title: string;
  recruiter?: { name: string } | null;
}

interface Props {
  resumeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTailored?: () => void;
}

export function TailorDialog({ resumeId, open, onOpenChange, onTailored }: Props) {
  const qc = useQueryClient();
  const [jobId, setJobId] = useState<string>("");

  const q = useQuery({
    queryKey: ["jobs", "for-tailor"],
    queryFn: async () => {
      const res = await fetch("/api/jobs?pageSize=100");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Failed to load jobs");
      return (json.data?.items ?? []) as JobItem[];
    },
    enabled: open,
  });

  const tailorMut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/resumes/generate/${resumeId}/tailor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobPostId: jobId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Tailor failed");
      return json.data;
    },
    onSuccess: (data) => {
      const matched = (data.matchedSkillsReordered as string[]) ?? [];
      toast.success(
        `Tailored to "${data.job.title}". ${matched.length} skill(s) reordered to top.`,
      );
      qc.invalidateQueries({ queryKey: ["generated", resumeId] });
      qc.invalidateQueries({ queryKey: ["generated", resumeId, "versions"] });
      onOpenChange(false);
      setJobId("");
      onTailored?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="size-4" /> Tailor to a job
          </DialogTitle>
          <DialogDescription>
            Reorders your skills to put the job&apos;s required skills first,
            and rewrites your summary to reference the job title. Creates a new
            version so you can roll back.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label className="text-xs">Job</Label>
          {q.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading jobs…
            </div>
          ) : q.isError ? (
            <p className="text-sm text-rose-600">{(q.error as Error)?.message}</p>
          ) : q.data && q.data.length > 0 ? (
            <Select value={jobId} onValueChange={setJobId}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a job…" />
              </SelectTrigger>
              <SelectContent>
                {q.data.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.title}
                    {j.recruiter?.name ? ` — ${j.recruiter.name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No jobs available yet. Try again later.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!jobId || tailorMut.isPending}
            onClick={() => tailorMut.mutate()}
            className="gap-1.5"
          >
            {tailorMut.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Tailor resume
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
