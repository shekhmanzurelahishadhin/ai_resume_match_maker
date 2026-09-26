"use client";

import Link from "next/link";
import { FileText, Trash2, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ResumeStatusWatcher } from "@/components/resume-status-watcher";

export interface ResumeCardData {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  experienceYears: number | null;
  status: "pending" | "parsing" | "ready" | "failed";
  parseError: string | null;
  createdAt: string;
  matchCount?: number;
}

const statusMeta: Record<
  ResumeCardData["status"],
  { label: string; className: string; icon?: "loader" | "alert" }
> = {
  pending: {
    label: "Pending",
    className: "bg-muted text-muted-foreground",
    icon: "loader",
  },
  parsing: {
    label: "Parsing",
    className: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
    icon: "loader",
  },
  ready: {
    label: "Ready",
    className: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  },
  failed: {
    label: "Failed",
    className: "bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-200",
    icon: "alert",
  },
};

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export function ResumeCard({ resume }: { resume: ResumeCardData }) {
  const router = useRouter();
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const meta = statusMeta[resume.status];

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/resumes/${resume.id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j?.error?.message ?? "Delete failed");
      }
      toast({ title: "Resume deleted" });
      router.refresh();
    } catch (e) {
      toast({
        title: "Delete failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleReanalyze = async () => {
    setReanalyzing(true);
    try {
      const res = await fetch(`/api/resumes/${resume.id}/analyze`, { method: "POST" });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j?.error?.message ?? "Re-analyze failed");
      }
      toast({ title: "Re-analysis started", description: "Check back in a few seconds." });
      router.refresh();
    } catch (e) {
      toast({
        title: "Re-analyze failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setReanalyzing(false);
    }
  };

  return (
    <Card className="card-hover overflow-hidden">
      <ResumeStatusWatcher resumeId={resume.id} status={resume.status} />
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="rounded-md bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 shrink-0">
              <FileText className="size-5" />
            </div>
            <div className="min-w-0">
              <Link
                href={`/dashboard/seeker/resumes/${resume.id}`}
                className="text-sm font-semibold hover:underline truncate block"
              >
                {resume.fileName}
              </Link>
              <p className="text-xs text-muted-foreground">
                {formatBytes(resume.fileSizeBytes)} ·{" "}
                {new Date(resume.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={cn("gap-1", meta.className)}>
            {meta.icon === "loader" ? (
              <Loader2 className="size-3 animate-spin" />
            ) : meta.icon === "alert" ? (
              <AlertCircle className="size-3" />
            ) : null}
            {meta.label}
          </Badge>
        </div>

        {resume.status === "failed" && resume.parseError ? (
          <p className="text-xs text-rose-700 dark:text-rose-300 line-clamp-2">
            {resume.parseError}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md bg-muted/50 p-2">
            <p className="text-muted-foreground">Experience</p>
            <p className="font-semibold">
              {resume.experienceYears != null
                ? `${resume.experienceYears} yr${resume.experienceYears === 1 ? "" : "s"}`
                : "—"}
            </p>
          </div>
          <div className="rounded-md bg-muted/50 p-2">
            <p className="text-muted-foreground">Matches</p>
            <p className="font-semibold">{resume.matchCount ?? 0}</p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="gap-2 border-t pt-4">
        <Button asChild variant="outline" size="sm" className="flex-1">
          <Link href={`/dashboard/seeker/resumes/${resume.id}`}>View details</Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={handleReanalyze}
          disabled={reanalyzing || resume.status === "parsing"}
          title="Re-analyze"
        >
          <RefreshCw className={cn("size-4", reanalyzing && "animate-spin")} />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20"
              disabled={deleting}
              title="Delete"
            >
              <Trash2 className="size-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this resume?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes the file and all its matches. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
