"use client";

// resume-preview.tsx — iframe-based live HTML preview.
//
// Refreshes the iframe whenever the content changes (debounced 400ms).
// Fetches the rendered HTML from /api/resumes/generate/{id}/preview so the
// server stays the source of truth for rendering.

import { useEffect, useRef, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResumePreviewProps {
  resumeId?: string;
  /** A revision counter that bumps when the user edits content. */
  revision: number;
  className?: string;
}

export function ResumePreview({ resumeId, revision, className }: ResumePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!resumeId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void refresh();
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [resumeId, revision]);

  async function refresh() {
    if (!resumeId) return;
    setLoading(true);
    setError(null);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await fetch(`/api/resumes/generate/${resumeId}/preview`, {
        signal: ac.signal,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message ?? "Failed to render preview");
      }
      const html = (json.data?.html ?? "") as string;
      const iframe = iframeRef.current;
      if (iframe) {
        const doc = iframe.contentDocument;
        if (doc) {
          doc.open();
          doc.write(html);
          doc.close();
        }
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-muted/40">
        <span className="text-xs font-medium text-muted-foreground">
          Live preview
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void refresh()}
          disabled={loading || !resumeId}
          className="h-7 gap-1.5"
        >
          {loading ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <RefreshCw className="size-3" />
          )}
          Refresh
        </Button>
      </div>
      <div className="flex-1 relative bg-white">
        {!resumeId && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground p-6 text-center">
            Save your resume to see a live preview here.
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-sm text-rose-600 p-6 text-center gap-2">
            <AlertTriangle className="size-6" />
            <p>{error}</p>
          </div>
        )}
        <iframe
          ref={iframeRef}
          title="Resume preview"
          className="w-full h-full bg-white"
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  );
}
