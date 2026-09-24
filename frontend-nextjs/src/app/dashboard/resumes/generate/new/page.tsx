"use client";

// New generated resume page: pick a template + optional source resume, then POST.
//
// Reads `?templateId=` from the URL to pre-select a template.
// Reads `?originalResumeId=` to pre-select a source resume.

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TemplatePicker } from "@/components/resume-builder/template-picker";

interface ResumeListItem {
  id: string;
  fileName: string;
  status: string;
  experienceYears: number | null;
}

function NewResumePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [templateId, setTemplateId] = useState<string | null>(
    searchParams.get("templateId"),
  );
  const [originalResumeId, setOriginalResumeId] = useState<string>(
    searchParams.get("originalResumeId") ?? "",
  );

  // Load the user's uploaded resumes so they can pick a source.
  const resumesQ = useQuery({
    queryKey: ["resumes", "list", "for-builder"],
    queryFn: async () => {
      const res = await fetch("/api/resumes?pageSize=100");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Failed to load resumes");
      return (json.data?.items ?? []) as ResumeListItem[];
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { templateId };
      if (originalResumeId) body.originalResumeId = originalResumeId;
      const res = await fetch("/api/resumes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message ?? "Failed to create resume");
      }
      return json.data as { resume: { id: string } };
    },
    onSuccess: (data) => {
      toast.success("Resume created. Start editing!");
      router.push(`/dashboard/resumes/generate/${data.resume.id}`);
      // Drop the cached Resume Builder list so the new resume is there when
      // the user navigates back to it.
      router.refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/dashboard/resumes/generate">
            <ArrowLeft className="size-4" /> Back to Resume Builder
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="size-6 text-emerald-600" /> New resume
        </h1>
        <p className="text-sm text-muted-foreground">
          Pick a template below, optionally prefill from an uploaded resume,
          then click Create.
        </p>
      </div>

      <div>
        <h2 className="text-base font-semibold mb-2">1. Choose a template</h2>
        <TemplatePicker value={templateId} onChange={(t) => setTemplateId(t.id)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Source (optional)</CardTitle>
          <CardDescription>
            Pre-fill your resume with skills + experience extracted from an
            uploaded PDF. You can edit everything afterwards.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label className="text-xs">Start from an uploaded resume</Label>
          {resumesQ.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </div>
          ) : resumesQ.data && resumesQ.data.length > 0 ? (
            <Select
              value={originalResumeId || "__none__"}
              onValueChange={(v) => setOriginalResumeId(v === "__none__" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Blank resume (no source)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Blank resume (no source)</SelectItem>
                {resumesQ.data.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.fileName}
                    {r.experienceYears != null ? ` · ${r.experienceYears}y` : ""}
                    {r.status !== "ready" ? ` · ${r.status}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No uploaded resumes yet. A blank resume will be created. (You can
              upload one on the My Resumes page first.)
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="ghost">
          <Link href="/dashboard/resumes/generate">Cancel</Link>
        </Button>
        <Button
          disabled={!templateId || createMut.isPending}
          onClick={() => createMut.mutate()}
          className="gap-1.5"
        >
          {createMut.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          Create resume
        </Button>
      </div>
    </div>
  );
}

export default function NewResumePage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading…</div>}>
      <NewResumePageInner />
    </Suspense>
  );
}
