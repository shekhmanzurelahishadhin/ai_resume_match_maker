"use client";

// Drag-and-drop resume uploader.
// Accepts a single PDF (≤5MB). POSTs to /api/resumes/upload as multipart/form-data.

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileText, X, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MAX_RESUME_SIZE_BYTES } from "@/lib/constants";

interface ResumeUploadProps {
  onUploaded?: (resume: { id: string; fileName: string }) => void;
}

async function uploadResume(file: File): Promise<{ id: string; fileName: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/resumes/upload", { method: "POST", body: form });
  const json = await res.json();
  if (!res.ok) {
    const msg = json?.error?.message ?? "Upload failed";
    const code = json?.error?.code;
    if (code === "RATE_LIMITED" && res.status === 429) {
      const retry = res.headers.get("Retry-After");
      throw new Error(`Rate limit exceeded. Try again in ${retry ?? 60}s.`);
    }
    throw new Error(msg);
  }
  return {
    id: json.data.resume.id as string,
    fileName: json.data.resume.fileName as string,
  };
}

export function ResumeUpload({ onUploaded }: ResumeUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: uploadResume,
    onSuccess: (data) => {
      toast({
        title: "Resume uploaded",
        description: "We're parsing it now — this takes a few seconds.",
      });
      setSelectedFile(null);
      onUploaded?.(data);
      router.refresh();
    },
    onError: (err: Error) => {
      toast({
        title: "Upload failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const validateAndSelect = useCallback(
    (file: File) => {
      if (file.size > MAX_RESUME_SIZE_BYTES) {
        toast({
          title: "File too large",
          description: "Maximum resume size is 5MB.",
          variant: "destructive",
        });
        return;
      }
      const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      if (!isPdf) {
        toast({
          title: "Unsupported file",
          description: "Only PDF files are accepted.",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      mutation.mutate(file);
    },
    [mutation, toast],
  );

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) validateAndSelect(file);
        }}
        className={cn(
          "rounded-xl border-2 border-dashed p-8 text-center transition-colors",
          isDragging
            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
            : "border-border bg-muted/30",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) validateAndSelect(file);
            // reset so picking the same file twice still fires change
            e.target.value = "";
          }}
        />
        <UploadCloud className="mx-auto size-10 text-emerald-600" />
        <p className="mt-2 text-sm font-medium">
          Drag &amp; drop your PDF resume here
        </p>
        <p className="text-xs text-muted-foreground">PDF only · up to 5MB</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => inputRef.current?.click()}
          disabled={mutation.isPending}
        >
          Browse files
        </Button>
      </div>

      {selectedFile && mutation.isPending ? (
        <div className="flex items-center justify-between rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="size-4 shrink-0 text-emerald-600" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">Uploading & parsing…</p>
            </div>
          </div>
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      {mutation.isError ? (
        <div className="flex items-center justify-between rounded-lg border border-rose-300 bg-rose-50 p-3 text-rose-900 dark:bg-rose-900/20 dark:text-rose-200 dark:border-rose-800">
          <p className="text-sm">{(mutation.error as Error).message}</p>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => mutation.reset()}
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
