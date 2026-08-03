"use client";

// [id]/editor-client.tsx — the interactive resume editor (form + preview side-by-side).
// Used by both the edit page and the [id]/page.tsx edit mode.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Eye,
  ExternalLink,
  History,
  Scissors,
  Trash2,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  resumeContentSchema,
  type ResumeContent,
  type ResumeCustomization,
} from "@/lib/validators/resume-content";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ResumeForm } from "@/components/resume-builder/resume-form";
import { ResumePreview } from "@/components/resume-builder/resume-preview";
import { ExportDialog } from "@/components/resume-builder/export-dialog";
import { TailorDialog } from "@/components/resume-builder/tailor-dialog";

interface EditorClientProps {
  resumeId: string;
  initialContent: ResumeContent;
  customization: ResumeCustomization | null;
  templateName: string;
  templateSlug: string;
  currentVersion: number;
}

export function EditorClient({
  resumeId,
  initialContent,
  customization,
  templateName,
  templateSlug,
  currentVersion,
}: EditorClientProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const [revision, setRevision] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [tailorOpen, setTailorOpen] = useState(false);

  const deleteMut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/resumes/generate/${resumeId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Delete failed");
      return json.data;
    },
    onSuccess: () => {
      toast.success("Resume deleted.");
      qc.invalidateQueries({ queryKey: ["generated"] });
      router.push("/dashboard/resumes/generate");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/dashboard/resumes/generate">
            <ArrowLeft className="size-4" /> Back to Resume Builder
          </Link>
        </Button>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight truncate">
              {initialContent.contact.name || "Untitled resume"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {templateName} · v{currentVersion} ·{" "}
              <Link
                href={`/dashboard/resumes/generate/${resumeId}/preview`}
                className="text-emerald-600 hover:underline inline-flex items-center gap-1"
              >
                Open preview <ExternalLink className="size-3" />
              </Link>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href={`/dashboard/resumes/generate/${resumeId}/versions`}>
                <History className="size-4" /> Versions
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setTailorOpen(true)}
            >
              <Scissors className="size-4" /> Tailor
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setExportOpen(true)}
            >
              <Download className="size-4" /> Export
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-rose-600 hover:text-rose-700"
                >
                  <Trash2 className="size-4" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this resume?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete the resume and all its versions, plus any
                    exported files. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-rose-600 hover:bg-rose-700"
                    onClick={() => deleteMut.mutate()}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Left: edit form */}
        <div className="min-w-0">
          <ResumeForm
            resumeId={resumeId}
            initialContent={initialContent}
            customization={customization}
            onSaved={(v) => setRevision((r) => r + 1)}
          />
        </div>
        {/* Right: live preview */}
        <div className="lg:sticky lg:top-4 self-start">
          <Card className="overflow-hidden">
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="size-4" /> Live preview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[640px] border-t">
                <ResumePreview resumeId={resumeId} revision={revision + currentVersion} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ExportDialog resumeId={resumeId} open={exportOpen} onOpenChange={setExportOpen} />
      <TailorDialog
        resumeId={resumeId}
        open={tailorOpen}
        onOpenChange={setTailorOpen}
        onTailored={() => router.refresh()}
      />

      <p className="text-xs text-muted-foreground">
        Template: <code className="text-emerald-700 dark:text-emerald-400">{templateSlug}</code>
        {" · "}
        Customization: {customization && Object.keys(customization).length > 0
          ? "customized"
          : "default"}
      </p>
    </div>
  );
}

// Re-export so server component pages can validate the schema.
export { resumeContentSchema };
