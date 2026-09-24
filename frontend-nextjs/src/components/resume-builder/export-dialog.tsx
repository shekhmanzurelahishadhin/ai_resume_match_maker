"use client";

// export-dialog.tsx — modal with PDF / DOCX / HTML buttons.
// Shows the "DOCX is content-accurate, layout-approximate" warning per §6 of the spec.

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Download, FileText, FileType2, Loader2, AlertTriangle } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ExportDialogProps {
  resumeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Format = "pdf" | "docx" | "html";

interface ExportResult {
  format: Format;
  fileName: string;
  url: string;
  size: number;
}

function fileNameFrom(res: Response, format: Format): string {
  const cd = res.headers.get("content-disposition") ?? "";
  return cd.match(/filename="?([^";]+)"?/)?.[1] ?? `resume.${format}`;
}

function triggerDownload(url: string, fileName: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function ExportDialog({ resumeId, open, onOpenChange }: ExportDialogProps) {
  const [lastResult, setLastResult] = useState<ExportResult | null>(null);

  // The API answers with the file itself (it is private, so there is no
  // shareable link); save it through an object URL.
  const mut = useMutation({
    mutationFn: async (format: Format): Promise<ExportResult> => {
      const res = await fetch(`/api/resumes/generate/${resumeId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error?.message ?? "Export failed");
      }
      const blob = await res.blob();
      return {
        format,
        fileName: fileNameFrom(res, format),
        url: URL.createObjectURL(blob),
        size: blob.size,
      };
    },
    onSuccess: (data) => {
      setLastResult((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return data;
      });
      triggerDownload(data.url, data.fileName);
      toast.success(`${data.format.toUpperCase()} downloaded (${formatBytes(data.size)}).`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export resume</DialogTitle>
          <DialogDescription>
            Download your resume with the current template and theme.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 py-2">
          <FormatButton
            label="PDF"
            description="Text-based"
            icon={FileText}
            loading={mut.isPending && mut.variables === "pdf"}
            disabled={mut.isPending}
            onClick={() => mut.mutate("pdf")}
          />
          <FormatButton
            label="DOCX"
            description="Word document"
            icon={FileType2}
            loading={mut.isPending && mut.variables === "docx"}
            disabled={mut.isPending}
            onClick={() => mut.mutate("docx")}
          />
          <FormatButton
            label="HTML"
            description="Web page"
            icon={FileText}
            loading={mut.isPending && mut.variables === "html"}
            disabled={mut.isPending}
            onClick={() => mut.mutate("html")}
          />
        </div>

        <Alert>
          <AlertTriangle className="size-4" />
          <AlertTitle className="text-xs">Layout fidelity note</AlertTitle>
          <AlertDescription className="text-xs">
            <strong>PDF</strong> and <strong>DOCX</strong> exports are
            content-accurate, layout-approximate — they preserve all your
            content but may not match the on-screen styling exactly.
            <strong> HTML</strong> exports are pixel-perfect.
          </AlertDescription>
        </Alert>

        {lastResult && (
          <div className="text-xs text-muted-foreground">
            Last export: <a
              className="text-emerald-600 hover:underline"
              href={lastResult.url}
              download={lastResult.fileName}
            >
              {lastResult.fileName}
            </a>{" "}
            ({formatBytes(lastResult.size)})
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormatButton({
  label,
  description,
  icon: Icon,
  loading,
  disabled,
  onClick,
}: {
  label: string;
  description: string;
  icon: typeof FileText;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-all hover:border-emerald-300 hover:shadow-sm disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
    >
      {loading ? (
        <Loader2 className="size-5 animate-spin text-emerald-600" />
      ) : (
        <Icon className="size-5 text-emerald-600" />
      )}
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-[10px] text-muted-foreground">{description}</span>
    </button>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export { Download };
